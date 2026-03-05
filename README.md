
# 🎯 GROUPIE - 技術架構與資料庫設計說明

GROUPIE 是一個模式分組媒合系統。本專案核心在於透過加權算法解決學生分組時的資訊不對稱問題，幫助學生避開「雷組員」，尋找最契合的合作夥伴。

## 🏗️ 系統架構 (System Architecture)



* **Frontend**: 原生 Web 技術 (HTML5/CSS3/JS ES6) 搭配 **Bootstrap 5**。
* **Backend**: **Node.js** 搭配 **Express** 框架，實作 RESTful API。
* **Database**: **MySQL 8.0**，負責持久化儲存使用者權重、隊伍資訊與媒合狀態。
* **Communication**: 前端透過 `fetch` API 與後端進行異步資料交換，支援 CORS 跨域請求。

---

## 📊 資料庫設計 (Database Design)


本專案採用高度關聯的資料庫結構，確保資料完整性。

1. 使用者與能力 
student: 儲存基本資料、加密密碼。
-包含 Weight_Availability 與 Weight_Rating 欄位，紀錄個人化的推薦偏好。
-Available_Time 使用 JSON 格式儲存簡易時間表。

available_time: 詳細時間表，支援按星期（Available_Day）與時段（Start_Time, End_Time）精確媒合。

2. 組隊與媒合
team: 儲存隊伍資訊。包含 Team_Size 限制與 Creator_Student_ID（建立者）。

team_member: 紀錄隊伍成員的關聯表。

group_application: 處理組員申請（Pending / Accepted / Rejected 狀態機控制）。

team_invite: 處理隊伍主動發出的邀請。

3. 社交與評價 
rating: 多維度評價系統,包括Participation,Responsibility ,Comment 

blacklist: 黑名單機制，系統在推薦時會自動排除 Blocked_Student_ID。


## 🧬 推薦演算法 (Recommendation Logic)

系統的核心技術在於 **加權評分機制 (Weighted Scoring Mechanism)**。當隊伍建立者設定權重時，後端會執行以下邏輯：

1. **正規化處理**：將資料庫中的「時間相容性」與「歷史評價」轉換為 0-1 的標量。
2. **權重套用**：

$$Score = (Match_{Time} \times Weight_{A}) + (Match_{Rating} \times Weight_{R})$$


3. **排序過濾**：使用 SQL 的 `ORDER BY Score DESC` 抓取前 N 名最匹配的組員。

---

## 🛠️ 技術關鍵點 (Technical Highlights)

* **RESTful API 路由設計**：
* `POST /api/auth/register`: 處理兩階段註冊邏輯。
* `GET /api/teams/recommendations/:teamId`: 執行加權查詢並回傳媒合清單。


* **狀態管理**：
* 利用 `localStorage` 實作跨頁面的 Session 持久化（如 `studentid` 儲存）。


* **UI/UX 優化**：
* 使用 CSS 變數 (`:root`) 統一定義配色，確保全站視覺一致性。
* 針對 `fetch` 異步操作實作 `Loading State` 提示。



---

## 📁 檔案清單與責任分配

* `server.js`: Express 主程式與路由分發。
* `db.js`: MySQL 連線池 (Connection Pool) 設定。
* `register_step2.html`: 負責個人專長 (Checkbox 陣列) 的資料處理與上傳。
* `create_team.html`: 負責前端權重參數的蒐集與提交。

