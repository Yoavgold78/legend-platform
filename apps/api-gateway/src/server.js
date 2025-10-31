require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { jwtCheck, authErrorHandler } = require('./middleware/auth');
const { requestIdMiddleware } = require('./middleware/requestId');
const addUserContext = require('./middleware/addUserContext');
const healthRoutes = require('./routes/health');
const proxyRoutes = require('./routes/proxy');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware order is critical
app.use(requestIdMiddleware);  // Add x-request-id first
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(express.json());

// Health check (no auth required)
app.use('/api/v1', healthRoutes);

// All other routes require authentication
app.use('/api/v1', jwtCheck);  // Validate Auth0 JWT
app.use('/api/v1', addUserContext);  // Add x-user-id header
app.use('/api/v1', proxyRoutes);  // Proxy to backends

// Auth error handler (must be after jwtCheck)
app.use(authErrorHandler);

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[API Gateway] Server running on port ${PORT}`);
  console.log(`[API Gateway] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[API Gateway] Auth0 Audience: ${process.env.AUTH0_AUDIENCE || 'NOT SET'}`);
  console.log(`[API Gateway] Health check: http://localhost:${PORT}/api/v1/health`);
});
