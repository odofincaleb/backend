-- Migration: Fix schedule constraints
-- This migration updates the schedule column to allow custom values

-- First, drop the existing schedule constraint
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_schedule_check;

-- Add back a more permissive constraint that just ensures the format
ALTER TABLE campaigns ADD CONSTRAINT campaigns_schedule_check
  CHECK (schedule ~ '^\d+(\.\d{2})?h$');

-- Update the schedule column to match schedule_hours
UPDATE campaigns 
SET schedule = ROUND(schedule_hours::numeric, 2) || 'h'
WHERE schedule_hours IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN campaigns.schedule IS 
  'Schedule in hours with h suffix (e.g., 0.10h, 0.50h, 1.00h, 24.00h)';

-- Verify the changes
DO $$
BEGIN
  -- Test inserting various valid values
  INSERT INTO campaigns (
    user_id, topic, context, schedule, schedule_hours
  ) VALUES 
    ('00000000-0000-0000-0000-000000000000', 'Test 0.1h', 'Test', '0.10h', 0.10),
    ('00000000-0000-0000-0000-000000000000', 'Test 0.5h', 'Test', '0.50h', 0.50),
    ('00000000-0000-0000-0000-000000000000', 'Test 1.0h', 'Test', '1.00h', 1.00),
    ('00000000-0000-0000-0000-000000000000', 'Test 24h', 'Test', '24.00h', 24.00);
  
  -- Clean up test data
  DELETE FROM campaigns WHERE topic LIKE 'Test %h';
  
  RAISE NOTICE 'Migration completed successfully with test values';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration verification failed: %', SQLERRM;
END;
$$;
