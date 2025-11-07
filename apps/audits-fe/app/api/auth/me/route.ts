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
      accessToken = authHeader.slice('Bearer '.length);
      console.log('✅ iframe Authorization header detected. Token length:', accessToken.length);
      try {
        const backendResponse = await axios.get('/auth/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('✅ Backend /auth/me OK (iframe). Status 200. Role:', backendResponse.data.role);
        return NextResponse.json(backendResponse.data);
      } catch (err: any) {
        if (err.response) {
          console.warn('⚠️ Backend /auth/me failed (iframe)', err.response.status, err.response.data);
          return NextResponse.json(
            { error: 'Backend error', details: err.response.data },
            { status: err.response.status }
          );
        }
        throw err; // fall through to global catch
      }
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

  console.log('✅ Got user session access token (standalone). Calling backend /auth/me. Length:', accessToken.length);

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
  console.error('❌ Error in /api/auth/me:', { message: error.message, stack: error.stack });
    
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