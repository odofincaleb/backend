-- Fiddy AutoPublisher Database Schema
-- PostgreSQL Database for Railway.com

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    openai_key_encrypted TEXT, -- AES-256 encrypted
    dalle_key_encrypted TEXT,  -- AES-256 encrypted (same as OpenAI for DALL-E 3)
    subscription_tier VARCHAR(20) DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'hobbyist', 'professional')),
    posts_published_this_month INTEGER DEFAULT 0,
    total_posts_published INTEGER DEFAULT 0, -- For trial limit tracking
    max_concurrent_campaigns INTEGER DEFAULT 1,
    support_tier VARCHAR(20) DEFAULT 'basic' CHECK (support_tier IN ('basic', 'priority')),
    license_key_id UUID REFERENCES license_keys(id),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- License keys table
CREATE TABLE license_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_key VARCHAR(255) UNIQUE NOT NULL,
    subscription_tier VARCHAR(20) NOT NULL CHECK (subscription_tier IN ('hobbyist', 'professional')),
    posts_per_month INTEGER, -- NULL for unlimited (professional)
    max_campaigns INTEGER NOT NULL,
    support_tier VARCHAR(20) NOT NULL CHECK (support_tier IN ('basic', 'priority')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- WordPress sites table
CREATE TABLE wordpress_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_name VARCHAR(255) NOT NULL,
    site_url VARCHAR(500) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL, -- AES-256 encrypted
    api_endpoint VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wordpress_site_id UUID REFERENCES wordpress_sites(id),
    topic VARCHAR(255) NOT NULL,
    context TEXT NOT NULL, -- Business context/description
    tone_of_voice VARCHAR(50) DEFAULT 'conversational' CHECK (tone_of_voice IN ('conversational', 'formal', 'humorous', 'storytelling')),
    writing_style VARCHAR(50) DEFAULT 'pas' CHECK (writing_style IN ('pas', 'aida', 'listicle')),
    imperfection_list JSONB DEFAULT '[]'::jsonb,
    schedule VARCHAR(20) DEFAULT '24h' CHECK (schedule IN ('24h', '48h', '72h')),
    schedule_hours DECIMAL(5,2) DEFAULT 24.0, -- Custom schedule in hours (0.1 to 168 hours)
    content_types JSONB DEFAULT '[]'::jsonb, -- Array of content types for this campaign
    content_type_variables JSONB DEFAULT '{}'::jsonb, -- Variables for content type templates
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'error')),
    next_publish_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Title queue table (for title generation workflow)
CREATE TABLE title_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'used')),
    keywords JSONB DEFAULT '[]'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Content queue table
CREATE TABLE content_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title_queue_id UUID REFERENCES title_queue(id), -- Link to the title used
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    title VARCHAR(500),
    keywords JSONB DEFAULT '[]'::jsonb,
    generated_content JSONB, -- Full article content
    featured_image_url VARCHAR(1000),
    wordpress_post_id INTEGER,
    wordpress_post_url VARCHAR(1000),
    error_message TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Logs table
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    campaign_id UUID REFERENCES campaigns(id),
    event_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warn', 'error', 'fatal')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API usage tracking
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    api_type VARCHAR(20) NOT NULL CHECK (api_type IN ('openai_text', 'openai_image')),
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 4) DEFAULT 0.00,
    request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_license_keys_key ON license_keys(license_key);
CREATE INDEX idx_license_keys_status ON license_keys(status);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_next_publish ON campaigns(next_publish_at);
CREATE INDEX idx_title_queue_campaign_id ON title_queue(campaign_id);
CREATE INDEX idx_title_queue_status ON title_queue(status);
CREATE INDEX idx_content_queue_campaign_id ON content_queue(campaign_id);
CREATE INDEX idx_content_queue_status ON content_queue(status);
CREATE INDEX idx_content_queue_scheduled_for ON content_queue(scheduled_for);
CREATE INDEX idx_content_queue_title_queue_id ON content_queue(title_queue_id);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_campaign_id ON logs(campaign_id);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(request_timestamp);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wordpress_sites_updated_at BEFORE UPDATE ON wordpress_sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

