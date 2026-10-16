# Rollback: حذف «بخش» (section)

این سند نحوهٔ بازگردانی کامل حذف مفهوم **بخش (section)** از سامانهٔ مدیریت پرزه‌جات را
توضیح می‌دهد. حذف بخش در سه لایه انجام شده است:

1. **دیتابیس** — ستون `section` از جدول‌های `parts` و `search_index`.
2. **اسکیمای ORM** — `db/schema.ts` و `migrations/schema.ts`.
3. **کد اپلیکیشن** — تایپ‌ها، لایهٔ lib، APIها، هوک‌ها، کامپوننت‌ها و صفحات.

پیش از هر بازگردانی، از دیتابیس و مخزن یک نسخهٔ پشتیبان تهیه کنید.

---

## ۱) بازگردانی کد (Git)

تمام تغییرات این حذف در یک تغییر (commit) روی شاخهٔ `main` قرار دارند. برای بازگردانی:

```bash
# بازگردانی فقط همین تغییر (بدون پاک‌کردن تاریخچه)
git log --oneline -5
git revert <COMMIT_SHA>

# یا بازگردانی موقت برای آزمون
git stash                 # تغییرات جاری
git checkout <COMMIT_SHA>~1 -- \
  db/schema.ts migrations/schema.ts \
  types/parts.ts types/dashboard.ts lib/types.ts \
  lib/parts-queries.ts lib/parts-service.ts lib/api/dashboard.ts \
  lib/excel-utils.ts lib/partner-print.ts lib/partner-excel.ts \
  lib/notifications.ts lib/returns-print.ts lib/sales-print.ts \
  lib/dashboard-print.ts lib/validations/part.ts \
  hooks/use-parts.ts \
  app/api/parts/route.ts app/api/parts/[id]/route.ts \
  app/api/parts/search/route.ts app/api/sales/route.ts \
  app/api/partners/report/route.ts app/api/issue-parts/[id]/pdf/route.ts \
  app/ parts/ components/partners/partner-report-view.tsx
```

> فایل `app/api/parts/sections/route.ts` حذف شده است؛ برای بازگردانی آن:
> `git checkout <COMMIT_SHA>~1 -- app/api/parts/sections/route.ts`

## ۲) بازگردانی دیتابیس

### حذف (forward) — چیزی که برای اعمال حذف اجرا می‌شود

```sql
BEGIN;
ALTER TABLE parts DROP COLUMN IF EXISTS section;
ALTER TABLE search_index DROP COLUMN IF EXISTS section;
DROP TYPE IF EXISTS section CASCADE;
COMMIT;
```

### بازگردانی (rollback)

> **هشدار:** مقادیر بخشِ حذف‌شده قابل بازیابی نیستند. پس از بازگردانی، همهٔ ردیف‌ها
> مقدار پیش‌فرض `'E'` می‌گیرند.

```sql
BEGIN;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS section varchar(50) DEFAULT 'E';
ALTER TABLE search_index ADD COLUMN IF NOT EXISTS section varchar(50) DEFAULT 'E';
COMMIT;
```

نوع `section` به‌صورت enum دیگر ساخته نمی‌شود؛ در مهاجرت
`migrations/0006_change_section_enum_to_varchar.sql` عمداً به `varchar` تغییر یافته
بود و بازگردانی همان حالت `varchar` را برمی‌گرداند.

## ۳) بررسی پس از بازگردانی

```bash
psql "$DATABASE_URL" -c "\d parts"          # ستون section باید موجود باشد
psql "$DATABASE_URL" -c "\d search_index"   # ستون section باید موجود باشد
npx tsc --noEmit                            # باید بدون خطا تمام شود
pnpm run build                              # باید موفق باشد
```

پس از بازگردانی کد، مسیر `app/api/parts/sections/route.ts` و Consumerهای آن باید دوباره
موجود باشند؛ در غیر این صورت `npx tsc --noEmit` خطاهای «Cannot find module» نشان می‌دهد.
