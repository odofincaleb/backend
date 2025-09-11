-- Migration: Fix all schedule constraints
-- This migration consolidates all schedule-related fixes

-- First, drop all existing schedule constraints
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_schedule_check;
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS check_schedule_hours;

-- Update schedule_hours column type and constraints
ALTER TABLE campaigns 
  ALTER COLUMN schedule_hours TYPE numeric(10,2) USING schedule_hours::numeric(10,2);

ALTER TABLE campaigns 
  ADD CONSTRAINT check_schedule_hours 
  CHECK (schedule_hours >= 0.10 AND schedule_hours <= 168.00);

-- Set default value with proper precision
ALTER TABLE campaigns 
  ALTER COLUMN schedule_hours SET DEFAULT 24.00;

-- Update the schedule column to be more flexible
ALTER TABLE campaigns 
  ALTER COLUMN schedule TYPE VARCHAR(20);

ALTER TABLE campaigns 
  ALTER COLUMN schedule SET DEFAULT '24.00h';

-- Add new schedule format constraint
ALTER TABLE campaigns 
  ADD CONSTRAINT campaigns_schedule_check
  CHECK (schedule ~ '^\d+\.\d{2}h$');

-- Update existing values to ensure proper precision
UPDATE campaigns 
SET 
  schedule_hours = ROUND(CAST(schedule_hours AS numeric), 2),
  schedule = ROUND(CAST(schedule_hours AS numeric), 2) || 'h'
WHERE schedule_hours IS NOT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN campaigns.schedule_hours IS 
  'Custom schedule in hours (0.10 to 168.00). Supports fractional hours like 0.10, 0.50, 1.00, etc.';

COMMENT ON COLUMN campaigns.schedule IS 
  'Schedule in hours with h suffix (e.g., 0.10h, 0.50h, 1.00h, 24.00h)';

-- Create/update indexes for performance
DROP INDEX IF EXISTS idx_campaigns_schedule_hours;
CREATE INDEX idx_campaigns_schedule_hours ON campaigns(schedule_hours);
CREATE INDEX IF NOT EXISTS idx_campaigns_schedule ON campaigns(schedule);

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
