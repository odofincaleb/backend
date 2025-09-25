#!/usr/bin/env node

/**
 * Manual script to fix campaign deletion issues
 * Run this script to fix foreign key constraints that prevent campaign deletion
 */

const { Pool } = require('pg');
const logger = require('./src/utils/logger');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixCampaignDeleteConstraints() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing campaign deletion constraints...');
    
    // Fix logs table foreign key constraint
    try {
      console.log('📝 Fixing logs table foreign key...');
      await client.query(`
        ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_campaign_id_fkey;
      `);
      
      await client.query(`
        ALTER TABLE logs 
        ADD CONSTRAINT logs_campaign_id_fkey 
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
      `);
      console.log('✅ Fixed logs table foreign key');
    } catch (error) {
      console.log('⚠️ Could not fix logs foreign key:', error.message);
    }
    
    // Fix content_queue table foreign key constraint
    try {
      console.log('📝 Fixing content_queue table foreign key...');
      await client.query(`
        ALTER TABLE content_queue DROP CONSTRAINT IF EXISTS content_queue_campaign_id_fkey;
      `);
      
      await client.query(`
        ALTER TABLE content_queue 
        ADD CONSTRAINT content_queue_campaign_id_fkey 
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
      `);
      console.log('✅ Fixed content_queue table foreign key');
    } catch (error) {
      console.log('⚠️ Could not fix content_queue foreign key:', error.message);
    }
    
    // Fix title_queue table foreign key constraint
    try {
      console.log('📝 Fixing title_queue table foreign key...');
      await client.query(`
        ALTER TABLE title_queue DROP CONSTRAINT IF EXISTS title_queue_campaign_id_fkey;
      `);
      
      await client.query(`
        ALTER TABLE title_queue 
        ADD CONSTRAINT title_queue_campaign_id_fkey 
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
      `);
      console.log('✅ Fixed title_queue table foreign key');
    } catch (error) {
      console.log('⚠️ Could not fix title_queue foreign key:', error.message);
    }
    
    console.log('🎉 Campaign deletion constraints fixed successfully!');
    console.log('You can now delete campaigns without foreign key constraint errors.');
    
  } catch (error) {
    console.error('❌ Error fixing constraints:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixCampaignDeleteConstraints();
