import { handleAuth, handleLogin, handleLogout, handleCallback, Session } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

const authHandler = handleAuth({
  login: handleLogin({
    authorizationParams: {
      audience: process.env.AUTH0_AUDIENCE || 'https://api.legend-platform.com',
      // CRITICAL: Include offline_access to get refresh token for automatic token renewal
      scope: 'openid profile email offline_access',
      // Optional: force showing the login screen even if a session exists at Auth0
      // Set NEXT_PUBLIC_AUTH0_PROMPT=login to enable during debugging
      ...(process.env.NEXT_PUBLIC_AUTH0_PROMPT === 'login' ? { prompt: 'login' } : {}),
      // CRITICAL FIX: Force redirect_uri with explicit base URL
      redirect_uri: process.env.AUTH0_BASE_URL ? `${process.env.AUTH0_BASE_URL}/api/auth/callback` : undefined,
    },
  }),
  callback: handleCallback({
    redirectUri: process.env.AUTH0_BASE_URL ? `${process.env.AUTH0_BASE_URL}/api/auth/callback` : undefined,
    afterCallback: async (req: NextRequest, session: Session) => {
      console.log('[Shell Callback] ✅ Callback successful');
      console.log('[Shell Callback] User:', session.user?.email);
      console.log('[Shell Callback] Session created:', !!session);
      console.log('[Shell Callback] Session object keys:', Object.keys(session));
      console.log('[Shell Callback] Request URL:', req.url);
      console.log('[Shell Callback] Request headers - cookie:', req.headers.get('cookie') ? 'present' : 'not present');
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

// Wrapper adds high-signal diagnostics around Auth0 routes
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  console.log('[Shell Auth Route] Incoming request:', req.method, url.pathname, url.search);
  console.log('[Shell Auth Route] req.url:', req.url);
  console.log('[Shell Auth Route] Host header:', req.headers.get('host'));
  console.log('[Shell Auth Route] x-forwarded-host:', req.headers.get('x-forwarded-host'));
  console.log('[Shell Auth Route] x-forwarded-proto:', req.headers.get('x-forwarded-proto'));

  const pathname = req.nextUrl.pathname;
  const authSegment = pathname.replace(/^\/api\/auth\/?/, '') || undefined;
  const context = { params: { auth0: authSegment } } as any;

  const response = await authHandler(req, context);

  const setCookie = response.headers.get('set-cookie');
  console.log('[Shell Auth Route] Response status:', response.status);
  console.log('[Shell Auth Route] Set-Cookie header present:', setCookie ? 'YES' : 'NO');
  if (setCookie) {
    console.log('[Shell Auth Route] Set-Cookie preview:', setCookie.slice(0, 200));
  }

  return response;
}

// Also support POST for logout (prevents CORS issues with client-side logout)
export async function POST(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const authSegment = pathname.replace(/^\/api\/auth\/?/, '') || undefined;
  const context = { params: { auth0: authSegment } } as any;

  console.log('[Shell Auth Route] Incoming request:', req.method, pathname, req.nextUrl.search);
  const response = await authHandler(req, context);
  return response;
}