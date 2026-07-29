ALTER TABLE "word" DROP CONSTRAINT "word_word_unique";--> statement-breakpoint
ALTER TABLE "word" ADD CONSTRAINT "word_arabic_text_unique" UNIQUE("arabic_text");