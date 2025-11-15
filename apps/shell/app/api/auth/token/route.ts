import { getAccessToken as auth0GetAccessToken } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';
import { getSession, getAccessToken } from '@/lib/auth0-server';

// Force this route to be dynamic (uses cookies/session) - suppress Next.js static build warnings
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Ensure we're using Node.js runtime for better cookie handling

/**
 * Token API Route
 * 
 * Returns the access token for the authenticated user (from Auth0 session cookies).
 * This uses Auth0 SDK's getAccessToken(), which works in App Router route handlers
 * without passing req/res and will refresh the token if possible.
 */
export async function GET(request: Request) {
  try {
    console.log('[Shell /api/auth/token] Fetching access token...');
    console.log('[Shell /api/auth/token] Request URL:', request.url);
    console.log('[Shell /api/auth/token] Request method:', request.method);
    
    // Log cookies for debugging
    const cookies = request.headers.get('cookie');
    console.log('[Shell /api/auth/token] Cookies present:', cookies ? 'YES' : 'NO');
    if (cookies) {
      const auth0Cookies = cookies.split(';').filter(c => c.trim().startsWith('appSession') || c.trim().startsWith('auth0'));
      console.log('[Shell /api/auth/token] Auth0 cookies count:', auth0Cookies.length);
      console.log('[Shell /api/auth/token] Auth0 cookie names:', auth0Cookies.map(c => c.split('=')[0].trim()));
    }
    
    // Log all headers for debugging
    console.log('[Shell /api/auth/token] All headers:', Object.fromEntries(request.headers.entries()));
    
    // FIRST: Check if session exists
    try {
      const session = await getSession(request);
      console.log('[Shell /api/auth/token] getSession() returned:', session ? 'session object' : 'null');
      if (!session || !session.user) {
        console.error('[Shell /api/auth/token] ❌ No session found - user needs to login');
        console.error('[Shell /api/auth/token] This usually means session cookies are not being sent or not readable');
        return NextResponse.json({ error: 'Not authenticated', code: 'ERR_MISSING_SESSION' }, { status: 401 });
      }
      console.log('[Shell /api/auth/token] ✅ Session found for user:', session.user.email);
    } catch (sessionError: any) {
      console.error('[Shell /api/auth/token] ❌ Session check failed:', sessionError.message);
      console.error('[Shell /api/auth/token] Error code:', sessionError.code);
      console.error('[Shell /api/auth/token] Stack:', sessionError.stack);
      return NextResponse.json({ error: 'Session error', code: 'ERR_SESSION_CHECK', message: sessionError.message }, { status: 401 });
    }
    
    // CRITICAL: Pass the audience to get a proper API access token
    // Include offline_access scope to get refresh token for automatic renewal
    const audience = process.env.AUTH0_AUDIENCE || 'https://api.legend-platform.com';
    const { accessToken } = await getAccessToken(request, {
      authorizationParams: {
        audience,
        scope: 'openid profile email offline_access',
      },
      refresh: true, // Enable automatic token refresh
    });

    if (!accessToken) {
      console.error('[Shell /api/auth/token] No access token available');
      return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    }

    // Strip a potential 'Bearer ' prefix (SDKs sometimes include it)
    const rawToken = accessToken.startsWith('Bearer ')
      ? accessToken.slice('Bearer '.length)
      : accessToken;

    console.log('[Shell /api/auth/token] Access token retrieved successfully (length:', rawToken.length, ')');
    return NextResponse.json({ accessToken: rawToken });
  } catch (error: any) {
    // Common Auth0 SDK error codes: login_required, consent_required, invalid_grant, etc.
    const code = error?.code || 'token_error';
    const status = code === 'login_required' ? 401 : 500;
    console.error('[Shell /api/auth/token] Error getting access token:', code, error?.message, error?.stack);
    return NextResponse.json(
      { error: 'Failed to get access token', code, message: error?.message },
      { status }
    );
  }
}
