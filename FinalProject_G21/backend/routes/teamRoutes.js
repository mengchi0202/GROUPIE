// backend/routes/teamRoutes.js
import express from "express";
import { 
  getAllTeams, 
  recommendMembers, 
  createTeam, 
  inviteMember, 
  getOngoingTeams, 
  endTeam,      // 👈 原本的結束組隊功能
  finishTeam,   // 🚀 確保這裡有匯入 finishTeam
  getTeamMembers,
  submitReviews,
  getInvites, 
  respondToInvite,
  getTeamById,
  applyToTeam,
  getUserSentApplications,
  getReceivedApplications, 
  decideApplication,
  getMembersForReview ,
  getCompletedTeams
} from "../controllers/teamController.js";

const router = express.Router();

// ==========================================
// 1. 基礎隊伍列表與建立
// ==========================================

// GET /api/teams?studentid=xxx (加入組隊頁面用)
router.get("/", getAllTeams);

// POST /api/teams (建立隊伍用)
router.post("/", createTeam);

// GET /api/teams/recommend (推薦頁面用)
router.get("/recommend", recommendMembers);

// ==========================================
// 2. 隊伍詳情與申請
// ==========================================

// GET /api/teams/:teamId (組隊詳情頁用)
router.get("/:teamId", getTeamById);

// POST /api/teams/:teamId/apply (申請加入)
router.post("/:teamId/apply", applyToTeam);

// ==========================================
// 3. 學生個人的申請與邀請狀態
// ==========================================

// GET /api/teams/user/:studentid/applications/sent (審核中頁面用)
router.get("/user/:studentid/applications/sent", getUserSentApplications);

// GET /api/teams/user/:studentid/invites (取得邀請紀錄)
router.get("/user/:studentid/invites", getInvites);

// POST /api/teams/invite/respond (接受或拒絕邀請)
router.post("/invite/respond", respondToInvite);

// ==========================================
// 4. 成員管理與隊伍結案 (與 ongoing_teams.html 連動)
// ==========================================

// POST /api/teams/invite (隊長主動邀請)
router.post("/invite", inviteMember);

// GET /api/teams/:teamId/members (取得隊伍成員)
router.get("/:teamId/members", getTeamMembers);

// GET /api/teams/ongoing/:studentid (取得進行中隊伍)
router.get("/ongoing/:studentid", getOngoingTeams);

// 🚀 修正 404 的關鍵：確保路徑與前端 fetch 一致
// 前端 fetch(`http://localhost:3000/api/teams/finish/${teamId}`) 
router.post("/finish/:teamId", finishTeam); 

// 原有的結案路徑 (保留或刪除取決於前端用哪一個)
router.post("/:teamId/end", endTeam);

// POST /api/teams/reviews/submit (提交評分)
router.post("/reviews/submit", submitReviews);

// 取得「身為隊長」收到的申請
router.get("/user/:studentid/applications/received", getReceivedApplications);

// 接受或拒絕申請
router.post("/applications/decide", decideApplication);

// 評分頁面取得對象
router.get("/:teamId/members/:studentid", getMembersForReview);

// 取得已完成隊伍
router.get("/my-teams/:studentid/completed", getCompletedTeams);

export default router;