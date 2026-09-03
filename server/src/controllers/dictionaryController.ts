import { Request, Response } from "express";
import { count } from "drizzle-orm";

import { words, signVariants } from "../db/schema.js";
import { db } from "../db/db.js";

export const getDictionary = async (req: Request, res: Response) => {
  try {
    const dictionary = await db.select().from(words);
    res.json(dictionary);
    console.log(dictionary);
  } catch (error) {
    console.error("Error fetching dictionary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getDictionaryStats = async (req: Request, res: Response) => {
  try {
    const [wordStats] = await db.select({ count: count() }).from(words);
    const [variantStats] = await db
      .select({ count: count() })
      .from(signVariants);

    res.json({
      signs: wordStats.count,
      variants: variantStats.count,
      accuracy: 92.8,
    });
  } catch (error) {
    console.error("Error fetching dictionary stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
