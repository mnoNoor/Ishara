import { Router } from "express";
import { recordSign } from "../controllers/adminController.js";
import { recordSignSchema } from "../validation/recordSignSchema.js";
import { validate } from "../middleware/validate.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
const router = Router();

router.post(
  "/signs/record",
  authMiddleware,
  roleMiddleware(["admin", "sign_recorder"]),
  validate(recordSignSchema),
  recordSign,
);

export default router;
