// routes/authRoutes.js
import express from "express";
import { 
  register, login, registerProfile, 
  getProfile, updateProfile, 
  getBlacklist, addBlacklist, removeBlacklist ,
  getAvailableTimes,saveAvailableTimes
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/register/profile", registerProfile);

// ✅ 新增個人資料相關
router.get("/profile/:studentid", getProfile);
router.put("/profile/:studentid", updateProfile);

// ✅ 新增黑名單相關
router.get("/blacklist/:studentid", getBlacklist);
router.post("/blacklist", addBlacklist);
router.post("/blacklist/remove", removeBlacklist);

router.get("/available-times/:studentid", getAvailableTimes);
router.post("/available-times", saveAvailableTimes);
export default router;