/**
 * Auth0 Server-Side Helpers with URL Override
 * 
 * PROBLEM: Next.js constructs request.url as localhost:10000 because the server
 * binds to that port. Auth0 SDK uses request.url to set cookie domains, causing
 * cookies to be set for localhost instead of the actual domain.
 * 
 * SOLUTION: Override getSession() and getAccessToken() to use AUTH0_BASE_URL
 * environment variable instead of request.url for cookie domain calculation.
 */

import { getSession as auth0GetSession, getAccessToken as auth0GetAccessToken, Session } from '@auth0/nextjs-auth0';

/**
 * Get the base URL from environment or construct from headers
 * This is what Auth0 SDK should be using but doesn't always work correctly
 */
function getBaseUrl(headers?: Headers): string {
  // Priority 1: Explicit AUTH0_BASE_URL environment variable
  if (process.env.AUTH0_BASE_URL) {
    return process.env.AUTH0_BASE_URL;
  }
  
  // Priority 2: Construct from x-forwarded headers (for Render.com)
  if (headers) {
    const forwardedHost = headers.get('x-forwarded-host');
    const forwardedProto = headers.get('x-forwarded-proto') || 'https';
    
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }
  }
  
  // Fallback: Use localhost (should never happen in production)
  return process.env.NODE_ENV === 'production' 
    ? 'https://legend-shell-staging.onrender.com'
    : 'http://localhost:3000';
}

/**
 * Wrapper around Auth0's getSession() that forces correct base URL
 */
export async function getSession(req?: Request): Promise<Session | null | undefined> {
  try {
    // Set baseURL in process.env temporarily to override Auth0's URL detection
    const originalBaseUrl = process.env.AUTH0_BASE_URL;
    const headers = req?.headers;
    
    // Force the correct base URL
    process.env.AUTH0_BASE_URL = getBaseUrl(headers);
    
    console.log('[Auth0 Wrapper] Using baseURL:', process.env.AUTH0_BASE_URL);
    
    // Call the original getSession (no args in App Router - uses context automatically)
    const session = await auth0GetSession();
    
    // Restore original value
    if (originalBaseUrl !== undefined) {
      process.env.AUTH0_BASE_URL = originalBaseUrl;
    }
    
    return session;
  } catch (error) {
    console.error('[Auth0 Wrapper] getSession error:', error);
    throw error;
  }
}

/**
 * Wrapper around Auth0's getAccessToken() that forces correct base URL
 */
export async function getAccessToken(req?: Request, options?: any): Promise<{ accessToken?: string }> {
  try {
    // Set baseURL in process.env temporarily to override Auth0's URL detection
    const originalBaseUrl = process.env.AUTH0_BASE_URL;
    const headers = req?.headers;
    
    // Force the correct base URL
    process.env.AUTH0_BASE_URL = getBaseUrl(headers);
    
    console.log('[Auth0 Wrapper] Using baseURL for token:', process.env.AUTH0_BASE_URL);
    
    // Call the original getAccessToken (no req arg in App Router - uses context)
    const result = await auth0GetAccessToken(options);
    
    // Restore original value
    if (originalBaseUrl !== undefined) {
      process.env.AUTH0_BASE_URL = originalBaseUrl;
    }
    
    return result;
  } catch (error) {
    console.error('[Auth0 Wrapper] getAccessToken error:', error);
    throw error;
  }
}
