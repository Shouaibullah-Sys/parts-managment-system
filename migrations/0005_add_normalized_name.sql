-- Migration: Add normalized_name column to customers table
-- This column stores a normalized version of customer names for consistent matching
-- (e.g., "Ahmad", "ahmad", "احمد" will all have the same normalized value)

-- Add the normalized_name column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS normalized_name VARCHAR(255);

-- For existing customers, populate normalized_name with a basic normalization
-- (lowercase version of the name - you may want to run a script to properly normalize existing data)
UPDATE customers 
SET normalized_name = LOWER(TRIM(name))
WHERE normalized_name IS NULL;

-- Make the column NOT NULL after populating existing data
ALTER TABLE customers ALTER COLUMN normalized_name SET NOT NULL;

-- Add an index on normalized_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_normalized_name ON customers(normalized_name);
