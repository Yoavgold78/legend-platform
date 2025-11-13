/**
 * Custom Next.js Server for Auth0 Header Fix
 * 
 * PROBLEM: Render.com forwards the internal port (10000) in x-forwarded-port header.
 * Auth0 SDK reads this header and incorrectly constructs localhost:10000 URLs,
 * ignoring the AUTH0_BASE_URL environment variable.
 * 
 * SOLUTION: Strip the x-forwarded-port header before Next.js processes requests.
 * This forces Auth0 SDK to use AUTH0_BASE_URL from environment variables.
 * 
 * USAGE: Update package.json start script to: node server.js
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // CRITICAL FIX: Remove x-forwarded-port header
      // This prevents Auth0 SDK from constructing localhost:10000 URLs
      delete req.headers['x-forwarded-port'];
      
      // Log for debugging (remove in production if too verbose)
      if (req.url?.includes('/api/auth')) {
        console.log('[Custom Server] Auth route:', req.url);
        console.log('[Custom Server] Headers after fix:', {
          host: req.headers.host,
          'x-forwarded-host': req.headers['x-forwarded-host'],
          'x-forwarded-proto': req.headers['x-forwarded-proto'],
          'x-forwarded-port': req.headers['x-forwarded-port'], // Should be undefined
        });
      }

      // Parse URL
      const parsedUrl = parse(req.url, true);
      
      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Environment: ${process.env.NODE_ENV}`);
      console.log(`> AUTH0_BASE_URL: ${process.env.AUTH0_BASE_URL}`);
    });
});
