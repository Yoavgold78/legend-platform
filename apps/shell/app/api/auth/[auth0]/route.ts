import { handleAuth, handleLogin, handleLogout, handleCallback } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      audience: process.env.AUTH0_AUDIENCE || 'https://api.legend-platform.com',
      scope: 'openid profile email',
      // Optional: force showing the login screen even if a session exists at Auth0
      // Set NEXT_PUBLIC_AUTH0_PROMPT=login to enable during debugging
      ...(process.env.NEXT_PUBLIC_AUTH0_PROMPT === 'login' ? { prompt: 'login' } : {}),
    },
  }),
  callback: handleCallback({
    redirectUri: process.env.AUTH0_BASE_URL ? `${process.env.AUTH0_BASE_URL}/api/auth/callback` : undefined,
  }),
  // Ensure logout clears the Auth0 session and returns to the app base URL
  logout: handleLogout({
    returnTo: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
    logoutParams: {
      // Set AUTH0_LOGOUT_FEDERATED=true to also log out of upstream IdPs during development
      federated: process.env.AUTH0_LOGOUT_FEDERATED === 'true',
    },
  }),
});