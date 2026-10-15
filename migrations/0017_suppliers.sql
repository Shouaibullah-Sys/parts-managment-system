-- 0017_suppliers.sql
-- فروشگاه/تأمین‌کننده: برای پرزه‌های خارجی (افزودن پرزه از فروشگاه دیگر).
-- اسنپ‌شات نام فروشگاه روی فروش، تا با حذف/ویرایش تأمین‌کننده تاریخچه سالم بماند.

CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "phone" varchar(50),
  "note" text,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_suppliers_name_unique" ON "suppliers" ("name");
CREATE INDEX IF NOT EXISTS "idx_suppliers_active" ON "suppliers" ("active");

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "supplier_id" integer REFERENCES "suppliers"("id") ON DELETE SET NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "supplier_name" varchar(255);
