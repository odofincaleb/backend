import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://backend-production-8c02.up.railway.app/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  },
  // Keep-alive is handled by the browser automatically
});

// Add retry logic with exponential backoff
const retryRequest = async (config, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await api(config);
    } catch (error) {
      // Only retry on network errors or 5xx status codes
      if (i === retries - 1 || 
          (!error.response && error.code !== 'ECONNRESET') ||
          (error.response && error.response.status < 500)) {
        throw error;
      }
      
      // Wait with exponential backoff and jitter
      const delay = Math.min(1000 * Math.pow(2, i) + Math.random() * 1000, 10000);
      console.log(`Request failed, retrying in ${delay}ms... (attempt ${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          toast.error(data.message || 'Bad request');
          break;
        case 401:
          toast.error('Unauthorized. Please log in again.');
      localStorage.removeItem('token');
      window.location.href = '/login';
          break;
        case 403:
          toast.error('Access denied');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        case 503:
          toast.error('Service temporarily unavailable');
          break;
        default:
          toast.error(data.message || 'An error occurred');
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
      toast.error('Network error. Please check your connection.');
    } else {
      // Other error
      console.error('Error:', error.message);
      toast.error('An unexpected error occurred');
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => retryRequest({
    method: 'POST',
    url: '/auth/login',
    data: { email, password }
  }),
  
  register: (userData) => retryRequest({
    method: 'POST',
    url: '/auth/register',
    data: userData
  }),
  
  getProfile: () => retryRequest({
    method: 'GET',
    url: '/auth/profile'
  }),
  
  updateProfile: (userData) => retryRequest({
    method: 'PUT',
    url: '/auth/profile',
    data: userData
  })
};

// Campaigns API
export const campaignsAPI = {
  getAll: () => retryRequest({
    method: 'GET',
    url: '/campaigns'
  }),
  
  getById: (id) => retryRequest({
    method: 'GET',
    url: `/campaigns/${id}`
  }),
  
  create: (campaignData) => retryRequest({
    method: 'POST',
    url: '/campaigns',
    data: campaignData
  }),
  
  update: (id, campaignData) => retryRequest({
    method: 'PUT',
    url: `/campaigns/${id}`,
    data: campaignData
  }),
  
  delete: (id) => retryRequest({
    method: 'DELETE',
    url: `/campaigns/${id}`
  }),
  
  getContentTypes: () => retryRequest({
    method: 'GET',
    url: '/campaigns/content-types'
  })
};

// WordPress API
export const wordpressAPI = {
  getAll: () => retryRequest({
    method: 'GET',
    url: '/wordpress'
  }),
  
  create: (siteData) => retryRequest({
    method: 'POST',
    url: '/wordpress',
    data: siteData
  }),
  
  update: (id, siteData) => retryRequest({
    method: 'PUT',
    url: `/wordpress/${id}`,
    data: siteData
  }),
  
  delete: (id) => retryRequest({
    method: 'DELETE',
    url: `/wordpress/${id}`
  }),
  
  testConnection: (id) => retryRequest({
    method: 'POST',
    url: `/wordpress/${id}/test`
  })
};

// Title Queue API
export const titleQueueAPI = {
  getByCampaign: (campaignId) => retryRequest({
    method: 'GET',
    url: `/title-queue/campaign/${campaignId}`
  }),
  
  generateTitles: (campaignId, numberOfTitles) => retryRequest({
    method: 'POST',
    url: '/title-queue/generate',
    data: { campaignId, numberOfTitles }
  }),
  
  updateStatus: (id, status) => retryRequest({
    method: 'PUT',
    url: `/title-queue/${id}/status`,
    data: { status }
  }),
  
  delete: (id) => retryRequest({
    method: 'DELETE',
    url: `/title-queue/${id}`
  })
};

// License API
export const licenseAPI = {
  getStatus: () => retryRequest({
    method: 'GET',
    url: '/license/status'
  }),
  
  activate: (licenseKey) => retryRequest({
    method: 'POST',
    url: '/license/activate',
    data: { licenseKey }
  }),
  
  deactivate: () => retryRequest({
    method: 'POST',
    url: '/license/deactivate'
  })
};

// Admin API
export const adminAPI = {
  getStats: () => retryRequest({
    method: 'GET',
    url: '/admin/stats'
  }),
  
  getUsers: () => retryRequest({
    method: 'GET',
    url: '/admin/users'
  }),
  
  updateUser: (id, userData) => retryRequest({
    method: 'PUT',
    url: `/admin/users/${id}`,
    data: userData
  }),
  
  deleteUser: (id) => retryRequest({
    method: 'DELETE',
    url: `/admin/users/${id}`
  })
};

// Default export
export default api;
