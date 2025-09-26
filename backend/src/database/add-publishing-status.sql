-- Add publishing status columns to content_queue table
ALTER TABLE content_queue 
ADD COLUMN publishing_status VARCHAR(20) DEFAULT 'pending' CHECK (publishing_status IN ('pending', 'reviewed', 'approved', 'published', 'rejected')),
ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reviewed_by UUID REFERENCES users(id),
ADD COLUMN published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN review_notes TEXT;

-- Update existing records to have proper status
UPDATE content_queue 
SET status = 'completed' 
WHERE status = 'completed' AND generated_content IS NOT NULL;

-- Create index for publishing status queries
CREATE INDEX idx_content_queue_publishing_status ON content_queue(publishing_status);
CREATE INDEX idx_content_queue_scheduled_for ON content_queue(scheduled_for);
