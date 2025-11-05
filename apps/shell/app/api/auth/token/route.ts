import { getAccessToken } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

/**
 * Token API Route
 * 
 * Returns the access token for the authenticated user (from Auth0 session cookies).
 * This uses Auth0 SDK's getAccessToken(), which works in App Router route handlers
 * without passing req/res and will refresh the token if possible.
 */
export async function GET() {
  try {
    const { accessToken } = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    }

    // Strip a potential 'Bearer ' prefix (SDKs sometimes include it)
    const rawToken = accessToken.startsWith('Bearer ')
      ? accessToken.slice('Bearer '.length)
      : accessToken;

    return NextResponse.json({ accessToken: rawToken });
  } catch (error: any) {
    // Common Auth0 SDK error codes: login_required, consent_required, invalid_grant, etc.
    const code = error?.code || 'token_error';
    const status = code === 'login_required' ? 401 : 500;
    console.error('Error getting access token:', code, error?.message);
    return NextResponse.json(
      { error: 'Failed to get access token', code, message: error?.message },
      { status }
    );
  }
}
