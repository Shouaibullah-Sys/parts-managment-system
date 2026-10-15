-- 0018: گروه‌بندی صدور (issue) + شماره فاکتور روی فروش‌ها
-- همهٔ قلم‌هایی که در یک بل صادر شده‌اند یک issue_id دارند؛ سوابق یکی می‌شود
-- و چاپ از /parts/records یک فاکتور با همهٔ قلم‌ها می‌دهد.
-- شماره فاکتور تایپ‌شده در دیالوگ صدور (اختیاری) ذخیره می‌شود.

BEGIN;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS issue_id uuid;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_number varchar(100);

-- تاریخچه: بهترین تخمین ممکن = یک صدور به ازای هر مشتری در هر روز تقویمی
-- MATERIALIZED لازم است: gen_random_uuid() فرار (volatile) است و بدون آن
-- پلنر زیرپرسش را به ازای هر ردیف دوباره اجرا می‌کند (۱۴۵ یو‌آی‌دی مختلف!).
WITH g AS MATERIALIZED (
  SELECT coalesce(customer_id, -1) AS ck,
         date_trunc('day', sale_date) AS d,
         gen_random_uuid() AS uid
  FROM sales
  WHERE issue_id IS NULL
  GROUP BY 1, 2
)
UPDATE sales s
SET issue_id = g.uid
FROM g
WHERE s.issue_id IS NULL
  AND coalesce(s.customer_id, -1) = g.ck
  AND date_trunc('day', s.sale_date) = g.d;

-- ایمنی: هر ردیف باقی‌مانده صدور مستقل خودش را بگیرد
UPDATE sales SET issue_id = gen_random_uuid() WHERE issue_id IS NULL;

ALTER TABLE sales ALTER COLUMN issue_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_issue_id ON sales (issue_id);

COMMIT;
