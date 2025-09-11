import axios from 'axios';
import { checkConnection } from './connectionCheck';
import toast from 'react-hot-toast';

// Create axios instance with retry configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://backend-production-8c02.up.railway.app/api',
  timeout: 60000, // 60 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  // Add retry configuration
  validateStatus: function (status) {
    // Consider only 5xx errors and network errors as failures for retry
    return status < 500;
  },
  retry: 3, // Number of retries
  retryDelay: (retryCount) => {
    return 1000 * Math.pow(2, retryCount); // Exponential backoff
  },
  retryCondition: (error) => {
    // Retry on network errors and 5xx errors
    return (
      !error.response || 
      error.code === 'ECONNABORTED' || 
      error.code === 'ECONNRESET' ||
      (error.response && error.response.status >= 500)
    );
  }
});

// Add retry interceptor
api.interceptors.response.use(undefined, async (err) => {
  const { config } = err;
  if (!config || !config.retry) {
    return Promise.reject(err);
  }

  // Set retry count
  config.__retryCount = config.__retryCount || 0;
  
  // Max retries
  if (config.__retryCount >= config.retry) {
    return Promise.reject(err);
  }

  // Check if we should retry
  if (!config.retryCondition(err)) {
    return Promise.reject(err);
  }

  // Increase retry count
  config.__retryCount += 1;

  // Log retry attempt
  console.log(`Retry attempt ${config.__retryCount} for:`, {
    url: config.url,
    method: config.method,
    error: err.message
  });

  // Create new promise to handle backoff
  const backoff = new Promise((resolve) => {
    const delay = config.retryDelay(config.__retryCount);
    setTimeout(() => {
      console.log(`Retrying request after ${delay}ms:`, config.url);
      resolve();
    }, delay);
  });

  // Return promise to retry request
  await backoff;
  return api(config);
});


// Request interceptor to add auth token and check connection
api.interceptors.request.use(
  async (config) => {
    // Check connection before making request
    const isConnected = await checkConnection();
    if (!isConnected) {
      // Show toast only once per disconnection
      if (!window.__shownDisconnectToast) {
        toast.error('Connection to server lost. Retrying...', {
          id: 'connection-lost',
          duration: 5000
        });
        window.__shownDisconnectToast = true;
      }
      
      // Retry the request when connection is restored
      return new Promise((resolve) => {
        const checkAndRetry = async () => {
          const newStatus = await checkConnection();
          if (newStatus) {
            window.__shownDisconnectToast = false;
            toast.success('Connection restored!', {
              id: 'connection-restored',
              duration: 3000
            });
            resolve(config);
          } else {
            setTimeout(checkAndRetry, 5000); // Check every 5 seconds
          }
        };
        checkAndRetry();
      });
    }

    // Add auth token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject({
        ...error,
        message: 'Network error. Please check your connection and try again.'
      });
    }

    // Log all error details for debugging
    console.error('API Error:', {
      status: error.response.status,
      data: error.response.data,
      config: {
        url: error.config.url,
        method: error.config.method,
        data: error.config.data
      }
    });

    // Handle specific status codes
    switch (error.response.status) {
      case 400:
        // Bad request - validation error
        const validationError = error.response.data?.details || error.response.data?.message;
        return Promise.reject({
          ...error,
          message: validationError || 'Invalid data. Please check your inputs and try again.'
        });
      case 401:
        // Token expired or invalid
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 403:
        // Trial limit or permission error
        const trialError = error.response.data?.message;
        return Promise.reject({
          ...error,
          message: trialError || 'Access denied. Please check your permissions.'
        });
      case 500:
        // Server error
        const serverError = error.response.data?.details || error.response.data?.message;
        return Promise.reject({
          ...error,
          message: serverError || 'Server error. Please try again in a few moments.'
        });
      case 503:
        // Service unavailable
        return Promise.reject({
          ...error,
          message: 'Service temporarily unavailable. Please try again later.'
        });
      default:
        // Unknown error
        const errorMessage = error.response.data?.message || error.message;
        return Promise.reject({
          ...error,
          message: errorMessage || 'An unexpected error occurred. Please try again.'
        });
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  refreshToken: () => api.post('/auth/refresh'),
};

// Users API
export const usersAPI = {
  updateProfile: (data) => api.put('/users/profile', data),
  addApiKeys: (data) => api.post('/users/api-keys', data),
  getApiKeys: () => api.get('/users/api-keys'),
  deleteApiKeys: () => api.delete('/users/api-keys'),
};

// Campaigns API
export const campaignsAPI = {
  getCampaigns: () => api.get('/campaigns'),
  getCampaign: (id) => api.get(`/campaigns/${id}`),
  createCampaign: (data) => api.post('/campaigns', data),
  updateCampaign: (id, data) => api.put(`/campaigns/${id}`, data),
  deleteCampaign: (id) => api.delete(`/campaigns/${id}`),
  startCampaign: (id) => api.post(`/campaigns/${id}/start`),
  stopCampaign: (id) => api.post(`/campaigns/${id}/stop`),
  getCampaignStats: (id) => api.get(`/campaigns/${id}/stats`),
  getContentTypes: () => api.get('/campaigns/content-types'),
};

// WordPress API
export const wordpressAPI = {
  getSites: () => api.get('/wordpress/sites'),
  addSite: (data) => api.post('/wordpress/sites', data),
  updateSite: (id, data) => api.put(`/wordpress/sites/${id}`, data),
  deleteSite: (id) => api.delete(`/wordpress/sites/${id}`),
  testConnection: (id) => api.post(`/wordpress/sites/${id}/test`),
};

// License API
export const licenseAPI = {
  activateLicense: (licenseKey) => api.post('/license/activate', { licenseKey }),
  getLicenseStatus: () => api.get('/license/status'),
  getSubscriptionStatus: () => api.get('/subscription/status'),
};

// Admin API
export const adminAPI = {
  generateLicenseKey: (data) => api.post('/admin/license-keys', data),
  getLicenseKeys: () => api.get('/admin/license-keys'),
  updateLicenseKey: (id, data) => api.put(`/admin/license-keys/${id}`, data),
  deleteLicenseKey: (id) => api.delete(`/admin/license-keys/${id}`),
  getUsers: () => api.get('/admin/users'),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getSystemStats: () => api.get('/admin/stats'),
};

export default api;

