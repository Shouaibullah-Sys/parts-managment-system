-- 0013_part_partners.sql
-- شراکت قطعات: هر قطعه بین دو شریک (مجموع درصدها ۱۰۰)

CREATE TABLE IF NOT EXISTS "part_partners" (
  "id"          serial PRIMARY KEY,
  "part_id"     integer NOT NULL REFERENCES "parts"("id") ON DELETE cascade,
  "partner_id"  integer NOT NULL REFERENCES "partners"("id") ON DELETE cascade,
  "percentage"  numeric(5,2) NOT NULL CHECK ("percentage" >= 0 AND "percentage" <= 100),
  "created_at"  timestamp DEFAULT now(),
  "updated_at"  timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "part_partners_part_partner_uq"
  ON "part_partners" ("part_id", "partner_id");

CREATE INDEX IF NOT EXISTS "part_partners_partner_id_idx"
  ON "part_partners" ("partner_id");
