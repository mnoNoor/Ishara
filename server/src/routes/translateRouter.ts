import { Router } from "express";
import { signToText, clearCache } from "../controllers/translateController.js";
import { translateSchema } from "../validation/translateSchema.js";
import { validate } from "../middleware/validate.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/sign-to-text", validate(translateSchema), signToText);
router.post(
  "/clear-cache",
  authMiddleware,
  roleMiddleware(["admin"]),
  clearCache,
);

export default router;
