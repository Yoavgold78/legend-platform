import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check environment configuration
 */
export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    AUTH0_BASE_URL: process.env.AUTH0_BASE_URL,
    AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID?.substring(0, 10) + '...',
    AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
    // Don't log secrets!
    hasAUTH0_SECRET: !!process.env.AUTH0_SECRET,
    hasAUTH0_CLIENT_SECRET: !!process.env.AUTH0_CLIENT_SECRET,
  });
}
