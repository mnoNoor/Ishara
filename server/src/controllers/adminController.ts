import { Request, Response } from "express";
import { words, signVariants, Sequence } from "../db/schema";
import { db } from "../db/db";
import { eq, and } from "drizzle-orm";
import { clearTranslationCache } from "../services/translateService";

export async function recordSign(req: Request, res: Response) {
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

      if (existingVariant) {
        const currentSamples =
          (existingVariant.landmarksJson as Sequence[]) || [];
        const updatedSamples = [...currentSamples, landmarksJson];
        const newSampleCount = (existingVariant.sampleCount ?? 0) + 1;

        await tx
          .update(signVariants)
          .set({
            landmarksJson: updatedSamples,
            sampleCount: newSampleCount,
            videoUrl: videoUrl || existingVariant.videoUrl || "",
            imageUrls:
              imageUrls.length > 0
                ? imageUrls
                : existingVariant.imageUrls || [],
          })
          .where(eq(signVariants.id, existingVariant.id));
      } else {
        await tx.insert(signVariants).values({
          signId,
          dialect,
          videoUrl: videoUrl || "",
          imageUrls,
          landmarksJson: [landmarksJson],
          sampleCount: 1,
        });
      }
    });

    clearTranslationCache(dialect);

    res.status(201).json({
      message: "تم حفظ الإشارة بنجاح",
    });
  } catch (error) {
    console.error("خطأ في حفظ الإشارة:", error);
    res.status(500).json({
      message: "حدث خطأ داخلي في الخادم",
    });
  }
}
