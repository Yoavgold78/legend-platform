import { auth } from 'express-oauth2-jwt-bearer';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

// This is the new "protect" middleware.
// It first checks for a valid Auth0 JWT.
// If the token is valid, it then finds the corresponding user in our local database
// and attaches it to the request object (req.user).
const protect = asyncHandler(async (req, res, next) => {
  try {
    // Debug: Log the authorization header (mask token, don't double-prefix)
    const authHeader = req.headers.authorization;
    const maskedHeader = authHeader
      ? authHeader.replace(/^(Bearer)\s+([\w-]+)\..*$/, (_, scheme, first) => `${scheme} ${first}...`)
      : 'None';
    console.log('Authorization header:', maskedHeader);
    
    // 1. Define the JWT check middleware from Auth0
    const checkJwt = auth({
      issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
      tokenSigningAlg: 'RS256',
      audience: process.env.AUTH0_AUDIENCE,
    });

    // 2. Run the JWT check on the current request
    checkJwt(req, res, async (err) => {
      if (err) {
        // If token is invalid or not present, forward the error
        console.error('JWT verification failed:', err.message);
        console.error('Error details:', err);
        return next(err);
      }

      console.log('JWT verification successful, auth object:', req.auth);
      
      // 3. If token is valid, find the user in our database
      const claims = req.auth?.payload || {};
      const auth0Id = claims.sub; // 'sub' is the user ID from Auth0
      console.log('Looking for user with auth0Id:', auth0Id);
      
      let user = await User.findOne({ auth0Id: auth0Id });

      // Helper: fetch profile from Auth0 userinfo endpoint using the same access token
      const getAuth0Profile = async () => {
        try {
          const domain = process.env.AUTH0_DOMAIN;
          const resp = await fetch(`https://${domain}/userinfo`, {
            headers: { Authorization: `Bearer ${req.auth.token}` },
          });
          if (!resp.ok) return null;
          return await resp.json();
        } catch (_) {
          return null;
        }
      };

      if (!user) {
        // Auto-create the user if they don't exist in our database
        const profile = await getAuth0Profile();
        const profileEmail = profile?.email || claims.email || claims[`${process.env.AUTH0_AUDIENCE}/email`];
        const profileName = profile?.name || claims.name || claims[`${process.env.AUTH0_AUDIENCE}/name`];
        console.log('Creating new user from Auth0 token:', { auth0Id, profileEmail, profileName });
        
        try {
          const email = (profileEmail || `${auth0Id}@users.auth0.local`).toLowerCase();
          const fullName = profileName || 'Unknown User';

          user = await User.create({
            auth0Id: auth0Id,
            email,
            fullName,
            role: 'inspector',
          });
          console.log('Successfully created user:', user._id);
        } catch (createError) {
          console.error('Failed to create user:', createError);
          res.status(500);
          throw new Error('Failed to create user in database');
        }
      } else {
        console.log('Found existing user:', user._id, user.email);
        // If existing user lacks real email/name, try to enrich from userinfo and possibly promote to admin
        let updated = false;
        const profile = await getAuth0Profile();
        const profileEmail = profile?.email || claims.email || claims[`${process.env.AUTH0_AUDIENCE}/email`];
        const profileName = profile?.name || claims.name || claims[`${process.env.AUTH0_AUDIENCE}/name`];

        // If we got a real email and the current user has a placeholder email, try to merge with an existing user by that email
        if (profileEmail && (!user.email || user.email.endsWith('@users.auth0.local'))) {
          const normalizedEmail = profileEmail.toLowerCase();
          const existingByEmail = await User.findOne({ email: normalizedEmail });
          if (existingByEmail && existingByEmail._id.toString() !== user._id.toString()) {
            // Merge: Prefer the email-based account, attach auth0Id to it, delete placeholder
            if (!existingByEmail.auth0Id) {
              existingByEmail.auth0Id = auth0Id;
            }
            if (!existingByEmail.fullName || existingByEmail.fullName === 'Unknown User') {
              existingByEmail.fullName = profileName || existingByEmail.fullName || 'Unknown User';
            }
            await existingByEmail.save();
            await user.deleteOne();
            user = existingByEmail;
            console.log('Merged placeholder user into existing email account:', user._id, user.email);
          } else {
            // Safe to assign email on current user
            user.email = normalizedEmail;
            if (!user.auth0Id) user.auth0Id = auth0Id;
            updated = true;
          }
        }

        // Update name if still unknown and we have one
        if (profileName && user.fullName === 'Unknown User') {
          user.fullName = profileName;
          updated = true;
        }

        if (updated) {
          try {
            await user.save();
            console.log('Updated user profile/role from Auth0 profile or ADMIN_EMAILS:', user._id);
          } catch (saveErr) {
            // In case of duplicate key due to race, fall back to merge
            if (saveErr && saveErr.code === 11000 && profileEmail) {
              const normalizedEmail = profileEmail.toLowerCase();
              const existingByEmail = await User.findOne({ email: normalizedEmail });
              if (existingByEmail && existingByEmail._id.toString() !== user._id.toString()) {
                if (!existingByEmail.auth0Id) existingByEmail.auth0Id = auth0Id;
                if (!existingByEmail.fullName || existingByEmail.fullName === 'Unknown User') {
                  existingByEmail.fullName = user.fullName;
                }
                await existingByEmail.save();
                await user.deleteOne();
                user = existingByEmail;
                console.log('Resolved duplicate by merging on save:', user._id, user.email);
              } else {
                console.error('Duplicate email conflict could not be resolved automatically');
              }
            } else {
              throw saveErr;
            }
          }
        }
      }

      // 4. Attach our user object to the request and proceed
      // Bootstrap: if there are no admins in the system, promote this user to admin
      try {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount === 0 && user.role !== 'admin') {
          user.role = 'admin';
          await user.save();
          console.log('Bootstrapped first admin user:', user._id, user.email);
        }
      } catch (e) {
        console.warn('Failed to check/promote bootstrap admin:', e?.message || e);
      }
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Protect middleware error:', error);
    res.status(401);
    throw new Error('Not authorized, token failed');
  }
});

// This middleware runs *after* the "protect" middleware, so req.user is already populated.
// It checks if the user populated from our database has the 'admin' role.
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403);
  throw new Error('Not authorized as an admin');
};

// This export line is the crucial part. It makes both 'protect' and 'admin' available for import.
export { protect, admin };