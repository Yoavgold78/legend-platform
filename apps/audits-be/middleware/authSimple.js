import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

// TEMPORARY: Simple auth bypass for testing
const protectSimple = asyncHandler(async (req, res, next) => {
  console.log('Using simple auth bypass');
  
  // Check if there's an Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('No token provided');
  }
  
  // For now, just create a test user or use a default one
  let user = await User.findOne({ email: 'admin@legenda.co.il' });
  
  if (!user) {
    // Create a test admin user
    user = await User.create({
      auth0Id: 'test-user-id',
      email: 'admin@legenda.co.il',
      fullName: 'Test Admin',
      role: 'admin',
    });
    console.log('Created test user:', user._id);
  }
  
  req.user = user;
  next();
});

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403);
        throw new Error('Admin access required');
    }
};

export { protectSimple as protect, admin };