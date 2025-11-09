import { handleAuth, handleLogin, handleLogout, handleCallback, Session } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      audience: process.env.AUTH0_AUDIENCE || 'https://api.legend-platform.com',
      // CRITICAL: Include offline_access to get refresh token for automatic token renewal
      scope: 'openid profile email offline_access',
      // Optional: force showing the login screen even if a session exists at Auth0
      // Set NEXT_PUBLIC_AUTH0_PROMPT=login to enable during debugging
      ...(process.env.NEXT_PUBLIC_AUTH0_PROMPT === 'login' ? { prompt: 'login' } : {}),
    },
  }),
  callback: handleCallback({
    redirectUri: process.env.AUTH0_BASE_URL ? `${process.env.AUTH0_BASE_URL}/api/auth/callback` : undefined,
    afterCallback: async (_req: NextRequest, session: Session) => {
      console.log('[Shell Callback] ✅ Callback successful');
      console.log('[Shell Callback] User:', session.user?.email);
      console.log('[Shell Callback] Session created:', !!session);
      return session;
    },
  }),
  // Logout configuration - server-side redirect to avoid CORS issues
  logout: handleLogout({
    returnTo: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
    logoutParams: {
      // Set AUTH0_LOGOUT_FEDERATED=true to also log out of upstream IdPs
      federated: process.env.AUTH0_LOGOUT_FEDERATED === 'true',
    },
  }),
});

// Also support POST for logout (prevents CORS issues with client-side logout)
export const POST = GET;