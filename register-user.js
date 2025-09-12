const axios = require('axios');

async function registerUser() {
  try {
    console.log('Registering new user...');
    
    const response = await axios.post('https://backend-production-8c02.up.railway.app/api/auth/register', {
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User'
    });
    
    console.log('✅ User registered successfully!');
    console.log('Response:', response.data);
    
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message === 'Email already registered') {
      console.log('✅ User already exists, trying to login...');
      
      // Try to login
      try {
        const loginResponse = await axios.post('https://backend-production-8c02.up.railway.app/api/auth/login', {
          email: 'test@example.com',
          password: 'Password123'
        });
        
        console.log('✅ Login successful!');
        console.log('Login response:', loginResponse.data);
      } catch (loginError) {
        console.error('❌ Login failed:', loginError.response?.data || loginError.message);
      }
    } else {
      console.error('❌ Registration error:', error.response?.data || error.message);
    }
  }
}

registerUser();
