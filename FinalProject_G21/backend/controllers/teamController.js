import pool from "../lib/db.js";

// 1. 建立新組隊
export const createTeam = async (req, res) => {
  const { teamName, teamSize, creator_studentid, weight_availability, weight_rating } = req.body;

  try {
    const [result] = await pool.query(
      "INSERT INTO TEAM (Team_Name, Team_Size, Creator_Student_ID, Weight_Availability, Weight_Rating, Status) VALUES (?, ?, ?, ?, ?, 'ongoing')",
      [teamName, teamSize, creator_studentid, weight_availability, weight_rating]
    );

    res.status(201).json({ 
      message: "Team created successfully", 
      teamId: result.insertId 
    });
  } catch (err) {
    console.error("❌ 建立隊伍 SQL 錯誤:", err);
    res.status(500).json({ message: "資料庫寫入失敗", error: err.message });
  }
};

// 2. 取得所有可加入隊伍 (排除黑名單隊長發起的隊伍)
export const getAllTeams = async (req, res) => {
  const { studentid } = req.query; // 目前登入者的學號
  try {
    const [teams] = await pool.query(`
      SELECT T.Team_ID AS id, T.Team_Name AS course, T.Team_Size, T.Creator_Student_ID,
             (SELECT COUNT(*) FROM group_application GA WHERE GA.Team_ID = T.Team_ID AND GA.Status = 'accepted') + 1 AS member_count
      FROM TEAM T
      WHERE T.Status = 'ongoing' 
        AND T.Creator_Student_ID != ?  -- 排除自己建立的隊伍
        AND NOT EXISTS (
          -- 🚫 排除：隊長是我黑名單中的人
          SELECT 1 FROM blacklist B 
          WHERE B.Owner_Student_ID = ? AND B.Blocked_Student_ID = T.Creator_Student_ID
        )
      GROUP BY T.Team_ID
      HAVING member_count < T.Team_Size
    `, [studentid, studentid]);
    
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: "無法取得隊伍", error: err.message });
  }
};

export const recommendMembers = async (req, res) => {
  const { TeamID } = req.query; 
  const mysql = await pool.getConnection();

  try {
    // 1. 取得隊伍資訊，並透過 JOIN 抓取「組長」的可用時間與權重設定
    const [teamRows] = await mysql.query(`
      SELECT 
        t.Creator_Student_ID, 
        t.Weight_Rating, 
        t.Weight_Availability, 
        s.Available_Time AS Leader_Time
      FROM team t
      JOIN student s ON t.Creator_Student_ID = s.Student_ID
      WHERE t.Team_ID = ?
    `, [TeamID]);

    if (teamRows.length === 0) return res.status(404).json({ message: "找不到隊伍或組長資料" });

    const { Creator_Student_ID, Weight_Rating, Weight_Availability, Leader_Time } = teamRows[0];

    // 解析組長的時段陣列 (基準時段)
    let leaderTimeArray = [];
    try {
      leaderTimeArray = Array.isArray(Leader_Time) ? Leader_Time : JSON.parse(Leader_Time || "[]");
    } catch (e) {
      leaderTimeArray = [];
    }

    // 將組長時段轉換為比對標籤 ["1-08:00", "2-13:00"]
    const lTags = leaderTimeArray.map(s => `${s.day}-${s.time}`);

    // 2. 撈取候選人 (排除自己、黑名單、已在隊伍的人)
    const [candidates] = await mysql.query(`
      SELECT s.Student_ID, s.Student_Name, s.Student_Department, s.Rating, s.Available_Time
      FROM student s
      WHERE s.Student_ID != ? 
      AND NOT EXISTS (
          SELECT 1 FROM blacklist b 
          WHERE b.Owner_Student_ID = ? AND b.Blocked_Student_ID = s.Student_ID
      )
      AND s.Student_ID NOT IN (
          SELECT Student_ID FROM group_application WHERE Team_ID = ? AND Status = 'accepted'
      )
    `, [Creator_Student_ID, Creator_Student_ID, TeamID]);

    // 3. 計算每個人的 Matching Score
    const recommended = candidates.map(c => {
      let memberTimeArray = [];
      try {
        memberTimeArray = Array.isArray(c.Available_Time) ? c.Available_Time : JSON.parse(c.Available_Time || "[]");
      } catch (e) {
        memberTimeArray = [];
      }

      // 🚀 關鍵比對：將候選組員時段轉成字串標籤
      const mTags = memberTimeArray.map(s => `${s.day}-${s.time}`);

      // 計算重複個數 (交集)
      const overlap = mTags.filter(tag => lTags.includes(tag));
      const overlapCount = overlap.length;
      
      console.log(`正在比對學生 ${c.Student_Name}, 重複次數: ${overlapCount}`);

      // ---------------------------------------------------------
      // 分數權重計算邏輯
      // ---------------------------------------------------------
      
      // A. 時間分數：(重複次數 / 組長總時段數) * 時間權重
      const maxSlots = lTags.length || 1;
      const timeScore = lTags.length > 0 ? (overlapCount / maxSlots) * (Weight_Availability || 1) : 0;

      // B. 評分分數：(歷史評分 / 5) * 評分權重
      const ratingScore = ((c.Rating || 0) / 5) * (Weight_Rating || 1);

      // 總分 (保留兩位小數)
      const totalScore = parseFloat((timeScore + ratingScore).toFixed(2));

      return {
        Student_ID: c.Student_ID,
        Student_Name: c.Student_Name,
        Student_Department: c.Student_Department,
        Rating: c.Rating,
        overlap_count: overlapCount, // 傳給前端顯示
        matching_score: totalScore
      };
    });

    // 4. 根據總分由高到低排序，取前 10 名
    recommended.sort((a, b) => b.matching_score - a.matching_score);
    const top10 = recommended.slice(0, 10);

    res.json({ recommended: top10 });

  } catch (err) {
    console.error("❌ 推薦算法執行失敗:", err);
    res.status(500).json({ message: "系統錯誤", error: err.message });
  } finally {
    mysql.release();
  }
};
// 4. 邀請組員加入隊伍
export const inviteMember = async (req, res) => {
  const { studentid, team_id } = req.body;

  try {
    // 🚀 根據你的 DESCRIBE group_application 結果修正：
    // 表格改為 group_application
    // 欄位改為 Student_ID
    // Status 改為 'pending' (因為你的 ENUM 不支援 'invited')
    const [result] = await pool.query(
      "INSERT INTO group_application (Team_ID, Student_ID, Status) VALUES (?, ?, 'pending')",
      [team_id, studentid]
    );

    res.status(201).json({ message: "已成功發送加入申請！" });
  } catch (err) {
    console.error("❌ 邀請 SQL 錯誤:", err);
    // 處理重複申請的狀況
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: "您已經邀請過該成員，或該成員已在申請中" });
    }
    res.status(500).json({ message: "邀請動作失敗", error: err.message });
  }
};




// 5. 取得隊伍所有成員 (包含隊長)
// backend/controllers/teamController.js

export const getTeamMembers = async (req, res) => {
  const { teamId } = req.params;
  try {
    // 使用 UNION 同時抓出「隊長」與「已加入的隊員」
    const [members] = await pool.query(`
      -- 1. 抓出隊長
      SELECT Student_ID, Student_Name 
      FROM STUDENT 
      WHERE Student_ID = (SELECT Creator_Student_ID FROM TEAM WHERE Team_ID = ?)

      UNION

      -- 2. 抓出申請表中已接受的人
      SELECT S.Student_ID, S.Student_Name 
      FROM STUDENT S
      JOIN group_application GA ON S.Student_ID = GA.Student_ID
      WHERE GA.Team_ID = ? AND GA.Status = 'accepted'
    `, [teamId, teamId]);

    console.log(`隊伍 ${teamId} 成員名單:`, members);
    res.json(members);
  } catch (err) {
    console.error("❌ 取得成員失敗:", err);
    res.status(500).json({ message: "無法讀取成員" });
  }
};




// 取得使用者收到的所有邀請
export const getInvites = async (req, res) => {
  const { studentid } = req.params;
  try {
    const [invites] = await pool.query(`
      SELECT 
        T.Team_ID AS team_id, 
        T.Team_Name AS course, 
        S.Student_Name AS leader_name,
        S.Student_ID AS leader_id
      FROM group_application GA
      JOIN TEAM T ON GA.Team_ID = T.Team_ID
      JOIN STUDENT S ON T.Creator_Student_ID = S.Student_ID
      WHERE GA.Student_ID = ? AND GA.Status = 'pending'
    `, [studentid]);
    res.json(invites);
  } catch (err) {
    res.status(500).json({ message: "無法讀取邀請", error: err.message });
  }
};

// 處理接受或拒絕邀請
export const respondToInvite = async (req, res) => {
  const { team_id, studentid, status } = req.body; // status 為 'accepted' 或 'rejected'
  try {
    await pool.query(
      "UPDATE group_application SET Status = ? WHERE Team_ID = ? AND Student_ID = ?",
      [status, team_id, studentid]
    );
    
    const msg = status === 'accepted' ? "已接受邀請！" : "已拒絕邀請。";
    res.json({ message: msg });
  } catch (err) {
    res.status(500).json({ message: "更新失敗", error: err.message });
  }
};









// ✅ 處理申請加入隊伍
export const applyToTeam = async (req, res) => {
  const { teamId } = req.params;
  const { studentid } = req.body;

  if (!studentid) {
    return res.status(400).json({ message: "缺少學生學號" });
  }

  try {
    // 1. 檢查是否已經申請過 (預防重複申請)
    // 對齊您的欄位：Student_ID, Team_ID
    const [existing] = await pool.query(
      "SELECT * FROM group_application WHERE Team_ID = ? AND Student_ID = ? AND Status = 'pending'",
      [teamId, studentid]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "您已經申請過此隊伍，請靜候審核" });
    }

    // 2. 寫入申請資料
    await pool.query(
      "INSERT INTO group_application (Student_ID, Team_ID, Status) VALUES (?, ?, 'pending')",
      [studentid, teamId]
    );

    res.json({ message: "申請成功" });
  } catch (err) {
    console.error("❌ applyToTeam 錯誤:", err);
    res.status(500).json({ message: "資料庫寫入失敗", error: err.message });
  }
};

// backend/controllers/teamController.js

// 取得該學生「送出申請中」的清單 (對應 under_review.html)
export const getUserSentApplications = async (req, res) => {
  const { studentid } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT 
        GA.Team_ID, 
        T.Team_Name, 
        S.Student_Name AS Creator_Name, 
        GA.Status
      FROM group_application GA
      JOIN TEAM T ON GA.Team_ID = T.Team_ID
      JOIN STUDENT S ON T.Creator_Student_ID = S.Student_ID
      WHERE GA.Student_ID = ? AND GA.Status = 'pending'
    `, [studentid]);
    
    res.json(rows);
  } catch (err) {
    console.error("❌ 讀取申請清單錯誤:", err);
    res.status(500).json({ message: "伺服器錯誤" });
  }
};

// 取得隊長收到的所有申請 (pending 狀態)
export const getReceivedApplications = async (req, res) => {
  const { studentid } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT 
        GA.Team_ID, T.Team_Name, 
        S.Student_ID, S.Student_Name, S.Rating
      FROM group_application GA
      JOIN TEAM T ON GA.Team_ID = T.Team_ID
      JOIN STUDENT S ON GA.Student_ID = S.Student_ID
      WHERE T.Creator_Student_ID = ? AND GA.Status = 'pending'
    `, [studentid]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "資料讀取失敗", error: err.message });
  }
};





// ✅ 1. 取得特定隊伍詳情 (包含組員背景資料)
export const getTeamById = async (req, res) => {
  const { teamId } = req.params;
  try {
    const [teams] = await pool.query(
      "SELECT Team_ID, Team_Name, Team_Size, Status, Creator_Student_ID FROM TEAM WHERE Team_ID = ?", 
      [teamId]
    );

    if (teams.length === 0) return res.status(404).json({ message: "找不到該隊伍" });

    // 🚀 修改重點：將隊長 (Creator) 與 隊員 (accepted) 聯集
    const [members] = await pool.query(`
      SELECT 
        S.Student_ID, S.Student_Name AS name, 
        S.Student_Department AS department, S.Skills AS specialty, 
        S.Experience AS experience, S.Rating AS rating,
        '隊長' AS role  -- 💡 多標註一個角色方便前端區分
      FROM STUDENT S
      WHERE S.Student_ID = ?
      
      UNION
      
      SELECT 
        S.Student_ID, S.Student_Name AS name, 
        S.Student_Department AS department, S.Skills AS specialty, 
        S.Experience AS experience, S.Rating AS rating,
        '隊員' AS role
      FROM group_application GA
      JOIN STUDENT S ON GA.Student_ID = S.Student_ID
      WHERE GA.Team_ID = ? AND GA.Status = 'accepted'
    `, [teams[0].Creator_Student_ID, teamId]);

    res.json({
      course: teams[0].Team_Name,
      team_size: teams[0].Team_Size,
      status: teams[0].Status,
      current_members: members || [],
      member_count: members.length // 🚀 直接回傳陣列長度，這就會包含隊長了
    });
  } catch (err) {
    res.status(500).json({ message: "伺服器錯誤" });
  }
};

// ✅ 2. 取得進行中的隊伍 (ongoing_teams.html)

// teamController.js
export const getOngoingTeams = async (req, res) => {
  const { studentid } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT 
        T.Team_ID AS team_id,        -- 🚀 強制叫 team_id (小寫)
        T.Team_Name AS course,       -- 🚀 強制叫 course
        T.Team_Size AS team_size,    -- 🚀 強制叫 team_size
        (SELECT COUNT(*) FROM group_application WHERE Team_ID = T.Team_ID AND Status = 'accepted') + 1 AS member_count
      FROM team T                    -- 使用小寫 team
      WHERE T.Status = 'ongoing' 
      AND (T.Creator_Student_ID = ? OR T.Team_ID IN (
          SELECT Team_ID FROM group_application WHERE Student_ID = ? AND Status = 'accepted'
      ))
    `, [studentid, studentid]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "查詢失敗" });
  }
};


// ✅ 4. 處理隊長審核 (決定接受或拒絕)
export const decideApplication = async (req, res) => {
  const { teamId, applicant_id, decision } = req.body; // decision: 'accepted' | 'rejected'
  try {
    // 檢查點：對應 group_application 的 Status ENUM
    await pool.query(
      "UPDATE group_application SET Status = ? WHERE Team_ID = ? AND Student_ID = ?",
      [decision, teamId, applicant_id]
    );
    res.json({ message: "審核完成" });
  } catch (err) {
    res.status(500).json({ message: "審核失敗", error: err.message });
  }
};


export const endTeam = async (req, res) => {
  const { teamId } = req.params;

  // 🛑 防呆：如果收到的是字串 "undefined" 或 null
  if (!teamId || teamId === "undefined") {
    return res.status(400).json({ message: "錯誤：無效的隊伍 ID" });
  }

  try {
    const [result] = await pool.query(
      "UPDATE TEAM SET Status = 'completed' WHERE Team_ID = ?",
      [teamId]
    );
    res.json({ message: "隊伍已成功結束，請開始評分" });
  } catch (err) {
    console.error("❌ SQL 錯誤:", err);
    res.status(500).json({ message: "結束隊伍失敗", error: err.message });
  }
};

// 取得評分對象：排除自己（Rater）的成員名單
export const getMembersForReview = async (req, res) => {
  const { teamId, studentid } = req.params; // 從 URL 取得隊伍 ID 與目前的學號
  
  try {
    const [members] = await pool.query(`
      -- 1. 取得隊長 (如果隊長不是我)
      SELECT Student_ID, Student_Name 
      FROM STUDENT 
      WHERE Student_ID = (SELECT Creator_Student_ID FROM TEAM WHERE Team_ID = ?)
      AND Student_ID != ?

      UNION

      -- 2. 取得已被接受的隊員 (如果隊員不是我)
      SELECT S.Student_ID, S.Student_Name 
      FROM STUDENT S
      JOIN group_application GA ON S.Student_ID = GA.Student_ID
      WHERE GA.Team_ID = ? AND GA.Status = 'accepted' AND S.Student_ID != ?
    `, [teamId, studentid, teamId, studentid]);

    console.log(`隊伍 ${teamId} 的評分對象查詢結果:`, members);
    res.json(members);
  } catch (err) {
    console.error("❌ 取得評分成員失敗:", err);
    res.status(500).json({ message: "無法讀取評分對象" });
  }
};


export const getCompletedTeams = async (req, res) => {
  const { studentid } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT T.Team_ID, T.Team_Name, T.Team_Size, 
             (SELECT COUNT(*) FROM group_application WHERE Team_ID = T.Team_ID AND Status = 'accepted') + 1 AS Member_Count
      FROM TEAM T
      WHERE T.Status = 'completed' 
      AND (T.Creator_Student_ID = ? OR T.Team_ID IN (
          SELECT Team_ID FROM group_application WHERE Student_ID = ? AND Status = 'accepted'
      ))
    `, [studentid, studentid]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "查詢失敗" });
  }
};

// teamController.js
export const getTeamDetails = async (req, res) => {
  const { teamId } = req.params;
  try {
    const [team] = await pool.query("SELECT * FROM TEAM WHERE Team_ID = ?", [teamId]);
    if (!team.length) return res.status(404).json({ message: "找不到隊伍" });

    // 🚀 修改重點：使用 UNION 確保成員清單包含隊長
    const [members] = await pool.query(`
      -- 1. 隊長
      SELECT S.Student_ID, S.Student_Name, S.Student_Department, S.Skills, S.Experience, S.Rating 
      FROM student S
      WHERE S.Student_ID = ?

      UNION

      -- 2. 已接受的隊員
      SELECT S.Student_ID, S.Student_Name, S.Student_Department, S.Skills, S.Experience, S.Rating 
      FROM student S
      JOIN group_application GA ON S.Student_ID = GA.Student_ID
      WHERE GA.Team_ID = ? AND GA.Status = 'accepted'
    `, [team[0].Creator_Student_ID, teamId]);

    res.json({
      course: team[0].Team_Name,
      team_size: team[0].Team_Size,
      status: team[0].Status,
      current_members: members,
      member_count: members.length // 🚀 這樣人數就不會少算
    });
  } catch (err) {
    res.status(500).json({ message: "伺服器錯誤" });
  }
};
// A. 結束組隊 API
export const finishTeam = async (req, res) => {
  const { teamId } = req.params;
  try {
    await pool.query("UPDATE team SET Status = 'completed' WHERE Team_ID = ?", [teamId]);
    res.json({ message: "Team finished" });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};

// B. 取得評分對象 (排除自己)
export const getEvaluationMembers = async (req, res) => {
  const { teamId, studentid } = req.params;
  try {
    const [members] = await pool.query(`
      SELECT Student_ID, Student_Name 
      FROM student 
      WHERE Student_ID IN (
        SELECT Student_ID FROM group_application WHERE Team_ID = ? AND Status = 'accepted'
        UNION
        SELECT Creator_Student_ID FROM TEAM WHERE Team_ID = ?
      ) AND Student_ID != ?
    `, [teamId, teamId, studentid]);
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: "Failed to load members" });
  }
};

// C. 提交評分 API

// teamController.js
export const submitReviews = async (req, res) => {
  const { reviews } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 🚀 暫時關閉外鍵檢查
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

    for (const r of reviews) {
      await connection.query(
        "INSERT INTO rating (Rater_ID, Rated_ID, Team_ID, Participation, Responsibility, Comment) VALUES (?, ?, ?, ?, ?, ?)",
        [Number(r.Rater_ID), Number(r.Rated_ID), Number(r.Team_ID), r.Participation, r.Responsibility, r.Comment]
      );
      
      await connection.query(`
        UPDATE student 
        SET Rating = (
            SELECT (AVG(Participation) + AVG(Responsibility)) / 2 
            FROM rating 
            WHERE Rated_ID = ?
        ) 
        WHERE Student_ID = ?`, 
        [r.Rated_ID, r.Rated_ID]
        );
      // 更新分數邏輯...
    }

    // 🚀 重新開啟外鍵檢查
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");

    await connection.commit();
    res.json({ message: "Success" });
  } catch (err) {
    await connection.rollback();
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;"); // 發生錯誤也要開回來
    res.status(500).json({ message: "Submit failed", error: err.message });
  } finally {
    connection.release();
  }
};