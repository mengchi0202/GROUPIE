
# 🎯 GROUPIE - 技術架構與資料庫設計說明

GROUPIE 是一個模式分組媒合系統。本專案核心在於透過加權算法解決學生分組時的資訊不對稱問題。

## 🏗️ 系統架構 (System Architecture)


* **Frontend**: 原生 Web 技術 (HTML5/CSS3/JS ES6) 搭配 **Bootstrap 5**。
* **Backend**: **Node.js** 搭配 **Express** 框架，實作 RESTful API。
* **Database**: **MySQL 8.0**，負責持久化儲存使用者權重、隊伍資訊與媒合狀態。
* **Communication**: 前端透過 `fetch` API 與後端進行異步資料交換，支援 CORS 跨域請求。

---

## 📊 資料庫設計 (Database Design)

資料庫設計遵循第三正規化 (3NF)，確保資料一致性並優化查詢效率。

### 核心資料表 (ER-Relationship)

1. **Users Table (使用者)**
* `Student_ID` (PK): 學號，唯一識別。
* `Password`: 經雜湊加密後的密碼串。
* `Email`, `Name`, `Department`: 基本通訊與系級資訊。
* `Weight_Availability`: 預設時間權重 (1-5)。
* `Weight_Rating`: 預設評價權重 (1-5)。


2. **Teams Table (隊伍)**
* `Team_ID` (PK): 隊伍唯一碼。
* `Team_Name`: 課程名稱或隊伍名稱。
* `Creator_ID` (FK): 關聯至 Users，記錄建立者。
* `Target_Weight_A`, `Target_Weight_R`: 該隊伍特有的篩選偏好。


3. **Skills Table (技能)**
* `Skill_ID` (PK)
* `Student_ID` (FK): 多對一連結使用者，紀錄個人專長標籤。



---

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

