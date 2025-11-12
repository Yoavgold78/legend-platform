import nextPWA from 'next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip static optimization for routes that need runtime data
  experimental: {
    // Disable static page generation for dynamic routes
    appDir: true,
  },
  // Note: 'standalone' output removed - using standard Next.js server for Render
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'https://legend-shell-staging.onrender.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-auth-token, Authorization' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOW-FROM https://legend-shell-staging.onrender.com' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://legend-shell-staging.onrender.com http://localhost:3000" },
        ],
      },
    ];
  },
  reactStrictMode: true,
};

export default withPWA(nextConfig);