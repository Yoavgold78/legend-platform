// Enhanced user management API with better error handling
import { makeSessionBasedRequest } from '../auth-utils';

// Try Auth0 token first, fallback to session-based auth
const makeUserRequest = async (method, url, data = null) => {
  console.log(`Starting user request: ${method} ${url}`);
  
  try {
    // First try the enhanced auth0-api approach
    console.log('Trying token-based authentication...');
    
    // Import the makeAuthenticatedRequest function
    const { default: authModule } = await import('./auth0-api.js');
    
    // Since auth0-api.js doesn't export a default with makeAuthenticatedRequest, 
    // let's try to use the function directly
    const getAccessToken = async () => {
      const tokenResponse = await fetch('/api/auth/token', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!tokenResponse.ok) {
        throw new Error(`Token request failed: ${tokenResponse.status}`);
      }
      
      const { accessToken } = await tokenResponse.json();
      if (!accessToken) {
        throw new Error('No access token received');
      }
      
      return accessToken;
    };
    
    const accessToken = await getAccessToken();
    const tokenHeader = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
    
    const config = {
      method,
      headers: { 
        'Authorization': tokenHeader,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}${url}`;
    const response = await fetch(fullUrl, config);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Token-based request successful');
    return result;
    
  } catch (error) {
    console.warn('Token-based request failed:', error.message);
    
    // If it's a 401 or token-related error, try the session-based fallback
    if (error.message.includes('401') || error.message.includes('token') || error.message.includes('Authentication')) {
      console.log('Trying session-based authentication fallback...');
      
      try {
        const result = await makeSessionBasedRequest(method, url, data);
        console.log('Session-based request successful');
        return result;
      } catch (sessionError) {
        console.error('Session-based request also failed:', sessionError.message);
        throw new Error(`Authentication failed: ${sessionError.message}`);
      }
    } else {
      // For non-auth errors, just re-throw
      throw error;
    }
  }
};

// User management functions with enhanced error handling
export const createUser = async (userData) => {
  try {
    console.log('Creating user with data:', { ...userData, email: userData.email });
    const response = await makeUserRequest('POST', '/auth/users', userData);
    console.log('User created successfully');
    return response;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    console.log('Updating user:', userId, 'with data:', { ...userData, email: userData.email });
    const response = await makeUserRequest('PUT', `/auth/users/${userId}`, userData);
    console.log('User updated successfully');
    return response;
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    console.log('Deleting user:', userId);
    const response = await makeUserRequest('DELETE', `/auth/users/${userId}`);
    console.log('User deleted successfully');
    return response;
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    console.log('Fetching all users');
    const response = await makeUserRequest('GET', '/auth/users');
    console.log('Users fetched successfully');
    return response;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};