import { Router } from "express";
import { recordSign } from "../controllers/adminController";
import { recordSignSchema } from "../validation/recordSignSchema";
import { validate } from "../middleware/validate";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
const router = Router();

router.post(
  "/signs/record",
  authMiddleware,
  roleMiddleware(["admin", "sign_recorder"]),
  validate(recordSignSchema),
  recordSign,
);

export default router;
