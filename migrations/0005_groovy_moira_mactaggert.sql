ALTER TABLE "parts" ALTER COLUMN "section" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "parts" ALTER COLUMN "section" SET DEFAULT 'E';--> statement-breakpoint
ALTER TABLE "search_index" ALTER COLUMN "section" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "search_index" ALTER COLUMN "section" SET DEFAULT 'E';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "normalized_name" varchar(255) NOT NULL;--> statement-breakpoint
DROP TYPE "public"."section";