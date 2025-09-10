#!/usr/bin/env node

const { query, testConnection } = require('./src/database/connection');
const logger = require('./src/utils/logger');

async function addMissingColumns() {
  console.log('🔄 Adding missing columns to existing database...');
  
  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful');
    
    // Add missing columns to campaigns table
    const migrations = [
      {
        name: 'Add schedule_hours column',
        sql: `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS schedule_hours DECIMAL(5,2) DEFAULT 24.0;`
      },
      {
        name: 'Add content_types column',
        sql: `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_types JSONB DEFAULT '[]'::jsonb;`
      },
      {
        name: 'Add content_type_variables column',
        sql: `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_type_variables JSONB DEFAULT '{}'::jsonb;`
      },
      {
        name: 'Add number_of_titles column',
        sql: `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS number_of_titles INTEGER DEFAULT 5;`
      },
      {
        name: 'Create title_queue table',
        sql: `CREATE TABLE IF NOT EXISTS title_queue (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'used')),
          keywords JSONB DEFAULT '[]'::jsonb,
          generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          approved_at TIMESTAMP WITH TIME ZONE,
          used_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        name: 'Add title_queue_id to content_queue',
        sql: `ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS title_queue_id UUID REFERENCES title_queue(id);`
      },
      {
        name: 'Create title_queue indexes',
        sql: `CREATE INDEX IF NOT EXISTS idx_title_queue_campaign_id ON title_queue(campaign_id);
               CREATE INDEX IF NOT EXISTS idx_title_queue_status ON title_queue(status);
               CREATE INDEX IF NOT EXISTS idx_content_queue_title_queue_id ON content_queue(title_queue_id);`
      }
    ];
    
    for (const migration of migrations) {
      try {
        console.log(`🔄 Running: ${migration.name}`);
        await query(migration.sql);
        console.log(`✅ Completed: ${migration.name}`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`⚠️  Skipped: ${migration.name} (already exists)`);
        } else {
          console.error(`❌ Failed: ${migration.name}`, error.message);
          throw error;
        }
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

addMissingColumns();
