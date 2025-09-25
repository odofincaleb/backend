-- Create content_queue table
CREATE TABLE IF NOT EXISTS content_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title_id UUID NOT NULL REFERENCES title_queue(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(100) NOT NULL DEFAULT 'blog-post',
    word_count INTEGER NOT NULL DEFAULT 0,
    tone VARCHAR(50) NOT NULL DEFAULT 'conversational',
    keywords JSONB DEFAULT '[]'::jsonb,
    featured_image JSONB DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'generated',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_queue_campaign_id ON content_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_queue_title_id ON content_queue(title_id);
CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(status);
CREATE INDEX IF NOT EXISTS idx_content_queue_created_at ON content_queue(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_content_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_queue_updated_at
    BEFORE UPDATE ON content_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_content_queue_updated_at();
