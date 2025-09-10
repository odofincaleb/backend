-- Migration: Add content types and variables system
-- This migration adds support for content type selection and custom variables

-- Add content types column to campaigns table
ALTER TABLE campaigns ADD COLUMN content_types JSONB DEFAULT '[]'::jsonb;

-- Add content type variables column to campaigns table
ALTER TABLE campaigns ADD COLUMN content_type_variables JSONB DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX idx_campaigns_content_types ON campaigns USING GIN (content_types);

-- Add check constraint to ensure content_types is an array
ALTER TABLE campaigns ADD CONSTRAINT check_content_types_array 
  CHECK (jsonb_typeof(content_types) = 'array');

-- Add check constraint to ensure content_type_variables is an object
ALTER TABLE campaigns ADD CONSTRAINT check_content_type_variables_object 
  CHECK (jsonb_typeof(content_type_variables) = 'object');

-- Update existing campaigns to have all 15 content types by default
UPDATE campaigns 
SET content_types = '[
  "how_to_guide",
  "listicle", 
  "comparison_post",
  "review_post",
  "ultimate_guide",
  "case_study",
  "problem_solution",
  "trending_topic",
  "thought_leadership",
  "beginners_guide",
  "advanced_guide",
  "faq_post",
  "checklist_template",
  "opinion_editorial",
  "resource_roundup"
]'::jsonb
WHERE content_types = '[]'::jsonb OR content_types IS NULL;

-- Set default variables for existing campaigns
UPDATE campaigns 
SET content_type_variables = '{
  "audience": "general audience",
  "tone": "conversational",
  "wordCount": "1500-2000",
  "keyword": "",
  "cta": "Learn more about our services"
}'::jsonb
WHERE content_type_variables = '{}'::jsonb OR content_type_variables IS NULL;
