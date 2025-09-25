-- Fix logs table foreign key constraint to allow CASCADE delete
-- This allows campaigns to be deleted without foreign key constraint errors

-- First, drop the existing foreign key constraint
ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_campaign_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE logs 
ADD CONSTRAINT logs_campaign_id_fkey 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
