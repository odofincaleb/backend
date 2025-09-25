require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testContentGeneration() {
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

    if (tableCheck.rows[0].exists) {
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

    // Check if there are any campaigns
    const campaigns = await client.query('SELECT id, topic FROM campaigns LIMIT 3');
    console.log('🎯 Campaigns found:', campaigns.rows.length);
    campaigns.rows.forEach(campaign => {
      console.log(`  - ${campaign.id}: ${campaign.topic}`);
    });

    // Check if there are any approved titles
    const titles = await client.query(`
      SELECT tq.id, tq.title, tq.status, c.topic 
      FROM title_queue tq 
      JOIN campaigns c ON tq.campaign_id = c.id 
      WHERE tq.status = 'approved' 
      LIMIT 3
    `);
    console.log('📝 Approved titles found:', titles.rows.length);
    titles.rows.forEach(title => {
      console.log(`  - ${title.id}: ${title.title} (${title.status})`);
    });

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

testContentGeneration();
