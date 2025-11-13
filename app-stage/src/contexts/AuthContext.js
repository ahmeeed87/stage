import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiService from '../utils/api';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiService] = useState(() => new ApiService());

  // Check if user is already authenticated on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      // Verify token by getting user profile
      const profile = await apiService.getProfile();
      setUser(profile);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Auth check failed:', err);
      // Clear invalid tokens
      apiService.clearAuth();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.login(credentials);
      
      // Set authentication tokens
      apiService.setAuthToken(response.token, response.refreshToken);
      
      // Get user profile
      const profile = await apiService.getProfile();
      
      setUser(profile);
      setIsAuthenticated(true);
      
      return { success: true, user: profile };
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.register(userData);
      
      // Set authentication tokens
      apiService.setAuthToken(response.token, response.refreshToken);
      
      // Get user profile
      const profile = await apiService.getProfile();
      
      setUser(profile);
      setIsAuthenticated(true);
      
      return { success: true, user: profile };
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear local state regardless of API call success
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    }
  };



  const refreshUserProfile = async () => {
    try {
      const profile = await apiService.getProfile();
      setUser(profile);
      return profile;
    } catch (err) {
      console.error('Profile refresh failed:', err);
      // If profile refresh fails, user might be logged out
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        logout();
      }
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    apiService,
    login,
    register,
    logout,
    refreshUserProfile,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
