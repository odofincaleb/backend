import axios from 'axios';

// Track connection status
let isConnected = true;
let lastCheckTime = 0;
const CHECK_INTERVAL = 30000; // 30 seconds

// Create a separate instance for health checks
const healthCheck = axios.create({
  timeout: 5000, // Short timeout for health checks
});

// Check connection to Railway backend
export const checkConnection = async () => {
  const now = Date.now();
  
  // Only check every 30 seconds
  if (now - lastCheckTime < CHECK_INTERVAL) {
    return isConnected;
  }

  try {
    // Try production URL first
    await healthCheck.get('https://backend-production-8c02.up.railway.app/health');
    isConnected = true;
  } catch (error) {
    console.warn('Railway backend connection failed:', error.message);
    isConnected = false;
  }

  lastCheckTime = now;
  return isConnected;
};

// Get current connection status
export const getConnectionStatus = () => isConnected;

// Subscribe to connection changes
const subscribers = new Set();

export const subscribeToConnection = (callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

// Start periodic connection checks
setInterval(async () => {
  const prevStatus = isConnected;
  const newStatus = await checkConnection();
  
  if (prevStatus !== newStatus) {
    subscribers.forEach(callback => callback(newStatus));
  }
}, CHECK_INTERVAL);
