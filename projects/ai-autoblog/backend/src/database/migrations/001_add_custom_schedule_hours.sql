-- Migration: Add custom schedule hours support
-- This migration updates the campaigns table to support custom hour-based scheduling

-- First, add a new column for storing custom hours
ALTER TABLE campaigns ADD COLUMN schedule_hours DECIMAL(5,2);

-- Update existing records to convert schedule strings to hours
UPDATE campaigns SET schedule_hours = 
  CASE 
    WHEN schedule = '24h' THEN 24.0
    WHEN schedule = '48h' THEN 48.0
    WHEN schedule = '72h' THEN 72.0
    ELSE 24.0 -- default fallback
  END;

-- Make the new column NOT NULL with a default
ALTER TABLE campaigns ALTER COLUMN schedule_hours SET NOT NULL;
ALTER TABLE campaigns ALTER COLUMN schedule_hours SET DEFAULT 24.0;

-- Add a check constraint to ensure reasonable hour values (0.1 to 168 hours = 1 week)
ALTER TABLE campaigns ADD CONSTRAINT check_schedule_hours 
  CHECK (schedule_hours >= 0.1 AND schedule_hours <= 168.0);

-- Add an index for performance
CREATE INDEX idx_campaigns_schedule_hours ON campaigns(schedule_hours);

-- Note: We'll keep the old schedule column for backward compatibility during transition
-- It can be removed in a future migration once all clients are updated
