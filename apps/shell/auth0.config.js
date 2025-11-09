/**
 * Auth0 Configuration for Next.js App Router
 * 
 * This file is read by @auth0/nextjs-auth0 SDK automatically.
 * It overrides default settings to fix session cookie issues.
 * 
 * CRITICAL: Fixes ERR_MISSING_SESSION by properly configuring
 * session cookies and ensuring they persist across requests.
 */

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
      secure: true, // HTTPS only (auto-set in production)
      sameSite: 'lax', // Allow cookie on same-site navigations and top-level navigation
    },
  },
  
  // Authorization parameters
  authorizationParams: {
    response_type: 'code',
    scope: 'openid profile email offline_access',
  },
};
