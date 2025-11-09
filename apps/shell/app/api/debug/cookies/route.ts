import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check what cookies are present
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    console.log('[Debug /api/debug/cookies] Total cookies:', allCookies.length);
    
    const cookieInfo = allCookies.map(cookie => ({
      name: cookie.name,
      valueLength: cookie.value?.length || 0,
      hasValue: !!cookie.value,
    }));
    
    return NextResponse.json({
      totalCookies: allCookies.length,
      cookies: cookieInfo,
      auth0Cookies: cookieInfo.filter(c => c.name.startsWith('appSession') || c.name.startsWith('auth0')),
    });
  } catch (error: any) {
    console.error('[Debug /api/debug/cookies] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
