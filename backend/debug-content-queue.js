require('dotenv').config();
const { query } = require('./src/database/connection');

async function debugContentQueue() {
  try {
    console.log('🔍 Debugging content_queue table...\n');
    
    // Get user ID
    const userResult = await query(`
      SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No user found');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`👤 User ID: ${userId}`);
    
    // Get all campaigns for this user
    const campaigns = await query(`
      SELECT id, topic FROM campaigns WHERE user_id = $1
    `, [userId]);
    
    console.log(`\n📊 Found ${campaigns.rows.length} campaigns:`);
    campaigns.rows.forEach(c => {
      console.log(`- ${c.topic} (ID: ${c.id})`);
    });
    
    // Check content_queue for each campaign
    for (const campaign of campaigns.rows) {
      console.log(`\n🔍 Content Queue for: ${campaign.topic}`);
      
      const contentResult = await query(`
        SELECT id, title, status, created_at, completed_at
        FROM content_queue 
        WHERE campaign_id = $1
        ORDER BY created_at DESC
      `, [campaign.id]);
      
      console.log(`   Total records: ${contentResult.rows.length}`);
      
      const statusCounts = {};
      contentResult.rows.forEach(row => {
        statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
      });
      
      console.log(`   Status breakdown:`, statusCounts);
      
      if (contentResult.rows.length > 0) {
        console.log(`   Recent records:`);
        contentResult.rows.slice(0, 5).forEach(row => {
          console.log(`   - ${row.title} (${row.status}) - ${row.created_at}`);
        });
      }
    }
    
    // Check for any orphaned records
    console.log(`\n🔍 Checking for orphaned content_queue records...`);
    const orphanedResult = await query(`
      SELECT COUNT(*) as count
      FROM content_queue cq
      LEFT JOIN campaigns c ON cq.campaign_id = c.id
      WHERE c.id IS NULL
    `);
    
    console.log(`   Orphaned records: ${orphanedResult.rows[0].count}`);
    
    // Check total content_queue records
    const totalResult = await query(`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM content_queue
    `);
    
    console.log(`\n📈 Total content_queue: ${totalResult.rows[0].total} records`);
    console.log(`   Completed: ${totalResult.rows[0].completed} records`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugContentQueue();
