import axios from 'axios';

let isOnline = true;
let lastCheckTime = 0;
let checkInProgress = false;
const CHECK_INTERVAL = 5000; // Check every 5 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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
        await axios.get(
          process.env.REACT_APP_API_URL || 'https://backend-production-8c02.up.railway.app/api' + '/health',
          { 
            timeout: 3000,
            validateStatus: (status) => status === 200 // Only accept 200 OK
          }
        );
        isOnline = true;
        break; // Success, exit retry loop
      } catch (error) {
        if (i === MAX_RETRIES - 1) {
          // Last attempt failed
          isOnline = false;
          throw error;
        }
        // Wait with exponential backoff before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i)));
      }
    }
  } catch (error) {
    console.error('Connection check failed:', error.message);
    isOnline = false;
  } finally {
    lastCheckTime = now;
    checkInProgress = false;
  }

  return isOnline;
};