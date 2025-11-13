-- Migration: Add 'approved' column to user table
-- This script adds the 'approved' boolean column to the user table

ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS "approved" boolean DEFAULT false NOT NULL;

-- Optional: Create an index for better performance on approval checks
CREATE INDEX IF NOT EXISTS "user_approved_idx" ON "user" ("approved");

-- Note: This migration should be run against your Neon PostgreSQL database
-- You can run this directly in your Neon dashboard or using a PostgreSQL client