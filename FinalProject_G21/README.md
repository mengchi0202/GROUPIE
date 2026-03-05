# 分組媒合系統（Groupie）

本系統為一個幫助學生進行專題分組的媒合平台，具備註冊、組隊、推薦、互評、聊天室與黑名單等功能。前端使用 Bootstrap 架設介面，後端使用 Node.js + Express 與 MySQL 完成 API。

---

## 功能特色

- 使用者註冊 / 登入
- 個人資料設定與修改（技能、經歷、可行時間、評價權重）
- 建立隊伍 / 加入隊伍 / 審核申請 / 邀請他人
- 可行時間管理
- 組員互評（參與度、負責度、評論）
- 推薦組員（依據時間重疊 + 互評分數加權）
- 黑名單功能
- 簡易聊天室（區分組長/組員）

---

## 🧩 前端技術與頁面架構

- 使用技術：`HTML5` + `Bootstrap 5` + `Vanilla JS`
- 主要結構：

```
frontend/
├── index.html                # 登入首頁
├── register_step1.html       # 註冊基本資料
├── register_step2.html       # 填寫專長與經歷
├── home.html                 # 主頁
├── create_team.html          # 建立隊伍
├── join_team.html            # 加入其他隊伍
├── team_details.html         # 隊伍詳細資訊
├── my_team.html              # 我的隊伍清單
├── team_history.html         # 歷史紀錄
├── profile.html              # 個人資料
├── available_time.html       # 可行時間設定
├── evaluation.html           # 組員互評頁面
├── member_recommendation.html # 推薦成員
├── pending_review.html       # 組長審核頁
├── under_review.html         # 申請中頁面
├── application.html          # 所有申請管理
├── invited.html              # 被邀請列表
├── chat_leader.html          # 聊天室（組長）
├── chat_member.html          # 聊天室（成員）
├── member_details.html       # 點入組員資料
├── navbar.html               # 導覽列模板
├── css/styles.css            # 樣式檔
├── js/scripts.js             # JS 控制
```

---

## 使用技術

- **前端**：HTML + Bootstrap + JS
- **後端**：Node.js + Express
- **資料庫**：MySQL（透過 `mysql2/promise` 使用連線池）
- **加密**：bcryptjs
- **其他**：CORS、RESTful API 設計

---

## 安裝與執行

### 前置需求
- Node.js + npm
- MySQL 資料庫

### 安裝方式

```bash
# 安裝後端依賴
npm install

# 啟動後端
node app.js
```

前端無需編譯，直接透過瀏覽器開啟 HTML 即可（建議以本地伺服器方式開啟）。

---

## API 功能摘要

| API 路徑                     | 方法     | 說明                   |
|-----------------------------|----------|------------------------|
| `/register`                 | POST     | 註冊帳號               |
| `/register/profile`         | POST     | 填寫註冊第二步資料     |
| `/login`                    | POST     | 登入                   |
| `/profile/:studentid`       | GET/PUT  | 查詢/更新個人資料      |
| `/user/available-times`     | POST     | 儲存可行時間            |
| `/teams`                    | GET/POST | 取得/建立隊伍           |
| `/teams/:teamId/apply`      | POST     | 申請加入隊伍            |
| `/applications/decide`      | POST     | 審核申請（組長）        |
| `/applications/cancel`      | POST     | 取消申請               |
| `/blacklist`                | POST     | 新增黑名單             |
| `/blacklist/remove`         | POST     | 移除黑名單             |
| `/inviteToTeam`             | POST     | 邀請組員               |
| `/recommendMembers`         | GET      | 推薦潛在組員            |
| `/reviews/submit`           | POST     | 組員互評               |
| `/teams/:teamId`            | GET      | 取得隊伍詳情           |

---

## 推薦系統說明

推薦組員依據組長與潛在人選的：
- 🕒 時間重疊（可行時間）
- ⭐ 評價分數（參與度 + 負責度平均）
再依據組長設定的權重（`Weight_Availability`, `Weight_Rating`）計算匹配度，排序推薦前五名。

---

## 資料庫結構（Relational Model）

### 1. `STUDENT` — 使用者基本資料  
欄位：`Student_ID`, `Student_Name`, `Student_Department`, `Student_Email`, `Password`, `Skills`, `Experience`

### 2. `TEAM` — 隊伍資料（含組長與設定）  
欄位：`Team_ID`, `Team_Name`, `Team_Size`, `Course_ID`, `Creator_Student_ID`, `Status`, `Weight_Availability`, `Weight_Rating`

### 3. `TEAM_MEMBER` — 隊伍成員對應  
欄位：`Member_ID`, `Team_ID`, `Student_ID`

### 4. `RATING` — 組員互評紀錄  
欄位：`Rating_ID`, `Rater_ID`, `Rated_ID`, `Team_ID`, `Participation`, `Responsibility`, `Comment`

### 5. `AVAILABLE TIME` — 學生可行時間紀錄  
欄位：`Time_ID`, `Student_ID`, `Available_Day`, `Start_Time`

### 6. `SPECIALTY` — 學生的專長類型  
欄位：`Type`, `Student_ID`

### 7. `BLACKLIST` — 黑名單記錄  
欄位：`Blacklist_ID`, `Owner_Student_ID`, `Blocked_Student_ID`, `Block_Name`, `Blocked_Department`

### 8. `COURSE` — 課程對應  
欄位：`Time_ID`, `Student_ID`

### 9. `ATTEND` — 學生選課紀錄  
欄位：`Student_ID`, `Course_ID`

### 10. `CREATE` — 學生創建隊伍的紀錄  
欄位：`Student_ID`, `Team_ID`

### 11. `JOIN` — 參加活動的隊伍對應  
欄位：`Team_ID`, `Activity_ID`

### 12. `DESIGNATE` — 學生與時間指定（多對多）  
欄位：`Student_ID`, `Time_ID`

### 13. `HAVE` — 學生技能紀錄  
欄位：`Student_ID`, `Type`


📌 註：
- 所有 `*_ID` 為主鍵或外鍵。
- `Skills` 與 `Available_Time` 通常為 JSON 儲存，便於多值存取。
- 評分使用 `Participation`, `Responsibility` 欄位做平均，加上文字 `Comment`。

---

