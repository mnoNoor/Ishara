import { Request, Response } from "express";
import { words } from "../db/schema";
import { db } from "../db/db";

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
