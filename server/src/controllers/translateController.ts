import { Request, Response } from "express";
import {
  findBestMatch,
  clearTranslationCache,
} from "../services/translateService";

export async function signToText(req: Request, res: Response) {
  try {
    console.log(
      "📥 Received request body:",
      JSON.stringify(req.body).substring(0, 200),
    );

    const { dialect, landmarksJson } = req.body;
    console.log("📊 Dialect:", dialect);
    console.log("📊 Landmarks frames count:", landmarksJson?.length);
    console.log("📊 First frame sample:", landmarksJson?.[0]);

    if (!dialect || typeof dialect !== "string") {
      return res.status(400).json({
        message: "يجب تحديد اللهجة (dialect)",
      });
    }

    if (
      !landmarksJson ||
      !Array.isArray(landmarksJson) ||
      landmarksJson.length === 0
    ) {
      return res.status(400).json({
        message: "landmarks should be a non-empty array of frames",
      });
    }

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
      error: error instanceof Error ? error.message : "Unknown error",
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
