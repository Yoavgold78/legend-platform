import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAccessToken } from '@auth0/nextjs-auth0';
import axios from '@/lib/axios';

export async function GET(req: NextRequest) {
  // --- START OF IMPROVEMENT ---
  // We declare accessToken here to make it available throughout the function scope.
  let accessToken;
  // --- END OF IMPROVEMENT ---

  try {
    console.log('🔍 /api/auth/me called');
    
    const session = await getSession(req, NextResponse.next());
    if (!session || !session.user) {
      console.log('❌ No Auth0 session found');
      return NextResponse.json({ error: 'Not authenticated by Auth0 session' }, { status: 401 });
    }

    console.log('✅ Auth0 session found for user:', session.user.email);

    // --- START OF IMPROVEMENT ---
    // Added a dedicated try-catch for getting the access token for better debugging.
    // This isolates errors from the Auth0 SDK itself.
    try {
      const tokenResponse = await getAccessToken(req, NextResponse.next(), {
        scopes: ['openid', 'profile', 'email'],
        authorizationParams: { 
          audience: process.env.AUTH0_AUDIENCE,
          scope: 'openid profile email'
        },
      });
      accessToken = tokenResponse.accessToken;
    } catch (error: any) {
      console.error('❌ CRITICAL: Failed to get user access token from Auth0 SDK.', error);
      return NextResponse.json({ error: 'Failed to obtain access token', details: error.message }, { status: 500 });
    }
    
    if (!accessToken) {
      console.error('❌ Access token is missing after successful SDK call. Check your Auth0 settings.');
      return NextResponse.json({ error: 'Access token not available' }, { status: 500 });
    }
    // --- END OF IMPROVEMENT ---

    console.log('✅ Got user access token, calling backend /auth/me');

    const backendResponse = await axios.get('/auth/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Backend response received successfully.');
    console.log('👤 User role from backend:', backendResponse.data.role);

    return NextResponse.json(backendResponse.data);

  } catch (error: any) {
    console.error('❌ Error in /api/auth/me:', error);
    
    if (error.response) {
      console.error('Backend error response:', error.response.data);
      console.error('Backend status:', error.response.status);
      return NextResponse.json(
        { error: 'Backend error', details: error.response.data }, 
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    );
  }
}