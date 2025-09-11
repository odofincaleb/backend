import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://backend-production-8c02.up.railway.app/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth token to requests
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

// Add retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 10000;

const shouldRetry = (error) => {
  const { config, code, message } = error;
  
  // Don't retry if we've hit our limit
  if (config.__retryCount >= MAX_RETRIES) {
    return false;
  }

  // Retry on connection errors
  if (!error.response) {
    return true;
  }

  // Retry on specific error codes
  if (code === 'ECONNABORTED' || code === 'ECONNRESET' || message.includes('Network Error')) {
    return true;
  }

  // Retry on 5xx errors
  if (error.response && error.response.status >= 500) {
    return true;
  }

  return false;
};

const getRetryDelay = (retryCount) => {
  const delay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
    MAX_RETRY_DELAY
  );
  return delay + Math.random() * 1000; // Add jitter
};

// Add retry interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (!config || !shouldRetry(error)) {
      return Promise.reject(error);
    }

    // Initialize retry count
    config.__retryCount = config.__retryCount || 0;
    config.__retryCount++;

    // Calculate delay with exponential backoff and jitter
    const delay = getRetryDelay(config.__retryCount);

    // Log retry attempt
    console.log(`Retry attempt ${config.__retryCount} for ${config.url} after ${delay}ms`);

    // Show toast for retry
    toast.loading(`Connection lost. Retrying... (${config.__retryCount}/${MAX_RETRIES})`, {
      id: `retry-${config.url}`,
      duration: delay
    });

    // Wait for delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Clear retry toast
    toast.dismiss(`retry-${config.url}`);

    // Make new request
    return api(config);
  }
);

// Response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network errors
    if (!error.response) {
      console.error('Network error:', error);
      const message = error.code === 'ECONNABORTED' 
        ? 'Request timed out. Please try again.'
        : 'Network error. Please check your connection.';
      
      toast.error(message, {
        duration: 5000,
        id: `network-error-${Date.now()}`
      });
      
      return Promise.reject({
        ...error,
        message
      });
    }

    // Log error details
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });

    // Handle specific status codes
    switch (error.response.status) {
      case 400:
        const validationError = error.response.data?.details || error.response.data?.message;
        toast.error(validationError || 'Invalid data. Please check your inputs.');
        break;
      case 401:
        localStorage.removeItem('token');
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
        break;
      case 403:
        toast.error(error.response.data?.message || 'Access denied.');
        break;
      case 404:
        toast.error('Resource not found.');
        break;
      case 429:
        toast.error('Too many requests. Please try again later.');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      case 503:
        toast.error('Service temporarily unavailable.');
        break;
      default:
        toast.error('An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response;
    } catch (error) {
      console.error('Login API error:', error);
      throw error;
    }
  },
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response;
    } catch (error) {
      console.error('Register API error:', error);
      throw error;
    }
  },
  getProfile: async () => {
    try {
      const response = await api.get('/auth/me');
      return response;
    } catch (error) {
      console.error('Get profile API error:', error);
      throw error;
    }
  },
  changePassword: async (data) => {
    try {
      const response = await api.put('/auth/change-password', data);
      return response;
    } catch (error) {
      console.error('Change password API error:', error);
      throw error;
    }
  }
};

// Users API
export const usersAPI = {
  updateProfile: (data) => api.put('/users/profile', data)
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
  getContentTypes: () => api.get('/campaigns/content-types')
};

// WordPress API
export const wordpressAPI = {
  getSites: () => api.get('/wordpress'),
  addSite: (data) => api.post('/wordpress', data),
  updateSite: (id, data) => api.put(`/wordpress/${id}`, data),
  deleteSite: (id) => api.delete(`/wordpress/${id}`),
  testConnection: (id) => api.post(`/wordpress/${id}/test`)
};

// License API
export const licenseAPI = {
  activate: (key) => api.post('/license/activate', { key }),
  deactivate: () => api.post('/license/deactivate'),
  getStatus: () => api.get('/license/status')
};

// Title Queue API
export const titleQueueAPI = {
  getTitles: (campaignId) => api.get(`/title-queue/${campaignId}`),
  approveTitle: (id) => api.post(`/title-queue/${id}/approve`),
  rejectTitle: (id) => api.post(`/title-queue/${id}/reject`)
};

export default api;