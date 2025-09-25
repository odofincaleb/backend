-- Migration: Add title queue system
-- This migration creates a table for managing blog post titles before content generation

-- Create title_queue table
CREATE TABLE title_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'generated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_title_queue_campaign_id ON title_queue(campaign_id);
CREATE INDEX idx_title_queue_status ON title_queue(status);
CREATE INDEX idx_title_queue_created_at ON title_queue(created_at);

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_title_queue_updated_at BEFORE UPDATE ON title_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: content_queue table will be created in migration 004
-- The title_queue_id column will be added there
