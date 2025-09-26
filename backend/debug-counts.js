require('dotenv').config();
const { query } = require('./src/database/connection');

async function debugCounts() {
  try {
    console.log('🔍 Debugging title and content counts...\n');
    
    // Get all campaigns for the user
    const campaigns = await query(`
      SELECT id, topic, user_id 
      FROM campaigns 
      WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1)
    `);
    
    console.log(`Found ${campaigns.rows.length} campaigns:`);
    campaigns.rows.forEach(c => {
      console.log(`- Campaign: ${c.topic} (ID: ${c.id})`);
    });
    
    // Check title_queue counts per campaign
    for (const campaign of campaigns.rows) {
      const titleCount = await query(`
        SELECT COUNT(*) as total, 
               COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
        FROM title_queue 
        WHERE campaign_id = $1
      `, [campaign.id]);
      
      console.log(`\n📊 Campaign: ${campaign.topic}`);
      console.log(`   Total titles: ${titleCount.rows[0].total}`);
      console.log(`   Approved titles: ${titleCount.rows[0].approved}`);
    }
    
    // Check content_queue counts per campaign
    for (const campaign of campaigns.rows) {
      const contentCount = await query(`
        SELECT COUNT(*) as total, 
               COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM content_queue 
        WHERE campaign_id = $1
      `, [campaign.id]);
      
      console.log(`\n📝 Campaign: ${campaign.topic}`);
      console.log(`   Total content: ${contentCount.rows[0].total}`);
      console.log(`   Completed content: ${contentCount.rows[0].completed}`);
    }
    
    // Check the campaigns query result
    console.log('\n🔍 Testing campaigns query...');
    const campaignResult = await query(`
      SELECT c.id, c.topic,
             COALESCE((SELECT COUNT(*) FROM content_queue cq WHERE cq.campaign_id = c.id AND cq.status = 'completed'), 0) as posts_published,
             COALESCE((SELECT COUNT(*) FROM title_queue tq WHERE tq.campaign_id = c.id), 0) as titles_in_queue,
             COALESCE((SELECT COUNT(*) FROM title_queue tq WHERE tq.campaign_id = c.id AND tq.status = 'approved'), 0) as approved_titles
      FROM campaigns c
      WHERE c.user_id = (SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1)
    `);
    
    console.log('\n📈 Campaigns query results:');
    campaignResult.rows.forEach(c => {
      console.log(`- ${c.topic}: ${c.posts_published} posts, ${c.titles_in_queue} titles, ${c.approved_titles} approved`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugCounts();
