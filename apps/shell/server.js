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
// CRITICAL FIX: Don't set hostname to 'localhost' - let Next.js detect from headers
// Setting hostname forces Next.js to use that value for all URL construction
const port = parseInt(process.env.PORT, 10) || 3000;

// Initialize Next.js app WITHOUT hardcoded hostname
// This allows Next.js to construct URLs from x-forwarded-host header
const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // CRITICAL FIX 1: Proxy the headers object to normalize x-forwarded-* values
      // Simple delete doesn't work because Auth0 SDK may cache the original object
      const originalHeaders = req.headers;
      req.headers = new Proxy(originalHeaders, {
        get(target, prop) {
          // Force x-forwarded-port to 443 so downstream URL builders stay on https
          if (prop === 'x-forwarded-port') {
            // Force port 443 so frameworks build https URLs
            return '443';
          }
          // Force correct host header
          if (prop === 'host' && target['x-forwarded-host']) {
            return target['x-forwarded-host'];
          }
          return target[prop];
        },
        has(target, prop) {
          // Hide x-forwarded-port from 'in' checks
          if (prop === 'x-forwarded-port') {
            return true;
          }
          return prop in target;
        },
        ownKeys(target) {
          // Hide x-forwarded-port from Object.keys() and similar
          const keys = new Set(Reflect.ownKeys(target));
          keys.add('x-forwarded-port');
          return Array.from(keys);
        },
        getOwnPropertyDescriptor(target, prop) {
          // Hide x-forwarded-port from property descriptor checks
          if (prop === 'x-forwarded-port') {
            return {
              configurable: true,
              enumerable: true,
              value: '443',
              writable: false,
            };
          }
          return Object.getOwnPropertyDescriptor(target, prop);
        }
      });
      
      if (!dev) {
        try {
          const baseUrl = process.env.AUTH0_BASE_URL ? new URL(process.env.AUTH0_BASE_URL) : undefined;
          const fallbackHost = baseUrl?.host;
          const fallbackProto = baseUrl?.protocol.replace(':', '');

          const targetHost = originalHeaders['x-forwarded-host'] || fallbackHost || originalHeaders['host'];
          const targetProto = originalHeaders['x-forwarded-proto'] || fallbackProto || 'https';
          const targetPort = targetProto === 'https' ? '443' : '80';

          if (targetHost) {
            originalHeaders['host'] = targetHost;
            originalHeaders['x-forwarded-host'] = targetHost;
          }

          originalHeaders['x-forwarded-proto'] = targetProto;
          originalHeaders['x-forwarded-port'] = targetPort;
        } catch (err) {
          console.error('[Custom Server] Failed to normalize host headers', err);
        }
      }
      
      // CRITICAL FIX 2: Override socket.localAddress to prevent localhost URL construction
      // Auth0 SDK may read from socket to construct URLs
      if (req.socket && originalHeaders['x-forwarded-host']) {
        const originalSocket = req.socket;
        req.socket = new Proxy(originalSocket, {
          get(target, prop) {
            if (prop === 'localAddress') {
              return originalHeaders['x-forwarded-host'];
            }
            if (prop === 'localPort') {
              return originalHeaders['x-forwarded-proto'] === 'https' ? 443 : 80;
            }
            return target[prop];
          }
        });
      }
      
      // Log for debugging (remove in production if too verbose)
      if (req.url?.includes('/api/auth')) {
        console.log('[Custom Server] Auth route:', req.url);
        console.log('[Custom Server] x-forwarded-port in headers?', 'x-forwarded-port' in req.headers);
        console.log('[Custom Server] x-forwarded-port value:', req.headers['x-forwarded-port']);
        console.log('[Custom Server] Headers keys:', Object.keys(req.headers).filter(k => k.includes('forwarded')));
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
      console.log(`> Ready on port ${port}`);
      console.log(`> Environment: ${process.env.NODE_ENV}`);
      console.log(`> AUTH0_BASE_URL: ${process.env.AUTH0_BASE_URL}`);
    });
});
