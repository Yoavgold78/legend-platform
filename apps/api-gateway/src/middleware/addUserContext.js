// Extract auth0_sub from validated token and add to request headers
const addUserContext = (req, res, next) => {
  if (req.auth && req.auth.payload && req.auth.payload.sub) {
    // Add x-user-id header for backend services
    req.headers['x-user-id'] = req.auth.payload.sub;
    
    // Also store in req for logging
    req.userId = req.auth.payload.sub;
  }
  next();
};

module.exports = addUserContext;
