import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://backend-production-8c02.up.railway.app/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=30, max=100'
  },
  // Enable keep-alive
  httpAgent: new axios.HttpAgent({ keepAlive: true }),
  httpsAgent: new axios.HttpsAgent({ keepAlive: true })
});

// Rest of the file remains the same...