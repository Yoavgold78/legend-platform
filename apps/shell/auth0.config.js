/**
 * Auth0 Configuration for Next.js App Router
 * 
 * This file is read by @auth0/nextjs-auth0 SDK automatically.
 * It overrides default settings to fix session cookie issues.
 * 
 * CRITICAL: Fixes ERR_MISSING_SESSION by properly configuring
 * session cookies and ensuring they persist across requests.
 * 
 * IMPORTANT: For iframe authentication to work across different domains:
 * - In production (HTTPS): Use sameSite='none' with secure=true
 * - In local dev (HTTP): Use sameSite='lax' with secure=false
 */

const isProduction = process.env.NODE_ENV === 'production';

// Export configuration object that Auth0 SDK will read
module.exports = {
  // Session configuration
  session: {
    // Session duration
    rollingDuration: 60 * 60 * 24, // 24 hours (in seconds)
    absoluteDuration: 60 * 60 * 24 * 7, // 7 days (in seconds)
    
    // Cookie configuration - CRITICAL for fixing session issues
    cookie: {
      domain: undefined, // Let SDK auto-detect from AUTH0_BASE_URL
      path: '/',
      transient: false, // Don't delete cookie on browser close
      httpOnly: true, // Security: cookie not accessible via JavaScript
      // CRITICAL: sameSite='none' requires secure=true (HTTPS)
      // Production: Use 'none' for cross-origin iframe support
      // Development: Use 'lax' for localhost without HTTPS
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    },
  },
  
  // Authorization parameters
  authorizationParams: {
    response_type: 'code',
    scope: 'openid profile email offline_access',
  },
};
