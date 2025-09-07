require('dotenv').config();
const { Pool } = require('pg');

console.log('🚀 Manual Database Setup for Fiddy AutoPublisher');
console.log('================================================');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Check if we have a database URL
if (!process.env.DATABASE_URL) {
  console.log('❌ No DATABASE_URL found. This script must be run on Railway or with DATABASE_URL set.');
  console.log('💡 To run this script:');
  console.log('   1. Go to Railway dashboard');
  console.log('   2. Click on your backend service');
  console.log('   3. Go to Settings > Run Command');
  console.log('   4. Run: npm run manual-setup');
  process.exit(1);
}

async function setupDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Connected to database successfully!');
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Users table already exists');
      client.release();
      return;
    }
    
    console.log('🔄 Creating database tables...');
    
    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');
    
    // Create users table
    await client.query(`
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
    console.log('✅ Created users table');
    
    // Create license_keys table
    await client.query(`
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
    console.log('✅ Created license_keys table');
    
    // Add foreign key constraint to users table
    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT fk_users_license_key 
      FOREIGN KEY (license_key_id) REFERENCES license_keys(id)
    `);
    console.log('✅ Added license_key foreign key to users');
    
    // Create other essential tables
    await client.query(`
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
    console.log('✅ Created wordpress_sites table');
    
    await client.query(`
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
    console.log('✅ Created campaigns table');
    
    await client.query(`
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
    console.log('✅ Created content_queue table');
    
    await client.query(`
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
    console.log('✅ Created logs table');
    
    await client.query(`
      CREATE TABLE api_usage (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        api_type VARCHAR(20) NOT NULL CHECK (api_type IN ('openai_text', 'openai_image')),
        tokens_used INTEGER DEFAULT 0,
        cost_usd DECIMAL(10, 4) DEFAULT 0.00,
        request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created api_usage table');
    
    // Create indexes
    const indexes = [
      'CREATE INDEX idx_users_email ON users(email)',
      'CREATE INDEX idx_users_subscription_tier ON users(subscription_tier)',
      'CREATE INDEX idx_license_keys_key ON license_keys(license_key)',
      'CREATE INDEX idx_license_keys_status ON license_keys(status)',
      'CREATE INDEX idx_campaigns_user_id ON campaigns(user_id)',
      'CREATE INDEX idx_campaigns_status ON campaigns(status)',
      'CREATE INDEX idx_content_queue_campaign_id ON content_queue(campaign_id)',
      'CREATE INDEX idx_content_queue_status ON content_queue(status)',
      'CREATE INDEX idx_logs_user_id ON logs(user_id)',
      'CREATE INDEX idx_api_usage_user_id ON api_usage(user_id)'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
        console.log('✅ Created index');
      } catch (error) {
        console.log('⚠️ Index creation failed:', error.message);
      }
    }
    
    // Create triggers
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    await client.query(`
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    
    await client.query(`
      CREATE TRIGGER update_wordpress_sites_updated_at BEFORE UPDATE ON wordpress_sites
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    
    await client.query(`
      CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    
    console.log('✅ Created triggers');
    
    // Create sample license keys
    const bcrypt = require('bcryptjs');
    const { generateLicenseKey } = require('./src/utils/encryption');
    
    const sampleKeys = [
      {
        license_key: generateLicenseKey(),
        subscription_tier: 'hobbyist',
        posts_per_month: 25,
        max_campaigns: 1,
        support_tier: 'basic'
      },
      {
        license_key: generateLicenseKey(),
        subscription_tier: 'professional',
        posts_per_month: null, // unlimited
        max_campaigns: 10,
        support_tier: 'priority'
      }
    ];
    
    for (const keyData of sampleKeys) {
      await client.query(
        `INSERT INTO license_keys (license_key, subscription_tier, posts_per_month, max_campaigns, support_tier)
         VALUES ($1, $2, $3, $4, $5)`,
        [keyData.license_key, keyData.subscription_tier, keyData.posts_per_month, keyData.max_campaigns, keyData.support_tier]
      );
    }
    console.log('✅ Created sample license keys');
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, subscription_tier, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['admin@fiddy.com', adminPassword, 'Admin', 'User', 'professional', true]
    );
    console.log('✅ Created admin user (admin@fiddy.com / admin123)');
    
    client.release();
    await pool.end();
    
    console.log('🎉 Database setup completed successfully!');
    console.log('================================================');
    console.log('✅ All tables created');
    console.log('✅ Sample data seeded');
    console.log('✅ Admin user created');
    console.log('✅ License keys generated');
    console.log('================================================');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
