import axios from 'axios';

let isOnline = true;
let lastCheckTime = 0;
let checkInProgress = false;
const CHECK_INTERVAL = 5000; // Check every 5 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Get base URL without /api suffix
const baseUrl = (process.env.REACT_APP_API_URL || 'https://backend-4wma.onrender.com/api')
  .replace(/\/api\/?$/, '');

// Create a separate axios instance for health checks
const healthCheck = axios.create({
  baseURL: baseUrl,
  timeout: 3000,
  validateStatus: (status) => status === 200 // Only accept 200 OK
});

export const checkConnection = async () => {
  const now = Date.now();
  if (now - lastCheckTime < CHECK_INTERVAL && isOnline) {
    return isOnline; // Return cached status if recently checked and online
  }

  // Prevent multiple simultaneous checks
  if (checkInProgress) {
    return isOnline;
  }

  checkInProgress = true;

  try {
    // Try up to MAX_RETRIES times with exponential backoff
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        await healthCheck.get('/health');
        isOnline = true;
        break; // Success, exit retry loop
      } catch (error) {
        console.log(`Health check attempt ${i + 1} failed:`, error.message);
        
        if (i === MAX_RETRIES - 1) {
          // Last attempt failed
          isOnline = false;
          throw error;
        }
        
        // Wait with exponential backoff before retrying
        const delay = RETRY_DELAY * Math.pow(2, i);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } catch (error) {
    console.error('Connection check failed after retries:', error.message);
    isOnline = false;
  } finally {
    lastCheckTime = now;
    checkInProgress = false;
  }

  return isOnline;
};