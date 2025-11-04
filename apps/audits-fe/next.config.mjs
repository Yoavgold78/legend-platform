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
  // Output standalone for better deployment
  output: 'standalone',
  async headers() {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://legend-shell-staging.onrender.com'
    ];
    
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowedOrigins.join(',') },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-auth-token, Authorization' },
        ],
      },
    ];
  },
  reactStrictMode: true,
};

export default withPWA(nextConfig);