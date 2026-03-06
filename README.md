
# 🎯 GROUPIE - 技術架構與資料庫設計說明

GROUPIE 是一個模式分組媒合系統。本專案核心在於透過加權算法解決學生分組時的資訊不對稱問題，幫助學生避開「雷組員」，尋找最契合的合作夥伴。

## 🏗️ 系統架構 



* **Frontend**: 原生 Web 技術 (HTML5/CSS3/JS ES6) 搭配 **Bootstrap 5**。
* **Backend**: **Node.js** 搭配 **Express** 框架，實作 RESTful API。
* **Database**: **MySQL 8.0**，負責持久化儲存使用者權重、隊伍資訊與媒合狀態。
* **Communication**: 前端透過 `fetch` API 與後端進行異步資料交換，支援 CORS 跨域請求。

---

## 📊 資料庫設計 

本專案採用高度關聯的資料庫結構，以確保資料的一致性與完整性。

1. 使用者與能力

student
儲存使用者基本資料與加密密碼，並包含個人化推薦相關欄位：

Weight_Availability：時間匹配權重

Weight_Rating：評價匹配權重

Available_Time：使用 JSON 格式儲存簡易時間表

available_time
儲存更詳細的時間資訊，用於精確媒合：

Available_Day：可配合的星期

Start_Time：開始時間

End_Time：結束時間

可支援依照星期與時段進行精確時間匹配。

2. 組隊與媒合

team
儲存隊伍基本資訊，包含：

Team_Size：隊伍人數限制

Creator_Student_ID：隊伍建立者

team_member
隊伍與成員的關聯表，用於記錄每個隊伍中的成員資訊。

group_application
處理學生申請加入隊伍的流程，採用狀態機控制：

Pending

Accepted

Rejected

team_invite
處理隊伍主動邀請其他學生加入的功能。

3. 社交與評價系統

rating
多維度評價系統，包含以下評分指標：

Participation（參與度）

Responsibility（責任感）

Comment（文字評價）

blacklist
黑名單機制，用於避免不適合的合作關係。
系統在推薦組員時，會自動排除 Blocked_Student_ID。



## 🧬 推薦演算法 

系統的核心技術在於 **加權評分機制 (Weighted Scoring Mechanism)**。當隊伍建立者設定權重時，後端會執行以下邏輯：

1. **正規化處理**：將資料庫中的「時間相容性」與「歷史評價」轉換為 0-1 的標量。
2. **權重套用**：

$$Score = (Match_{Time} \times Weight_{A}) + (Match_{Rating} \times Weight_{R})$$


3. **排序過濾**：使用 SQL 的 `ORDER BY Score DESC` 抓取前 N 名最匹配的組員。

---

## 🛠️ 技術關鍵點 

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

