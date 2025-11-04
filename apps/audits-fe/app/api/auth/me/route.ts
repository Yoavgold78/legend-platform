import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import axios from '@/lib/axios';

export async function GET(request: Request) {
  // --- START OF IMPROVEMENT ---
  // We declare accessToken here to make it available throughout the function scope.
  let accessToken;
  // --- END OF IMPROVEMENT ---

  try {
    console.log('🔍 /api/auth/me called');
    
    // Check if we're in iframe mode (token passed from parent)
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('✅ Using token from Authorization header (iframe mode)');
      accessToken = authHeader.slice('Bearer '.length);
      
      // Call backend with the provided token
      const backendResponse = await axios.get('/auth/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Backend response received successfully (iframe mode).');
      console.log('👤 User role from backend:', backendResponse.data.role);
      return NextResponse.json(backendResponse.data);
    }
    
    // Otherwise, use Auth0 session (standalone mode)
    // getSession() works without parameters in Route Handlers
    const session = await getSession();
    if (!session || !session.user) {
      console.log('❌ No Auth0 session found and no Authorization header');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('✅ Auth0 session found for user:', session.user.email);

    // Get access token from session
    accessToken = session.accessToken;
    
    if (!accessToken) {
      console.error('❌ Access token is missing from session. Check your Auth0 settings.');
      return NextResponse.json({ error: 'Access token not available' }, { status: 500 });
    }

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