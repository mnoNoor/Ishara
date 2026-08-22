CREATE TYPE "public"."category" AS ENUM('general', 'greetings', 'numbers', 'family', 'colors', 'animals', 'food', 'emotions', 'body_parts', 'clothing', 'weather');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."dominant_hand" AS ENUM('right', 'left');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'teacher', 'user');--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(40) NOT NULL,
	"email" varchar(80) NOT NULL,
	"password" text NOT NULL,
	"profile_image" text DEFAULT '',
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"dominant_hand" "dominant_hand",
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "word" ALTER COLUMN "category" SET DEFAULT 'general'::"public"."category";--> statement-breakpoint
ALTER TABLE "word" ALTER COLUMN "category" SET DATA TYPE "public"."category" USING "category"::"public"."category";--> statement-breakpoint
ALTER TABLE "word" ALTER COLUMN "difficulty" SET DEFAULT 'beginner'::"public"."difficulty";--> statement-breakpoint
ALTER TABLE "word" ALTER COLUMN "difficulty" SET DATA TYPE "public"."difficulty" USING "difficulty"::"public"."difficulty";