-- Migration: Add currentStock column to parts table
-- This migration adds the currentStock field to track actual inventory levels

ALTER TABLE parts ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0;

-- Initialize currentStock to 0 for all existing parts
UPDATE parts SET current_stock = 0 WHERE current_stock IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN parts.current_stock IS 'Current available quantity of the part in inventory';