import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

/**
 * Auth0 middleware for protected routes
 * 
 * NOTE: The x-forwarded-port header fix is handled in server.js (custom server)
 * before requests reach Next.js, so this middleware works with correct headers.
 */
export default withMiddlewareAuthRequired();

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - root page (/)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|$).*)',
  ],
};
