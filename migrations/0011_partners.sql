-- شرکا: جدول شرکا برای ماژول تقسیم سود (مرحله ۱)
CREATE TABLE IF NOT EXISTS "partners" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "phone" varchar(50),
  "note" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
