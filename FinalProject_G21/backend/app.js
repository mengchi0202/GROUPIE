// app.js
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";

const app = express();
app.use(express.json());
app.use(cors());

// 分類掛載路由，符合 RESTful API 規範 [cite: 58]
app.use("/api/auth", authRoutes);   // 處理註冊、登入
app.use("/api/teams", teamRoutes); // 處理組隊、推薦

app.listen(3000, () => {
  console.log("✅ GROUPIE Backend running in MVC mode on port 3000");
});