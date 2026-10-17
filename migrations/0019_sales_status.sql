-- 0019: وضعیت فروش (پیش‌نویس/نهایی)
-- در /parts/issue کاربر می‌تواند سبد را به‌صورت «پیش‌نویس» ذخیره کند، بعداً
-- ویرایش کند و در نهایت «ثبت نهایی» کند. پیش‌نویس‌ها روی موجودی انبار و
-- سوابق بل اثر ندارند تا لحظهٔ ثبت نهایی. بل‌های قبلی «نهایی» فرض می‌شوند.

BEGIN;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS status varchar(50) NOT NULL DEFAULT 'final';
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales (status);

COMMIT;
