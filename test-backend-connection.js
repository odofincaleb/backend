const axios = require('axios');

async function testBackend() {
  try {
    console.log('Testing backend connection...');
    
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get('https://backend-production-8c02.up.railway.app/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test login endpoint
    console.log('\n2. Testing login endpoint...');
    try {
      const loginResponse = await axios.post('https://backend-production-8c02.up.railway.app/api/auth/login', {
        email: 'test@example.com',
        password: 'Password123'
      });
      console.log('✅ Login successful:', loginResponse.data);
    } catch (loginError) {
      console.log('❌ Login failed:', loginError.response?.data || loginError.message);
    }
    
    // Test campaigns endpoint
    console.log('\n3. Testing campaigns endpoint...');
    try {
      const campaignsResponse = await axios.get('https://backend-production-8c02.up.railway.app/api/campaigns');
      console.log('✅ Campaigns endpoint working:', campaignsResponse.data);
    } catch (campaignsError) {
      console.log('❌ Campaigns endpoint failed:', campaignsError.response?.data || campaignsError.message);
    }
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
  }
}

testBackend();
