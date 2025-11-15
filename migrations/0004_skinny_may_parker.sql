CREATE TABLE "search_index" (
	"id" serial PRIMARY KEY NOT NULL,
	"part_id" integer NOT NULL,
	"search_text" text NOT NULL,
	"english_text" text,
	"dari_text" text,
	"part_number" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"section" "section" DEFAULT 'E',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN "current_stock" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "search_index" ADD CONSTRAINT "search_index_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;