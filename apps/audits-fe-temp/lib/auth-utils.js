// frontend/lib/auth-utils.js

/**
 * Utility functions for handling authentication in components
 * This provides fallback approaches when token-based auth fails
 */

/**
 * Make an authenticated request with enhanced token handling
 * This tries to get a token first, then falls back to different approaches
 */
export const makeSessionBasedRequest = async (method, url, data = null) => {
  const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}${url}`;
  
  // First, try to get an access token
  let accessToken = null;
  try {
    console.log('Attempting to get access token for session-based request...');
    const tokenResponse = await fetch('/api/auth/token', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      accessToken = tokenData.accessToken;
      console.log('Access token obtained for session-based request');
    } else {
      console.warn('Could not get access token, status:', tokenResponse.status);
    }
  } catch (tokenError) {
    console.warn('Token fetch failed in session-based request:', tokenError.message);
  }
  
  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Add Authorization header if we have a token
  if (accessToken) {
    headers['Authorization'] = accessToken.startsWith('Bearer ') 
      ? accessToken 
      : `Bearer ${accessToken}`;
    console.log('Added Authorization header to session-based request');
  } else {
    console.warn('No access token available for session-based request');
  }
  
  const config = {
    method: method.toUpperCase(),
    headers,
    credentials: 'include', // Include cookies as additional auth
  };

  if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
    config.body = JSON.stringify(data);
  }
  
  try {
    console.log(`Making session-based ${method} request to ${fullUrl}`);
    const response = await fetch(fullUrl, config);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Session-based request got 401 - authentication failed');
        throw new Error('Authentication required - please log in again');
      }
      const errorData = await response.text();
      console.error(`Session-based request failed: ${response.status}`, errorData);
      throw new Error(`Request failed: ${response.status} - ${errorData}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      console.log('Session-based request successful');
      return result;
    }
    
    const result = await response.text();
    console.log('Session-based request successful (text response)');
    return result;
  } catch (error) {
    console.error(`Session-based ${method} request failed:`, error);
    throw error;
  }
};

/**
 * Check if user has a valid session by testing the /api/auth/me endpoint
 */
export const checkUserSession = async () => {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    console.error('Session check failed:', error);
    return null;
  }
};

/**
 * Redirect to login with current page as return URL
 */
export const redirectToLogin = () => {
  const currentPath = window.location.pathname;
  const returnUrl = encodeURIComponent(currentPath);
  window.location.href = `/api/auth/login?returnTo=${returnUrl}`;
};