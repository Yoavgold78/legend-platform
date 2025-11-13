/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: 'standalone' output removed - using standard Next.js server for Render
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  // CRITICAL FIX: Override Next.js hostname detection
  // Render forwards port 10000 in headers, causing Auth0 to use localhost:10000
  // This forces Next.js to use the environment variable instead
  env: {
    NEXTAUTH_URL: process.env.AUTH0_BASE_URL,
  },
  
  // CRITICAL: Tell Next.js we're behind a proxy
  // This makes Next.js trust x-forwarded-* headers for URL construction
  experimental: {
    trustHostHeader: true,
  },
}

module.exports = nextConfig