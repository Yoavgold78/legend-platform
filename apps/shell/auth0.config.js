/**
 * Auth0 Configuration for Next.js App Router
 * 
 * This file is read by @auth0/nextjs-auth0 SDK automatically.
 * It overrides default settings to fix session cookie issues.
 * 
 * CRITICAL FIX: The issue is that cookies must be set with the correct
 * attributes for the browser to accept and send them back.
 * 
 * For Render production with HTTPS and iframe support:
 * - secure: true (required for HTTPS)
 * - sameSite: 'lax' (changed from 'none' - see explanation below)
 * 
 * WHY LAX INSTEAD OF NONE:
 * While 'none' allows cross-site requests, it has issues:
 * 1. Browsers increasingly block sameSite=none cookies even with secure=true
 * 2. The iframe and parent are same-origin (both on onrender.com)
 * 3. 'lax' works for same-site navigation and top-level forms
 * 4. For same-origin iframes, 'lax' is sufficient
 */

// Export configuration object that Auth0 SDK will read
module.exports = {
  // Base URL configuration - CRITICAL: Must be set explicitly for production
  baseURL: process.env.AUTH0_BASE_URL || process.env.VERCEL_URL || undefined,
  
  // Session configuration
  session: {
    // Session duration
    rollingDuration: 60 * 60 * 24, // 24 hours (in seconds)
    absoluteDuration: 60 * 60 * 24 * 7, // 7 days (in seconds)
    
    // Cookie configuration - CRITICAL for fixing session issues
    cookie: {
      domain: undefined, // Auto-detect from AUTH0_BASE_URL
      path: '/',
      transient: false, // Persist cookie across browser restarts
      httpOnly: true, // Security: not accessible via JavaScript
      secure: true, // REQUIRED for HTTPS (Render production)
      sameSite: 'lax', // Changed from 'none' - lax works for same-origin
    },
  },
  
  // Authorization parameters
  authorizationParams: {
    response_type: 'code',
    scope: 'openid profile email offline_access',
  },
};
