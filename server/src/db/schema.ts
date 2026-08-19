import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";

type Landmark = { x: number; y: number; z?: number };
type Frame = Landmark[][];
export type Sequence = Frame[];

export const categoryEnum = pgEnum("category", [
  "general",
  "greetings",
  "numbers",
  "family",
  "colors",
  "animals",
  "food",
  "emotions",
  "body_parts",
  "clothing",
  "weather",
]);
export const difficultyEnum = pgEnum("difficulty", [
  "beginner",
  "intermediate",
  "advanced",
]);
export const userRoleEnum = pgEnum("user_role", ["admin", "teacher", "user"]);
export const dominantHandEnum = pgEnum("dominant_hand", ["right", "left"]);

export const words = pgTable("word", {
  id: serial("id").primaryKey(),
  word: varchar("word", { length: 255 }).notNull(),
  category: categoryEnum("category").notNull().default("general"),
  difficulty: difficultyEnum("difficulty").notNull().default("beginner"),
  arabicText: text("arabic_text").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const signVariants = pgTable("sign_variants", {
  id: serial("id").primaryKey(),
  signId: integer("sign_id")
    .references(() => words.id)
    .notNull(),
  dialect: varchar("dialect", { length: 50 }).notNull(),
  videoUrl: text("video_url").notNull().default(""),
  imageUrls: jsonb("image_urls").$type<string[]>().default([]),
  landmarksJson: jsonb("landmarks_json").$type<Sequence[]>().notNull(),
  sampleCount: integer("sample_count").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 40 }).notNull(),
  email: varchar("email", { length: 80 }).notNull().unique(),
  password: text("password").notNull(),
  profileImage: jsonb("profile_image").default([]),
  role: userRoleEnum("role").notNull().default("user"),
  dominantHand: dominantHandEnum("dominant_hand"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});
