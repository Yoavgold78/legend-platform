const { v4: uuidv4 } = require('uuid');

// Generate or accept x-request-id header for request tracing
const requestIdMiddleware = (req, res, next) => {
  // Use existing request ID if provided, otherwise generate new one
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Attach to request object
  req.id = requestId;
  
  // Add to all response headers
  res.setHeader('x-request-id', requestId);
  
  // Log request with ID
  console.log(`[${requestId}] ${req.method} ${req.path}`);
  
  next();
};

module.exports = { requestIdMiddleware };
