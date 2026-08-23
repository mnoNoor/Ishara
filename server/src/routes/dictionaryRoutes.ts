import { Router } from "express";
import {
  getDictionary,
  getDictionaryStats,
} from "../controllers/dictionaryController";

const router = Router();

router.get("/", getDictionary);
router.get("/stats", getDictionaryStats);

export default router;
