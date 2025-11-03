import { getAccessToken } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const audience = process.env.AUTH0_AUDIENCE || 'https://audits-api.legenda.co.il';
    const scope = 'openid profile email';

    const { accessToken } = await getAccessToken(req, NextResponse.next(), {
      scopes: scope.split(' '),
      authorizationParams: { audience, scope },
    });

    const rawToken = accessToken?.startsWith('Bearer ')
      ? accessToken.slice('Bearer '.length)
      : accessToken;

    if (!rawToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    }

    return NextResponse.json({ accessToken: rawToken });
  } catch (error: any) {
    console.error('Error getting session token:', error);
    // If the SDK indicates a refresh is required or no token present, return 401 so client can re-login
    const message = (error && (error.message || error.code)) || 'Failed to get token';
    const code = (error && error.code) || 'ERR_TOKEN';
    return NextResponse.json({ error: message, code }, { status: 401 });
  }
}