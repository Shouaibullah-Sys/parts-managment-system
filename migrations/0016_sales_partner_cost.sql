-- 0016_sales_partner_cost.sql
-- گزارش سود شرکا: اسنپ‌شات «شریک» و «بهای تمام شدهٔ واحد» در لحظهٔ فروش.
-- بدون این دو ستون، ویرایش partner_id یا cost_price یک قطعه
-- کل تاریخچهٔ گزارش سود را بازنویسی می‌کند.

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "partner_id" integer REFERENCES "partners"("id") ON DELETE SET NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "unit_cost" numeric(12, 2);

-- بازپرکردن تاریخچهٔ موجود (فروش‌های قطعه‌ای از parts، پرزهٔ خارجی از item_cost)
UPDATE "sales" AS s
SET "partner_id" = p."partner_id",
    "unit_cost" = COALESCE(p."cost_price", 0)
FROM "parts" AS p
WHERE s."part_id" = p."id";

UPDATE "sales"
SET "unit_cost" = "item_cost"
WHERE "part_id" IS NULL AND "item_cost" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_sales_sale_date" ON "sales" ("sale_date");
CREATE INDEX IF NOT EXISTS "idx_sales_partner_id" ON "sales" ("partner_id");
CREATE INDEX IF NOT EXISTS "idx_parts_partner_id" ON "parts" ("partner_id");
