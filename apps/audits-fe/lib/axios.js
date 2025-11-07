// frontend/lib/axios.js

import axios from 'axios';
// Import the auth store so we can read the iframe token outside React
// (Zustand allows direct store access via useAuthStore.getState()).
import useAuthStore from '@/store/authStore';

// The base URL for our external API is read from the environment variable
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const instance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Auth0 token interceptor - adds access token to all API requests
instance.interceptors.request.use(
  async (config) => {
    try {
      const isBrowser = typeof window !== 'undefined';
      const isIframe = isBrowser && window.self !== window.top;

      // 1. Iframe mode: use token delivered via postMessage from shell
      if (isIframe) {
        const iframeToken = useAuthStore.getState().iframeToken;
        if (iframeToken) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${iframeToken}`;
          if (process.env.NODE_ENV !== 'production') {
            // Light debug – safe in dev only
            console.log('[axios] Using iframe token');
          }
          // Skip calling /api/auth/token entirely in iframe to avoid 500 & third‑party cookie issues
          return finalizeFormDataHeaders(config);
        }
      }

      // 2. Standalone mode: fetch session-bound token from our Next.js route
      const tokenUrl = isBrowser
        ? '/api/auth/token'
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/token`;

      const response = await fetch(tokenUrl, { credentials: 'include' });
      if (response.ok) {
        const { accessToken } = await response.json();
        if (accessToken) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      } else if (process.env.NODE_ENV !== 'production') {
        console.warn('[axios] /api/auth/token returned', response.status);
      }

      return finalizeFormDataHeaders(config);
    } catch (error) {
      console.error('[axios] Failed to set Authorization header:', error);
      return finalizeFormDataHeaders(config); // continue without token
    }
  },
  (error) => Promise.reject(error)
);

function finalizeFormDataHeaders(config) {
  // If sending FormData, ensure we don't set Content-Type so browser adds boundary automatically
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers && 'Content-Type' in config.headers) {
      delete config.headers['Content-Type'];
    }
  }
  return config;
}

export default instance;