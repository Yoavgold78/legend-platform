import { getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    }

    const rawToken = session.accessToken.startsWith('Bearer ')
      ? session.accessToken.slice('Bearer '.length)
      : session.accessToken;

    return NextResponse.json({ accessToken: rawToken });
  } catch (error: any) {
    console.error('Error getting session token:', error);
    // If the SDK indicates a refresh is required or no token present, return 401 so client can re-login
    const message = (error && (error.message || error.code)) || 'Failed to get token';
    const code = (error && error.code) || 'ERR_TOKEN';
    return NextResponse.json({ error: message, code }, { status: 401 });
  }
}