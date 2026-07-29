CREATE TABLE "sign_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"sign_id" integer NOT NULL,
	"dialect" varchar(50) NOT NULL,
	"video_url" text DEFAULT '' NOT NULL,
	"image_urls" jsonb DEFAULT '[]'::jsonb,
	"landmarks_json" jsonb NOT NULL,
	"sample_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "word" (
	"id" serial PRIMARY KEY NOT NULL,
	"word" varchar(255) NOT NULL,
	"category" varchar(100) DEFAULT 'general' NOT NULL,
	"difficulty" varchar(20) DEFAULT 'beginner' NOT NULL,
	"arabic_text" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "word_word_unique" UNIQUE("word")
);
--> statement-breakpoint
ALTER TABLE "sign_variants" ADD CONSTRAINT "sign_variants_sign_id_word_id_fk" FOREIGN KEY ("sign_id") REFERENCES "public"."word"("id") ON DELETE no action ON UPDATE no action;