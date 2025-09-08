import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await authAPI.getProfile();
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email, password: '***' });
      const response = await authAPI.login(email, password);
      console.log('Login response:', response.data);
      const { user: userData, token: newToken } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      toast.success('Welcome back!');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { user: newUser, token: newToken } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      
      toast.success('Account created successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateUser = (userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
  };

  const refreshProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

