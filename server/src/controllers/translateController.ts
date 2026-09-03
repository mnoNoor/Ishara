import { Request, Response } from "express";
import {
  findBestMatch,
  clearTranslationCache,
} from "../services/translateService.js";

export async function signToText(req: Request, res: Response) {
  try {
    const { dialect, landmarksJson } = req.body;

    const result = await findBestMatch(landmarksJson, dialect);

    if (!result) {
      return res.status(404).json({
        message: "No matching sign found for the specified dialect",
      });
    }

    return res.status(200).json({
      word: result.word,
      arabicText: result.arabicText,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error("Error translating sign to text:", error);
    return res.status(500).json({
      message: "Internal server error occurred during translation",
    });
  }
}

export async function clearCache(req: Request, res: Response) {
  try {
    clearTranslationCache();
    return res.status(200).json({
      message: "Cache cleared successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to clear the cache",
    });
  }
}
