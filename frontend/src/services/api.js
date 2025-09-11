import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://backend-production-8c02.up.railway.app/api',
  timeout: 60000, // 60 seconds
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
api.defaults.validateStatus = function (status) {
  // Consider only 5xx errors and network errors as failures for retry
  return status < 500;
};

api.defaults.retry = 3; // Number of retries
api.defaults.retryDelay = (retryCount) => {
  return 1000 * Math.pow(2, retryCount); // Exponential backoff
};

api.defaults.retryCondition = (error) => {
  // Retry on network errors and 5xx errors
  return (
    !error.response ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ECONNRESET' ||
    (error.response && error.response.status >= 500)
  );
};

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