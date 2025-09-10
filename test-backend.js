const axios = require('axios');

async function testBackend() {
  console.log('🧪 Testing Railway Backend...');
  
  try {
    // Test 1: Health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get('https://backend-production-8c02.up.railway.app/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test 2: Login
    console.log('\n2. Testing login...');
    const loginResponse = await axios.post('https://backend-production-8c02.up.railway.app/api/auth/login', {
      email: 'test@example.com',
      password: 'Password123'
    });
    console.log('✅ Login successful:', loginResponse.data.message);
    
    const token = loginResponse.data.token;
    
    // Test 3: Get campaigns with token
    console.log('\n3. Testing campaigns endpoint...');
    const campaignsResponse = await axios.get('https://backend-production-8c02.up.railway.app/api/campaigns', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    console.log('✅ Campaigns response:', campaignsResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testBackend();
