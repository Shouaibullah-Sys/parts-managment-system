-- 0015_sales_item_name_cost.sql
-- پرزه خارجی (خرید از فروشگاه دیگر) که فقط وارد بل/مالی می‌شود و
-- به موجودی انبار (parts/inventory) ربطی ندارد.
-- item_name: نام پرزهٔ خارجی (زمانی که part_id تهی است)
-- item_cost: بهای خرید واحد — فقط ذخیره می‌شود و در بل نمایش داده نمی‌شود

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "item_name" varchar(255);
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "item_cost" numeric(12, 2);
