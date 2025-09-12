const axios = require('axios');

async function debugLogin() {
  try {
    console.log('🔍 Debugging login process...');
    
    // First, let's check the health
    console.log('\n1. Checking health...');
    const healthResponse = await axios.get('https://backend-production-8c02.up.railway.app/api/auth/health-check');
    console.log('✅ Health check:', healthResponse.data);
    
    // Now try to login with detailed error handling
    console.log('\n2. Attempting login...');
    const loginResponse = await axios.post('https://backend-production-8c02.up.railway.app/api/auth/login', {
      email: 'test@example.com',
      password: 'Password123'
    }, {
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500; // Accept any status less than 500
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', loginResponse.data);
    
  } catch (error) {
    console.error('❌ Login failed:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('Headers:', error.response?.headers);
    console.error('Full Error:', error.message);
  }
}

debugLogin();
