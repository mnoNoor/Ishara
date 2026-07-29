import { Router } from "express";
import { getDictionary } from "../controllers/dictionaryController";

const router = Router();

router.get("/", getDictionary);

export default router;
