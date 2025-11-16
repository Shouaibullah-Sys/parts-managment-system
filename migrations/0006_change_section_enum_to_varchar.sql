-- Migration to change section enum to varchar for flexibility
-- This migration converts the section enum column to varchar to allow any text values

-- Step 1: Drop the enum type (after updating all columns that reference it)
DROP TYPE IF EXISTS section CASCADE;

-- Step 2: Update the parts table section column to varchar
ALTER TABLE parts ALTER COLUMN section TYPE varchar(50);

-- Step 3: Update the search_index table section column to varchar  
ALTER TABLE search_index ALTER COLUMN section TYPE varchar(50);

-- Step 4: Recreate the section type with more flexibility (optional, can be removed if not needed)
-- Commented out since we're using varchar now
-- CREATE TYPE section AS ENUM ('E', 'D', 'F', 'G', 'OLD');
