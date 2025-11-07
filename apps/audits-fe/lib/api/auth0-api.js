// Auth0-enabled API functions with enhanced error handling
const getAccessToken = async () => {
  // Check if running in iframe mode
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  
  if (isIframe) {
    console.log('[auth0-api] Running in iframe mode - token should come via postMessage, not /api/auth/token');
    // In iframe mode, the token should be provided via IframeAuthProvider → authStore
    // This function should not be called in iframe mode; axios interceptor handles it
    throw new Error('getAccessToken should not be called in iframe mode - use axios with iframeToken from authStore');
  }
  
  try {
    console.log('Attempting to fetch access token...');
    const tokenResponse = await fetch('/api/auth/token', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    console.log('Token response status:', tokenResponse.status);
    
    if (tokenResponse.status === 401) {
      console.warn('Token request returned 401 - redirecting to login');
      window.location.href = `/api/auth/login`;
      throw new Error('Re-authentication required');
    }
    
    if (!tokenResponse.ok) {
      console.error('Token request failed with status:', tokenResponse.status);
      const errorText = await tokenResponse.text();
      console.error('Token error response:', errorText);
      throw new Error(`Failed to get access token: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Token data received:', tokenData ? 'Success' : 'No data');
    
    const { accessToken } = tokenData;
    if (!accessToken) {
      console.error('No access token in response');
      window.location.href = `/api/auth/login`;
      throw new Error('Missing access token');
    }
    
    console.log('Access token obtained successfully');
    return accessToken;
  } catch (error) {
    console.error('getAccessToken error:', error);
    throw error;
  }
};

const makeAuthenticatedRequest = async (method, url, data = null) => {
  try {
    console.log(`Making ${method} request to ${url}`);
    const accessToken = await getAccessToken();
    const tokenHeader = accessToken.startsWith('Bearer ')
      ? accessToken
      : `Bearer ${accessToken}`;
    
    const config = {
      method,
      headers: { 
        'Authorization': tokenHeader,
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Include cookies for additional auth support
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}${url}`;
    console.log(`Sending request to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, config);
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('API request returned 401');
        
        // Check if running in iframe
        const isIframe = typeof window !== 'undefined' && window.self !== window.top;
        if (isIframe) {
          console.warn('[auth0-api] 401 in iframe mode - requesting auth from parent');
          window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
        } else {
          console.error('Redirecting to login');
          window.location.href = `/api/auth/login`;
        }
        
        throw new Error('Authentication failed');
      }
      
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} - ${errorText}`);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log(`${method} request successful`);
    return responseData;
    
  } catch (error) {
    console.error(`makeAuthenticatedRequest error for ${method} ${url}:`, error);
    
    // If this is a token-related error, try one more time
    if (error.message.includes('token') && !error._retried) {
      console.log('Retrying request due to token error...');
      error._retried = true;
      
      // Wait a bit and try again
      await new Promise(resolve => setTimeout(resolve, 1000));
      return makeAuthenticatedRequest(method, url, data);
    }
    
    throw error;
  }
};

// Store API functions
export const getAllStores = async () => {
  try {
    const response = await makeAuthenticatedRequest('GET', '/stores');
    return response.data || response;
  } catch (error) {
    console.error('Failed to fetch stores:', error);
    throw error;
  }
};

// Inspection API functions  
export const getAllInspections = async () => {
  try {
    const response = await makeAuthenticatedRequest('GET', '/inspections');
    return response.data || response;
  } catch (error) {
    console.error('Failed to fetch inspections:', error);
    throw error;
  }
};

// Template API functions
export const getAllTemplates = async () => {
  try {
    const response = await makeAuthenticatedRequest('GET', '/templates');
    return response.data || response;
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    throw error;
  }
};