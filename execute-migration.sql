-- Migration to add current_stock column to parts table
-- This script adds the missing current_stock field that the application expects

ALTER TABLE parts ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0;

-- Initialize current_stock to 0 for all existing parts
UPDATE parts SET current_stock = 0 WHERE current_stock IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN parts.current_stock IS 'Current available quantity of the part in inventory';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'parts' AND column_name = 'current_stock';