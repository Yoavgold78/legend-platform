import express from 'express';
const router = express.Router();
import {
    createUser,
    updateUser,
    deleteUser,
    getAllUsers,
    getMe,
    migrateUser // Import the new migration function
} from '../controllers/auth.js';
import { trustGateway, admin } from '../middleware/trustGateway.js';

// === User Management Routes (protected by Admin) ===
// Note: We changed the base path for these routes for clarity
router.route('/users')
    .post(trustGateway, admin, createUser) // POST /api/auth/users
    .get(trustGateway, admin, getAllUsers); // GET /api/auth/users

router.route('/users/:id')
    .put(trustGateway, admin, updateUser) // PUT /api/auth/users/:id
    .delete(trustGateway, admin, deleteUser); // DELETE /api/auth/users/:id

// === Current User Route ===
router.get('/me', trustGateway, getMe); // GET /api/auth/me

// === Auth0 Migration Route ===
// This route MUST be public so the Auth0 hook can access it.
router.post('/migrate', migrateUser); // POST /api/auth/migrate


// The following routes are now obsolete as Auth0 handles them:
// POST /register
// POST /login
// POST /verify-password

// In your main server file (index.js or server.js), make sure you are using this router for the '/api/auth' path.
// Example: app.use('/api/auth', authRoutes);

export default router;