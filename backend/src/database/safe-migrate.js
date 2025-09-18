require('dotenv').config();
const { query, testConnection } = require('./connection');
const logger = require('../utils/logger');

/**
 * Safe migration system that preserves existing data
 * Only adds missing columns and tables, never drops existing data
 */
const safeMigrate = async () => {
  try {
    logger.info('Starting safe database migration...');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Enable UUID extension
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    logger.info('UUID extension enabled');

    // Create users table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        openai_key_encrypted TEXT,
        dalle_key_encrypted TEXT,
        subscription_tier VARCHAR(20) DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'hobbyist', 'professional')),
        posts_published_this_month INTEGER DEFAULT 0,
        total_posts_published INTEGER DEFAULT 0,
        max_concurrent_campaigns INTEGER DEFAULT 1,
        support_tier VARCHAR(20) DEFAULT 'basic' CHECK (support_tier IN ('basic', 'priority')),
        license_key_id UUID,
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Users table ensured');

    // Add missing columns to users table if they don't exist
    const userColumns = [
      { name: 'first_name', type: 'VARCHAR(100)' },
      { name: 'last_name', type: 'VARCHAR(100)' },
      { name: 'openai_key_encrypted', type: 'TEXT' },
      { name: 'dalle_key_encrypted', type: 'TEXT' },
      { name: 'subscription_tier', type: 'VARCHAR(20) DEFAULT \'trial\'' },
      { name: 'posts_published_this_month', type: 'INTEGER DEFAULT 0' },
      { name: 'total_posts_published', type: 'INTEGER DEFAULT 0' },
      { name: 'max_concurrent_campaigns', type: 'INTEGER DEFAULT 1' },
      { name: 'support_tier', type: 'VARCHAR(20) DEFAULT \'basic\'' },
      { name: 'license_key_id', type: 'UUID' },
      { name: 'is_active', type: 'BOOLEAN DEFAULT true' },
      { name: 'email_verified', type: 'BOOLEAN DEFAULT false' },
      { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const column of userColumns) {
      try {
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
        logger.info(`Added column ${column.name} to users table`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.warn(`Could not add column ${column.name}:`, error.message);
        }
      }
    }

    // Create license_keys table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS license_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        license_key VARCHAR(255) UNIQUE NOT NULL,
        subscription_tier VARCHAR(20) NOT NULL CHECK (subscription_tier IN ('hobbyist', 'professional')),
        posts_per_month INTEGER,
        max_campaigns INTEGER NOT NULL,
        support_tier VARCHAR(20) NOT NULL CHECK (support_tier IN ('basic', 'priority')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
        user_id UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE
      )
    `);
    logger.info('License keys table ensured');

    // Create wordpress_sites table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS wordpress_sites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        site_name VARCHAR(255) NOT NULL,
        site_url VARCHAR(500) NOT NULL,
        username VARCHAR(255) NOT NULL,
        password_encrypted TEXT NOT NULL,
        api_endpoint VARCHAR(500) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('WordPress sites table ensured');

    // Create campaigns table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        wordpress_site_id UUID REFERENCES wordpress_sites(id),
        topic VARCHAR(255) NOT NULL,
        context TEXT NOT NULL,
        tone_of_voice VARCHAR(50) DEFAULT 'conversational' CHECK (tone_of_voice IN ('conversational', 'formal', 'humorous', 'storytelling')),
        writing_style VARCHAR(50) DEFAULT 'pas' CHECK (writing_style IN ('pas', 'aida', 'listicle')),
        imperfection_list JSONB DEFAULT '[]'::jsonb,
        schedule VARCHAR(20) DEFAULT '24h' CHECK (schedule IN ('24h', '48h', '72h')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'error')),
        next_publish_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Campaigns table ensured');

    // Add missing columns to campaigns table
    const campaignColumns = [
      { name: 'schedule_hours', type: 'NUMERIC(10,2)' },
      { name: 'content_types', type: 'JSONB DEFAULT \'[]\'::jsonb' },
      { name: 'content_type_variables', type: 'JSONB DEFAULT \'{}\'::jsonb' },
      { name: 'title_count', type: 'INTEGER DEFAULT 5' }
    ];

    for (const column of campaignColumns) {
      try {
        await query(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
        logger.info(`Added column ${column.name} to campaigns table`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.warn(`Could not add column ${column.name}:`, error.message);
        }
      }
    }

    // Create content_queue table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS content_queue (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
        title VARCHAR(500),
        keywords JSONB DEFAULT '[]'::jsonb,
        generated_content JSONB,
        featured_image_url VARCHAR(1000),
        wordpress_post_id INTEGER,
        wordpress_post_url VARCHAR(1000),
        error_message TEXT,
        scheduled_for TIMESTAMP WITH TIME ZONE,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Content queue table ensured');

    // Create title_queue table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS title_queue (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'generated')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Title queue table ensured');

    // Add missing columns to title_queue table if they don't exist
    const titleQueueColumns = [
      { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const column of titleQueueColumns) {
      try {
        await query(`ALTER TABLE title_queue ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
        logger.info(`Added column ${column.name} to title_queue table`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.warn(`Could not add column ${column.name}:`, error.message);
        }
      }
    }

    // Create logs table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        campaign_id UUID REFERENCES campaigns(id),
        event_type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warn', 'error', 'fatal')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Logs table ensured');

    // Create api_usage table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS api_usage (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        api_type VARCHAR(20) NOT NULL CHECK (api_type IN ('openai_text', 'openai_image')),
        tokens_used INTEGER DEFAULT 0,
        cost_usd DECIMAL(10, 4) DEFAULT 0.00,
        request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('API usage table ensured');

    // Create indexes if they don't exist
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier)',
      'CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(license_key)',
      'CREATE INDEX IF NOT EXISTS idx_license_keys_status ON license_keys(status)',
      'CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)',
      'CREATE INDEX IF NOT EXISTS idx_campaigns_next_publish ON campaigns(next_publish_at)',
      'CREATE INDEX IF NOT EXISTS idx_campaigns_schedule_hours ON campaigns(schedule_hours)',
      'CREATE INDEX IF NOT EXISTS idx_content_queue_campaign_id ON content_queue(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(status)',
      'CREATE INDEX IF NOT EXISTS idx_content_queue_scheduled_for ON content_queue(scheduled_for)',
      'CREATE INDEX IF NOT EXISTS idx_title_queue_campaign_id ON title_queue(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_title_queue_status ON title_queue(status)',
      'CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_logs_campaign_id ON logs(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(request_timestamp)'
    ];

    for (const indexQuery of indexes) {
      try {
        await query(indexQuery);
        logger.info('Created index');
      } catch (error) {
        logger.warn('Index creation failed:', error.message);
      }
    }

    // Create triggers if they don't exist
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    const triggers = [
      'CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_wordpress_sites_updated_at BEFORE UPDATE ON wordpress_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_title_queue_updated_at BEFORE UPDATE ON title_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
    ];

    for (const triggerQuery of triggers) {
      try {
        await query(triggerQuery);
        logger.info('Created trigger');
      } catch (error) {
        logger.warn('Trigger creation failed:', error.message);
      }
    }

    logger.info('Safe database migration completed successfully - all data preserved!');
    return true;

  } catch (error) {
    logger.error('Safe migration failed:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  safeMigrate()
    .then(() => {
      logger.info('Safe migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Safe migration failed:', error);
      process.exit(1);
    });
}

module.exports = { safeMigrate };
