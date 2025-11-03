import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

/**
 * trustGateway Middleware
 * 
 * Trusts the API Gateway's x-user-id header (containing auth0_sub).
 * The Gateway validates Auth0 tokens and forwards the user ID.
 * This backend is deployed as a Private Service, only accessible to the Gateway.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
const trustGateway = asyncHandler(async (req, res, next) => {
  // Extract x-user-id header from API Gateway
  const auth0Sub = req.headers['x-user-id'];

  // Log for debugging (mask sensitive data in production)
  console.log('trustGateway: x-user-id header:', auth0Sub ? `${auth0Sub.substring(0, 10)}...` : 'None');

  // Return 401 if header is missing
  if (!auth0Sub) {
    console.warn('trustGateway: Missing x-user-id header - request not from Gateway?');
    res.status(401);
    throw new Error('Not authorized - missing user context');
  }

  try {
    // Find user in database by auth0Id
    const user = await User.findOne({ auth0Id: auth0Sub });

    if (!user) {
      console.warn(`trustGateway: User not found for auth0Id: ${auth0Sub}`);
      res.status(401);
      throw new Error('Not authorized - user not found');
    }

    // Attach user to request object for downstream controllers
    req.user = user;
    console.log(`trustGateway: Authenticated user ${user._id} (${user.email})`);
    
    next();
  } catch (error) {
    console.error('trustGateway error:', error);
    res.status(401);
    throw new Error('Not authorized - authentication failed');
  }
});

/**
 * admin Middleware
 * 
 * Checks if req.user (populated by trustGateway) has admin role.
 * Must be used AFTER trustGateway middleware.
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  console.warn(`admin: Access denied for user ${req.user?._id} (role: ${req.user?.role})`);
  res.status(403);
  throw new Error('Not authorized as an admin');
};

export { trustGateway, admin };
