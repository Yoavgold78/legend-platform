// frontend/lib/axios.js

import axios from 'axios';

// The base URL for our external API is read from the environment variable
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const instance = axios.create({
  baseURL: API_BASE,
  // Do not set a global Content-Type; Axios will infer per request
  // The 'withCredentials' property is not typically needed for a Bearer token flow with Auth0.
  // It's often used for cookie-based authentication. Removing it can prevent potential issues,
  // but I'm leaving it as is, as per your instruction not to change unrelated logic.
  withCredentials: true, 
});

// Auth0 token interceptor - adds access token to all API requests
instance.interceptors.request.use(
  async (config) => {
    try {
      // Prefer same-origin during client-side to avoid prod env mismatch.
      // Fall back to env-based absolute URL only when not in the browser.
      const tokenUrl = typeof window !== 'undefined'
        ? '/api/auth/token'
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/token`;

      const response = await fetch(tokenUrl, { credentials: 'include' });

      if (response.ok) {
        const { accessToken } = await response.json();
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      }

      // If sending FormData, ensure we don't set Content-Type so browser adds boundary
      if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if (config.headers && 'Content-Type' in config.headers) {
          delete config.headers['Content-Type'];
        }
      }
    } catch (error) {
      console.error('Failed to get access token:', error);
      // Don't block the request if token fetch fails
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;