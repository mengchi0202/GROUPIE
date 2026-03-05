import bcrypt from "bcryptjs";
import pool from "../lib/db.js";

export const register = async (req, res) => {
  const { studentid, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO STUDENT (Student_ID, Email, Password) VALUES (?, ?, ?)",
      [studentid, email, hashedPassword]
    );
    res.status(201).json({ message: "Account created", studentid });
  } catch (err) {
    res.status(500).json({ message: "Registration error", error: err });
  }
};

export const login = async (req, res) => {
  const { studentid, password } = req.body;
  try {
    const [results] = await pool.query("SELECT * FROM STUDENT WHERE Student_ID = ?", [studentid]);
    if (results.length === 0) return res.status(404).json({ message: "帳號未註冊" });
    const isMatch = await bcrypt.compare(password, results[0].Password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });
    res.json({ message: "Login successful", studentid: results[0].Student_ID });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

// ✅ 修正後的處理註冊第二步
export const registerProfile = async (req, res) => {
  const { studentid, name, department, skills, experience } = req.body;

  try {
    // 轉換專長陣列為字串
    const skillsStr = Array.isArray(skills) ? skills.join(', ') : skills;

    // 🚀 根據你的 DESCRIBE 結果修正欄位名稱
    const [result] = await pool.query(
      "UPDATE STUDENT SET Student_Name = ?, Student_Department = ?, Skills = ?, Experience = ? WHERE Student_ID = ?",
      [name, department, skillsStr, experience, studentid]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "找不到該學號，請先完成第一步註冊" });
    }

    res.json({ message: "個人資料儲存成功" });
  } catch (err) {
    console.error("❌ SQL 錯誤:", err);
    res.status(500).json({ message: "資料庫更新失敗", error: err.message });
  }
};

// 取得個人資料
// 取得個人資料
export const getProfile = async (req, res) => {
  const { studentid } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT Student_Name, Student_Department, Skills, Experience, 
              Weight_Availability, Weight_Rating 
       FROM student WHERE Student_ID = ?`,
      [studentid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "找不到使用者" });
    }

    // 💡 這裡回傳的會是 { Student_Name: "...", Student_Department: "...", ... }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "伺服器錯誤", error: err.message });
  }
};

// 更新個人資料
export const updateProfile = async (req, res) => {
  const { studentid } = req.params;
  const { name, department, skills, experience, weight_availability, weight_rating } = req.body;

  try {
    // 處理 skills 陣列轉字串
    const skillsStr = Array.isArray(skills) ? skills.join(', ') : skills;

    const [result] = await pool.query(
      `UPDATE student SET 
        Student_Name = ?, 
        Student_Department = ?, 
        Skills = ?, 
        Experience = ?, 
        Weight_Availability = ?, 
        Weight_Rating = ? 
       WHERE Student_ID = ?`,
      [name, department, skillsStr, experience, weight_availability, weight_rating, studentid]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "更新失敗，找不到該學號" });
    }

    res.json({ message: "更新成功" });
  } catch (err) {
    console.error("❌ 更新錯誤:", err);
    res.status(500).json({ message: "更新失敗", error: err.message });
  }
};



// 取得黑名單列表
export const getBlacklist = async (req, res) => {
  const { studentid } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT B.Blocked_Student_ID, S.Student_Name 
       FROM BLACKLIST B 
       JOIN STUDENT S ON B.Blocked_Student_ID = S.Student_ID 
       WHERE B.Owner_Student_ID = ?`,
      [studentid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "讀取黑名單失敗", error: err.message });
  }
};

// 加入黑名單
export const addBlacklist = async (req, res) => {
  const { owner_studentid, blocked_studentid } = req.body;
  try {
    await pool.query(
      "INSERT INTO BLACKLIST (Owner_Student_ID, Blocked_Student_ID) VALUES (?, ?)",
      [owner_studentid, blocked_studentid]
    );
    res.status(201).json({ message: "已加入黑名單" });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "已在清單中" });
    res.status(500).json({ message: "加入失敗", error: err.message });
  }
};

// 移除黑名單
export const removeBlacklist = async (req, res) => {
  const { owner_studentid, blocked_studentid } = req.body;
  try {
    await pool.query(
      "DELETE FROM BLACKLIST WHERE Owner_Student_ID = ? AND Blocked_Student_ID = ?",
      [owner_studentid, blocked_studentid]
    );
    res.json({ message: "已從黑名單移除" });
  } catch (err) {
    res.status(500).json({ message: "移除失敗", error: err.message });
  }
};

// 取得可行時間
export const getAvailableTimes = async (req, res) => {
  const { studentid } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT Available_Time FROM STUDENT WHERE Student_ID = ?",
      [studentid]
    );
    // 假設資料庫存的是 [{day_of_week: 1, day_time: 8}, ...]
    res.json({ availability: rows[0]?.Available_Time || [] });
  } catch (err) {
    res.status(500).json({ message: "讀取失敗", error: err.message });
  }
};

// 儲存可行時間
// ✅ 修正後的儲存可行時間
export const saveAvailableTimes = async (req, res) => {
  const { studentId, availableTimes } = req.body;
  try {
    // 1. 確保欄位名稱與前端傳來的 { day, time } 一致
    const formattedTimes = availableTimes.map(slot => ({
      day: slot.day,
      time: slot.time  // 🚀 修正：改回 slot.time，這才是 "08:00" 的來源
    }));

    // 2. 儲存至資料庫
    await pool.query(
      "UPDATE STUDENT SET Available_Time = ? WHERE Student_ID = ?",
      [JSON.stringify(formattedTimes), studentId]
    );
    
    res.json({ message: "儲存成功" });
  } catch (err) {
    console.error("儲存失敗詳情:", err);
    res.status(500).json({ message: "儲存失敗", error: err.message });
  }
};