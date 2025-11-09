import { initAuth0 } from '@auth0/nextjs-auth0';

/**
 * Auth0 Configuration
 * 
 * CRITICAL: This configuration fixes ERR_MISSING_SESSION by properly
 * configuring session cookies and Auth0 parameters.
 * 
 * For iframe authentication to work across different domains:
 * - Production (HTTPS): sameSite='none' with secure=true
 * - Development (HTTP): sameSite='lax' with secure=false
 */

const isProduction = process.env.NODE_ENV === 'production';

export default initAuth0({
  // Session configuration - ensures session cookies are created and readable
  session: {
    // Session duration: 24 hours rolling, 7 days absolute
    rollingDuration: 60 * 60 * 24, // 24 hours
    absoluteDuration: 60 * 60 * 24 * 7, // 7 days
    
    // Cookie settings - CRITICAL for session creation
    cookie: {
      domain: undefined, // Auto-detect from AUTH0_BASE_URL
      path: '/',
      transient: false, // Persist cookie (not deleted on browser close)
      httpOnly: true, // Security: not accessible via JavaScript
      // CRITICAL: sameSite='none' requires secure=true (HTTPS)
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    },
    
    // Use cookie-based sessions (no server-side store needed)
    store: undefined,
  },
  
  // Authorization parameters sent to Auth0
  authorizationParams: {
    response_type: 'code',
    audience: process.env.AUTH0_AUDIENCE || 'https://api.legend-platform.com',
    scope: 'openid profile email offline_access',
  },
  
  // Routes configuration
  routes: {
    callback: '/api/auth/callback',
    postLogoutRedirect: '/',
  },
});
