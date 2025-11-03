// frontend/lib/axiosWithFallback.js

import axios from 'axios';

// The base URL for our external API is read from the environment variable
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const instance = axios.create({
  baseURL: API_BASE,
  withCredentials: true, 
});

// Enhanced token interceptor with better error handling
instance.interceptors.request.use(
  async (config) => {
    try {
      // Prefer same-origin during client-side to avoid prod env mismatch.
      const tokenUrl = typeof window !== 'undefined'
        ? '/api/auth/token'
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/token`;

      const response = await fetch(tokenUrl, { 
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const { accessToken } = await response.json();
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      } else if (response.status === 401) {
        // If token fetch fails with 401, the user might need to re-login
        console.warn('Token fetch failed with 401 - user might need to re-login');
        // Don't redirect here - let the component handle it
      }

      // If sending FormData, ensure we don't set Content-Type so browser adds boundary
      if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if (config.headers && 'Content-Type' in config.headers) {
          delete config.headers['Content-Type'];
        }
      }
    } catch (error) {
      console.error('Failed to get access token:', error);
      // Don't block the request if token fetch fails - continue without token
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('API request failed with 401 - authentication required');
      // You can add global 401 handling here if needed
    }
    return Promise.reject(error);
  }
);

export default instance;