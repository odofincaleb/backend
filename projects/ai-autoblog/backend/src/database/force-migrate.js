require('dotenv').config();
const { query, testConnection } = require('./connection');
const logger = require('../utils/logger');

/**
 * Force create all tables - bypasses existing table checks
 */
const forceCreateTables = async () => {
  try {
    logger.info('Force creating database tables...');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Enable UUID extension
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    logger.info('UUID extension enabled');

    // Drop tables if they exist (in correct order due to foreign keys)
    const dropOrder = [
      'api_usage',
      'logs', 
      'content_queue',
      'campaigns',
      'wordpress_sites',
      'license_keys',
      'users'
    ];

    for (const table of dropOrder) {
      try {
        await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        logger.info(`Dropped table: ${table}`);
      } catch (error) {
        logger.warn(`Could not drop table ${table}:`, error.message);
      }
    }

    // Create users table
    await query(`
      CREATE TABLE users (
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
    logger.info('Created users table');

    // Create license_keys table
    await query(`
      CREATE TABLE license_keys (
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
    logger.info('Created license_keys table');

    // Add foreign key constraint to users table
    await query(`
      ALTER TABLE users 
      ADD CONSTRAINT fk_users_license_key 
      FOREIGN KEY (license_key_id) REFERENCES license_keys(id)
    `);
    logger.info('Added license_key foreign key to users');

    // Create wordpress_sites table
    await query(`
      CREATE TABLE wordpress_sites (
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
    logger.info('Created wordpress_sites table');

    // Create campaigns table
    await query(`
      CREATE TABLE campaigns (
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
    logger.info('Created campaigns table');

    // Create content_queue table
    await query(`
      CREATE TABLE content_queue (
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
    logger.info('Created content_queue table');

    // Create logs table
    await query(`
      CREATE TABLE logs (
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
    logger.info('Created logs table');

    // Create api_usage table
    await query(`
      CREATE TABLE api_usage (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        api_type VARCHAR(20) NOT NULL CHECK (api_type IN ('openai_text', 'openai_image')),
        tokens_used INTEGER DEFAULT 0,
        cost_usd DECIMAL(10, 4) DEFAULT 0.00,
        request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Created api_usage table');

    // Create indexes
    const indexes = [
      'CREATE INDEX idx_users_email ON users(email)',
      'CREATE INDEX idx_users_subscription_tier ON users(subscription_tier)',
      'CREATE INDEX idx_license_keys_key ON license_keys(license_key)',
      'CREATE INDEX idx_license_keys_status ON license_keys(status)',
      'CREATE INDEX idx_campaigns_user_id ON campaigns(user_id)',
      'CREATE INDEX idx_campaigns_status ON campaigns(status)',
      'CREATE INDEX idx_campaigns_next_publish ON campaigns(next_publish_at)',
      'CREATE INDEX idx_content_queue_campaign_id ON content_queue(campaign_id)',
      'CREATE INDEX idx_content_queue_status ON content_queue(status)',
      'CREATE INDEX idx_content_queue_scheduled_for ON content_queue(scheduled_for)',
      'CREATE INDEX idx_logs_user_id ON logs(user_id)',
      'CREATE INDEX idx_logs_campaign_id ON logs(campaign_id)',
      'CREATE INDEX idx_logs_created_at ON logs(created_at)',
      'CREATE INDEX idx_api_usage_user_id ON api_usage(user_id)',
      'CREATE INDEX idx_api_usage_timestamp ON api_usage(request_timestamp)'
    ];

    for (const indexQuery of indexes) {
      try {
        await query(indexQuery);
        logger.info('Created index');
      } catch (error) {
        logger.warn('Index creation failed:', error.message);
      }
    }

    // Create triggers
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await query(`
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await query(`
      CREATE TRIGGER update_wordpress_sites_updated_at BEFORE UPDATE ON wordpress_sites
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await query(`
      CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    logger.info('Database tables created successfully!');
    return true;

  } catch (error) {
    logger.error('Force migration failed:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  forceCreateTables()
    .then(() => {
      logger.info('Force migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Force migration failed:', error);
      process.exit(1);
    });
}

module.exports = { forceCreateTables };

