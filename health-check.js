const axios = require('axios');

async function healthCheck() {
  try {
    console.log('🔍 Running health check...');
    
    const response = await axios.get('https://backend-production-8c02.up.railway.app/api/auth/health-check');
    
    console.log('✅ Health check successful!');
    console.log('📊 Results:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Health check failed:', error.response?.data || error.message);
  }
}

healthCheck();
