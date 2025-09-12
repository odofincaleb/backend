const axios = require('axios');

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    const response = await axios.post('https://backend-production-8c02.up.railway.app/api/auth/create-test-user', {});
    
    console.log('✅ Test user created successfully!');
    console.log('Response:', response.data);
    
    // Now try to login
    console.log('\n🔐 Testing login...');
    const loginResponse = await axios.post('https://backend-production-8c02.up.railway.app/api/auth/login', {
      email: 'test@example.com',
      password: 'Password123'
    });
    
    console.log('✅ Login successful!');
    console.log('Login response:', loginResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

createTestUser();
