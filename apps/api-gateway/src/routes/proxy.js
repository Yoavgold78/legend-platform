const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const router = express.Router();

// Proxy to audits-be (only if backend URL is configured)
if (process.env.AUDITS_BE_URL) {
  router.use('/audits', createProxyMiddleware({
    target: process.env.AUDITS_BE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/audits': '' },  // Remove /api/v1/audits prefix
    onProxyReq: (proxyReq, req, res) => {
      // Add x-request-id if present
      if (req.id) {
        proxyReq.setHeader('x-request-id', req.id);
      }
      // x-user-id already added by addUserContext middleware
      console.log(`[PROXY] ${req.method} ${req.path} -> ${process.env.AUDITS_BE_URL} (user: ${req.userId || 'unknown'})`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[PROXY] Response from audits-be: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error(`[PROXY ERROR] ${err.message}`);
      res.status(502).json({
        error: 'Bad Gateway',
        message: 'Backend service unavailable'
      });
    }
  }));
} else {
  // Placeholder response when backend not configured
  router.use('/audits', (req, res) => {
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Audits backend not configured (AUDITS_BE_URL not set)'
    });
  });
}

// Proxy to schedule-be (only if backend URL is configured)
if (process.env.SCHEDULE_BE_URL) {
  router.use('/schedule', createProxyMiddleware({
    target: process.env.SCHEDULE_BE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/schedule': '' },
    onProxyReq: (proxyReq, req, res) => {
      if (req.id) {
        proxyReq.setHeader('x-request-id', req.id);
      }
      console.log(`[PROXY] ${req.method} ${req.path} -> ${process.env.SCHEDULE_BE_URL} (user: ${req.userId || 'unknown'})`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[PROXY] Response from schedule-be: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error(`[PROXY ERROR] ${err.message}`);
      res.status(502).json({
        error: 'Bad Gateway',
        message: 'Backend service unavailable'
      });
    }
  }));
} else {
  // Placeholder response when backend not configured
  router.use('/schedule', (req, res) => {
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Schedule backend not configured (SCHEDULE_BE_URL not set)'
    });
  });
}

module.exports = router;
