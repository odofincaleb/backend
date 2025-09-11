-- Migration: Remove schedule constraints
-- This migration removes the schedule constraints and handles validation in code instead

-- First, drop all existing schedule constraints
DO $$
BEGIN
  -- Drop constraints if they exist
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'campaigns_schedule_check' 
    AND table_name = 'campaigns'
  ) THEN
    ALTER TABLE campaigns DROP CONSTRAINT campaigns_schedule_check;
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_schedule_hours' 
    AND table_name = 'campaigns'
  ) THEN
    ALTER TABLE campaigns DROP CONSTRAINT check_schedule_hours;
  END IF;
END $$;

-- Update column types to ensure proper decimal handling
ALTER TABLE campaigns 
  ALTER COLUMN schedule_hours TYPE numeric(10,2) USING schedule_hours::numeric(10,2),
  ALTER COLUMN schedule TYPE varchar(20);

-- Set default values with proper precision
ALTER TABLE campaigns 
  ALTER COLUMN schedule_hours SET DEFAULT 24.00,
  ALTER COLUMN schedule SET DEFAULT '24.00h';

-- Update existing values to ensure proper format
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
