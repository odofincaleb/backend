require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function fixContentQueueTable() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to database');

    // Check if content_queue table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'content_queue'
      );
    `);
    
    console.log('📋 content_queue table exists:', tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log('🔧 Creating content_queue table...');
      
      // Create the table
      await client.query(`
        CREATE TABLE content_queue (
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
      `);
      
      console.log('✅ content_queue table created');
      
      // Create indexes
      await client.query(`
        CREATE INDEX idx_content_queue_campaign_id ON content_queue(campaign_id);
        CREATE INDEX idx_content_queue_title_id ON content_queue(title_id);
        CREATE INDEX idx_content_queue_status ON content_queue(status);
        CREATE INDEX idx_content_queue_created_at ON content_queue(created_at);
      `);
      
      console.log('✅ Indexes created');
      
      // Create trigger
      await client.query(`
        CREATE OR REPLACE FUNCTION update_content_queue_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      await client.query(`
        CREATE TRIGGER trigger_update_content_queue_updated_at
            BEFORE UPDATE ON content_queue
            FOR EACH ROW
            EXECUTE FUNCTION update_content_queue_updated_at();
      `);
      
      console.log('✅ Trigger created');
      
    } else {
      console.log('✅ content_queue table already exists');
      
      // Check table structure
      const structure = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'content_queue'
        ORDER BY ordinal_position;
      `);
      console.log('📊 content_queue table structure:');
      structure.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

fixContentQueueTable();
