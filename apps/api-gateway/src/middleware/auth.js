const { auth } = require('express-oauth2-jwt-bearer');

// Lazy-initialize JWT check to allow environment variables to load first
let jwtCheckInstance = null;

const jwtCheck = (req, res, next) => {
  if (!jwtCheckInstance) {
    // Initialize on first request after environment variables are loaded
    jwtCheckInstance = auth({
      audience: process.env.AUTH0_AUDIENCE,
      issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
      tokenSigningAlg: 'RS256'
    });
  }
  return jwtCheckInstance(req, res, next);
};

// Error handler for auth failures
const authErrorHandler = (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message || 'Invalid or missing token'
    });
  }
  next(err);
};

module.exports = { jwtCheck, authErrorHandler };
