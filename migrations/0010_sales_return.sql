-- مرجوعی فروش: ستون‌های وضعیت مرتجع روی sales
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "returned_at" timestamp;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "return_note" text;
