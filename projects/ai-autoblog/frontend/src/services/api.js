import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://backend-production-8c02.up.railway.app/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});


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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
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

