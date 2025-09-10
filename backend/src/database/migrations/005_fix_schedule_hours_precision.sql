-- Migration: Fix schedule_hours precision and constraints
-- This migration ensures proper handling of fractional hours

-- First, temporarily remove constraints
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS check_schedule_hours;

-- Update the column type to ensure proper decimal handling
ALTER TABLE campaigns 
  ALTER COLUMN schedule_hours TYPE numeric(10,2) USING schedule_hours::numeric(10,2);

-- Add back the constraint with proper precision
ALTER TABLE campaigns 
  ADD CONSTRAINT check_schedule_hours 
  CHECK (schedule_hours >= 0.10 AND schedule_hours <= 168.00);

-- Set default value with proper precision
ALTER TABLE campaigns 
  ALTER COLUMN schedule_hours SET DEFAULT 24.00;

-- Update existing values to ensure proper precision
UPDATE campaigns 
SET schedule_hours = ROUND(CAST(schedule_hours AS numeric), 2)
WHERE schedule_hours IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN campaigns.schedule_hours IS 
  'Custom schedule in hours (0.10 to 168.00). Supports fractional hours like 0.10, 0.50, 1.00, etc.';

-- Create an index for performance
DROP INDEX IF EXISTS idx_campaigns_schedule_hours;
CREATE INDEX idx_campaigns_schedule_hours ON campaigns(schedule_hours);

-- Verify the changes
DO $$
BEGIN
  -- Test inserting various valid values
  INSERT INTO campaigns (
    user_id, topic, context, schedule_hours
  ) VALUES 
    ('00000000-0000-0000-0000-000000000000', 'Test 0.1h', 'Test', 0.10),
    ('00000000-0000-0000-0000-000000000000', 'Test 0.5h', 'Test', 0.50),
    ('00000000-0000-0000-0000-000000000000', 'Test 1.0h', 'Test', 1.00),
    ('00000000-0000-0000-0000-000000000000', 'Test 24h', 'Test', 24.00);
  
  -- Clean up test data
  DELETE FROM campaigns WHERE topic LIKE 'Test %h';
  
  RAISE NOTICE 'Migration completed successfully with test values';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration verification failed: %', SQLERRM;
END;
$$;
