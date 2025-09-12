const axios = require('axios');

async function testDbQuery() {
  try {
    console.log('🔍 Testing database query...');
    
    const response = await axios.get('https://backend-production-8c02.up.railway.app/api/auth/test-db-query');
    
    console.log('✅ Database query successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Database query failed:', error.response?.data || error.message);
  }
}

testDbQuery();
