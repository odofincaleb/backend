require('dotenv').config();
const { query } = require('./src/database/connection');

async function cleanupContentQueue() {
  try {
    console.log('🧹 Cleaning up content_queue table...\n');
    
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
    
    // Get campaigns for this user
    const campaigns = await query(`
      SELECT id, topic FROM campaigns WHERE user_id = $1
    `, [userId]);
    
    console.log(`📊 Found ${campaigns.rows.length} campaigns`);
    
    // Check current content_queue counts
    for (const campaign of campaigns.rows) {
      const beforeCount = await query(`
        SELECT COUNT(*) as count
        FROM content_queue 
        WHERE campaign_id = $1
      `, [campaign.id]);
      
      console.log(`\n🔍 Campaign: ${campaign.topic}`);
      console.log(`   Before cleanup: ${beforeCount.rows[0].count} records`);
      
      // Delete duplicate or test records (keep only the most recent ones)
      // This will keep only the latest 10 records per campaign
      const deleteResult = await query(`
        DELETE FROM content_queue 
        WHERE campaign_id = $1 
        AND id NOT IN (
          SELECT id FROM (
            SELECT id 
            FROM content_queue 
            WHERE campaign_id = $1 
            ORDER BY created_at DESC 
            LIMIT 10
          ) as keep_records
        )
      `, [campaign.id]);
      
      const afterCount = await query(`
        SELECT COUNT(*) as count
        FROM content_queue 
        WHERE campaign_id = $1
      `, [campaign.id]);
      
      console.log(`   After cleanup: ${afterCount.rows[0].count} records`);
      console.log(`   Deleted: ${deleteResult.rowCount} records`);
    }
    
    // Clean up any orphaned records
    const orphanedResult = await query(`
      DELETE FROM content_queue cq
      WHERE NOT EXISTS (
        SELECT 1 FROM campaigns c WHERE c.id = cq.campaign_id
      )
    `);
    
    console.log(`\n🗑️ Deleted ${orphanedResult.rowCount} orphaned records`);
    
    // Show final counts
    const finalCounts = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM content_queue cq
      JOIN campaigns c ON cq.campaign_id = c.id
      WHERE c.user_id = $1
    `, [userId]);
    
    console.log(`\n✅ Final counts:`);
    console.log(`   Total content records: ${finalCounts.rows[0].total}`);
    console.log(`   Completed records: ${finalCounts.rows[0].completed}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

cleanupContentQueue();
