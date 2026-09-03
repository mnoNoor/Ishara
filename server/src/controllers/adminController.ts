import { Response } from "express";
import { eq, and, sql } from "drizzle-orm";

import { db } from "../db/db.js";
import { words, signVariants, sample, signRecorders } from "../db/schema.js";
import { clearTranslationCache } from "../services/translateService.js";
import { AuthRequest } from "../middleware/auth.js";

export async function recordSign(req: AuthRequest, res: Response) {
  try {
    const {
      word,
      arabicText,
      category,
      difficulty,
      dialect,
      videoUrl,
      landmarksJson,
      imageUrls = [],
    } = req.body;

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: "unauthorized" });
      return;
    }

    if (
      !landmarksJson ||
      !Array.isArray(landmarksJson) ||
      landmarksJson.length === 0
    ) {
      res
        .status(400)
        .json({ message: "landmarksJson must be a non-empty array" });
      return;
    }

    await db.transaction(async (tx) => {
      const [existingWord] = await tx
        .select()
        .from(words)
        .where(eq(words.arabicText, arabicText))
        .limit(1);

      let signId: number;
      if (!existingWord) {
        const [newWord] = await tx
          .insert(words)
          .values({
            word,
            arabicText,
            category: category || "general",
            difficulty: difficulty || "beginner",
          })
          .returning();
        signId = newWord.id;
      } else {
        signId = existingWord.id;
      }

      const [existingVariant] = await tx
        .select()
        .from(signVariants)
        .where(
          and(
            eq(signVariants.signId, signId),
            eq(signVariants.dialect, dialect),
          ),
        )
        .limit(1);

      let variantId: number;
      if (existingVariant) {
        variantId = existingVariant.id;
        await tx
          .update(signVariants)
          .set({
            sampleCount: sql`${signVariants.sampleCount} + 1`,
            videoUrl: videoUrl || existingVariant.videoUrl || "",
            imageUrls:
              imageUrls.length > 0
                ? imageUrls
                : existingVariant.imageUrls || [],
          })
          .where(eq(signVariants.id, variantId));
      } else {
        const [newVariant] = await tx
          .insert(signVariants)
          .values({
            signId,
            dialect,
            videoUrl: videoUrl || "",
            imageUrls,
            sampleCount: 1,
          })
          .returning();
        variantId = newVariant.id;
      }

      await tx.insert(sample).values({
        variantId,
        recordedBy: userId,
        landmarks: landmarksJson,
      });

      const [existingRecorder] = await tx
        .select()
        .from(signRecorders)
        .where(
          and(
            eq(signRecorders.userId, userId),
            eq(signRecorders.dialect, dialect),
          ),
        )
        .limit(1);

      if (existingRecorder) {
        await tx
          .update(signRecorders)
          .set({ sampleCount: sql`${signRecorders.sampleCount} + 1` })
          .where(eq(signRecorders.id, existingRecorder.id));
      } else {
        await tx
          .insert(signRecorders)
          .values({ userId, dialect, sampleCount: 1 });
      }
    });

    clearTranslationCache(dialect);

    res.status(201).json({
      message: "sign recorded successfully",
    });
  } catch (error) {
    console.error("Error saving sign:", error);
    res.status(500).json({
      message: "internal server error",
    });
  }
}
