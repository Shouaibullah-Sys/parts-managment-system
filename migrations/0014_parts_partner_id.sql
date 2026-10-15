-- 0014_parts_partner_id.sql
-- هر قطعه یک شراکت (شریک) را از لیست شرکا انتخاب می‌کند.
-- جدول part_partners (تقسیم بین دو شریک) جایگزین می‌شود.

ALTER TABLE "parts"
  ADD COLUMN IF NOT EXISTS "partner_id" integer REFERENCES "partners"("id") ON DELETE set null;

CREATE INDEX IF NOT EXISTS "parts_partner_id_idx" ON "parts" ("partner_id");

DROP TABLE IF EXISTS "part_partners";
