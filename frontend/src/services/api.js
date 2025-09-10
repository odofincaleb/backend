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
    // Consider only 5xx errors as failures for retry
    return status < 500;
  },
});

// Add retry interceptor
api.interceptors.response.use(undefined, async (err) => {
  const { config, message } = err;
  if (!config || !config.retry) {
    return Promise.reject(err);
  }

  // Set retry count
  config.__retryCount = config.__retryCount || 0;
  
  // Max retries (3 attempts total)
  if (config.__retryCount >= 2) {
    return Promise.reject(err);
  }

  // Increase retry count
  config.__retryCount += 1;

  // Create new promise to handle backoff
  const backoff = new Promise((resolve) => {
    setTimeout(() => {
      console.log('Retrying request:', config.url);
      resolve();
    }, 1000 * Math.pow(2, config.__retryCount)); // Exponential backoff
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

    // Handle specific status codes
    switch (error.response.status) {
      case 401:
        // Token expired or invalid
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 500:
        console.error('Server error:', error.response.data);
        return Promise.reject({
          ...error,
          message: 'Server error. Please try again in a few moments.'
        });
      case 503:
        console.error('Service unavailable:', error.response.data);
        return Promise.reject({
          ...error,
          message: 'Service temporarily unavailable. Please try again later.'
        });
      default:
        console.error('API error:', error.response.data);
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

