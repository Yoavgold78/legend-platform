import { getSession, getAccessToken } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

/**
 * Token API Route
 * 
 * Returns the access token for the authenticated user.
 * Used by Shell to pass token to audits-fe iframe.
 */
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get access token from session
    const accessToken = session.accessToken;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    }

    // Return raw token (remove Bearer prefix if present)
    const rawToken = typeof accessToken === 'string' && accessToken.startsWith('Bearer ')
      ? accessToken.slice('Bearer '.length)
      : accessToken;

    return NextResponse.json({ accessToken: rawToken });
  } catch (error: any) {
    console.error('Error getting access token:', error);
    return NextResponse.json(
      { error: 'Failed to get access token', details: error.message },
      { status: 500 }
    );
  }
}
