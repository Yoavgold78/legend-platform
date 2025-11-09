import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint to set a cookie and see what happens
 */
export async function GET() {
  const response = NextResponse.json({ 
    message: 'Test cookie set',
    instructions: 'Check browser DevTools -> Application -> Cookies to see if this cookie appears'
  });
  
  // Set a test cookie with the same settings we're using for Auth0
  response.cookies.set('test_cookie', 'test_value_' + Date.now(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  
  console.log('[Test Cookie] Set test cookie with: httpOnly=true, secure=true, sameSite=lax');
  
  return response;
}
