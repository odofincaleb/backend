// Script to fix database issues - create missing tables and columns
require('dotenv').config();
const { query, testConnection } = require('./backend/src/database/connection');
const logger = require('./backend/src/utils/logger');

async function fixDatabase() {
  try {
    console.log('🔧 Fixing database issues...');
    
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connected');

    // Check if title_queue table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'title_queue'
      );
    `);
    
    const titleQueueExists = tableCheck.rows[0].exists;
    console.log(`📋 title_queue table exists: ${titleQueueExists}`);

    if (!titleQueueExists) {
      console.log('🔨 Creating title_queue table...');
      await query(`
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
      `);
      console.log('✅ title_queue table created');

      // Add indexes
      await query(`CREATE INDEX IF NOT EXISTS idx_title_queue_campaign_id ON title_queue(campaign_id);`);
      await query(`CREATE INDEX IF NOT EXISTS idx_title_queue_status ON title_queue(status);`);
      console.log('✅ Indexes created');
    }

    // Check if content_queue has title_queue_id column
    const columnCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'content_queue' 
        AND column_name = 'title_queue_id'
      );
    `);
    
    const titleQueueIdExists = columnCheck.rows[0].exists;
    console.log(`📋 title_queue_id column exists: ${titleQueueIdExists}`);

    if (!titleQueueIdExists) {
      console.log('🔨 Adding title_queue_id column to content_queue...');
      await query(`
        ALTER TABLE content_queue
        ADD COLUMN title_queue_id UUID REFERENCES title_queue(id);
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_content_queue_title_queue_id ON content_queue(title_queue_id);`);
      console.log('✅ title_queue_id column added');
    }

    // Check if campaigns has number_of_titles column
    const numberOfTitlesCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'number_of_titles'
      );
    `);
    
    const numberOfTitlesExists = numberOfTitlesCheck.rows[0].exists;
    console.log(`📋 number_of_titles column exists: ${numberOfTitlesExists}`);

    if (!numberOfTitlesExists) {
      console.log('🔨 Adding number_of_titles column to campaigns...');
      await query(`
        ALTER TABLE campaigns
        ADD COLUMN number_of_titles INTEGER DEFAULT 5;
      `);
      console.log('✅ number_of_titles column added');
    }

    console.log('🎉 Database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    throw error;
  }
}

fixDatabase().then(() => {
  console.log('✅ Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
