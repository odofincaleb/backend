// Script to check campaign limits for trial users
const axios = require('axios');

const API_BASE_URL = 'https://backend-production-8c02.up.railway.app/api';

async function checkCampaignLimits() {
  try {
    console.log('🔍 Checking campaign limits...\n');
    
    // You'll need to replace this with your actual token
    const token = 'YOUR_JWT_TOKEN_HERE';
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Check subscription status
    console.log('📊 Subscription Status:');
    const subscriptionResponse = await axios.get(`${API_BASE_URL}/users/subscription-status`, { headers });
    const { subscription, usage } = subscriptionResponse.data;
    
    console.log(`   Tier: ${subscription.tier}`);
    console.log(`   Max Campaigns: ${subscription.maxCampaigns}`);
    console.log(`   Active Campaigns: ${usage.activeCampaigns}`);
    console.log(`   Posts Published: ${usage.totalPostsPublished}`);
    console.log(`   Posts Limit: ${usage.postsLimit || 'Unlimited'}`);
    console.log(`   Posts Remaining: ${usage.postsRemaining || 'Unlimited'}\n`);

    // Check existing campaigns
    console.log('📋 Existing Campaigns:');
    const campaignsResponse = await axios.get(`${API_BASE_URL}/campaigns`, { headers });
    const campaigns = campaignsResponse.data.campaigns;
    
    if (campaigns.length === 0) {
      console.log('   No campaigns found.');
    } else {
      campaigns.forEach((campaign, index) => {
        console.log(`   ${index + 1}. ${campaign.topic} (${campaign.status})`);
      });
    }

    console.log('\n🎯 Analysis:');
    if (subscription.tier === 'trial') {
      if (usage.activeCampaigns >= subscription.maxCampaigns) {
        console.log('❌ TRIAL LIMIT REACHED: You have reached your trial limit of 1 active campaign.');
        console.log('💡 Solutions:');
        console.log('   1. Delete an existing campaign to create a new one');
        console.log('   2. Upgrade to a paid plan for more campaigns');
        console.log('   3. Pause an existing campaign instead of deleting it');
      } else {
        console.log('✅ You can create a new campaign (trial limit not reached)');
      }
    } else {
      console.log('✅ Paid user - no campaign limits');
    }

  } catch (error) {
    console.error('❌ Error checking limits:', error.response?.data || error.message);
  }
}

checkCampaignLimits();
