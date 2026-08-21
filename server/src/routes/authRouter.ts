import { Router } from "express";
import {
  login,
  register,
  logout,
  refreshToken,
  getCurrentUser,
} from "../controllers/authController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);

router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, getCurrentUser);

export default router;
