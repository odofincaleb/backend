-- Comprehensive fix for campaign deletion issues
-- This migration ensures all foreign key constraints allow CASCADE deletes

-- First, check if logs table exists and fix its foreign key
DO $$
BEGIN
    -- Drop existing foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'logs_campaign_id_fkey' 
        AND table_name = 'logs'
    ) THEN
        ALTER TABLE logs DROP CONSTRAINT logs_campaign_id_fkey;
    END IF;
    
    -- Add the foreign key constraint with CASCADE delete
    ALTER TABLE logs 
    ADD CONSTRAINT logs_campaign_id_fkey 
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed logs table foreign key constraint';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not fix logs foreign key: %', SQLERRM;
END $$;

-- Ensure all other tables with campaign references have CASCADE delete
DO $$
BEGIN
    -- Check and fix content_queue table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'content_queue'
    ) THEN
        -- Drop existing constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'content_queue_campaign_id_fkey' 
            AND table_name = 'content_queue'
        ) THEN
            ALTER TABLE content_queue DROP CONSTRAINT content_queue_campaign_id_fkey;
        END IF;
        
        -- Add CASCADE constraint
        ALTER TABLE content_queue 
        ADD CONSTRAINT content_queue_campaign_id_fkey 
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed content_queue table foreign key constraint';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not fix content_queue foreign key: %', SQLERRM;
END $$;

-- Ensure title_queue table has CASCADE delete
DO $$
BEGIN
    -- Check and fix title_queue table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'title_queue'
    ) THEN
        -- Drop existing constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'title_queue_campaign_id_fkey' 
            AND table_name = 'title_queue'
        ) THEN
            ALTER TABLE title_queue DROP CONSTRAINT title_queue_campaign_id_fkey;
        END IF;
        
        -- Add CASCADE constraint
        ALTER TABLE title_queue 
        ADD CONSTRAINT title_queue_campaign_id_fkey 
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed title_queue table foreign key constraint';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not fix title_queue foreign key: %', SQLERRM;
END $$;
