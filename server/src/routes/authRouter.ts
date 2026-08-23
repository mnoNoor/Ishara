import { Router } from "express";
import {
  login,
  register,
  logout,
  refreshToken,
  getCurrentUser,
} from "../controllers/authController";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema } from "../validation/authSchema";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh-token", refreshToken);

router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, getCurrentUser);

export default router;
