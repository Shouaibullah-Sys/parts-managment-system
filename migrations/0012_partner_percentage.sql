-- شرکا: افزودن ستون درصد سهم (سهم پیشفرض شریک)
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "percentage" numeric(5, 2);
