-- Migration: Fix schedule_hours precision
-- This migration updates the schedule_hours column to properly handle fractional hours

-- First, drop the check constraint if it exists
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS check_schedule_hours;

-- Update the schedule_hours column to use NUMERIC instead of DECIMAL
ALTER TABLE campaigns ALTER COLUMN schedule_hours TYPE NUMERIC(5,2);

-- Add back the check constraint with proper precision
ALTER TABLE campaigns ADD CONSTRAINT check_schedule_hours 
  CHECK (schedule_hours >= 0.10 AND schedule_hours <= 168.00);

-- Update any existing records to ensure proper precision
UPDATE campaigns 
SET schedule_hours = ROUND(schedule_hours::numeric, 2)
WHERE schedule_hours IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN campaigns.schedule_hours IS 'Custom schedule in hours (0.10 to 168.00, 2 decimal places)';
