CREATE TABLE "sample" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" integer NOT NULL,
	"recorded_by" uuid NOT NULL,
	"landmarks" jsonb NOT NULL,
	"recording_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sign_recorders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"dialect" varchar(50) NOT NULL,
	"sample_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'user'::text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'sign_recorder', 'user');--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'user'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "sign_variants" ALTER COLUMN "image_urls" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sign_variants" ALTER COLUMN "sample_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sign_variants" ADD COLUMN "right_translations" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sign_variants" ADD COLUMN "wrong_translations" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sample" ADD CONSTRAINT "sample_variant_id_sign_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."sign_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample" ADD CONSTRAINT "sample_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_recorders" ADD CONSTRAINT "sign_recorders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sample_variant_id_idx" ON "sample" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "sample_recorded_by_idx" ON "sample" USING btree ("recorded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "sign_recorders_user_dialect_unique" ON "sign_recorders" USING btree ("user_id","dialect");--> statement-breakpoint
CREATE UNIQUE INDEX "sign_variants_sign_dialect_unique" ON "sign_variants" USING btree ("sign_id","dialect");--> statement-breakpoint
CREATE INDEX "sign_variants_sign_id_idx" ON "sign_variants" USING btree ("sign_id");--> statement-breakpoint
ALTER TABLE "sign_variants" DROP COLUMN "landmarks_json";