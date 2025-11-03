import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Store from '../models/Store.js';

// Valid user roles
const VALID_ROLES = ['admin', 'inspector', 'manager', 'employee'];

// Helper function to get Auth0 Management API token
async function getAuth0ManagementToken() {
    const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
            client_secret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
            audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
            grant_type: 'client_credentials'
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get Auth0 token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
}

// Helper function to create user in Auth0
async function createAuth0User(userData, token) {
    console.log('Sending request to Auth0:', JSON.stringify(userData, null, 2));
    
    const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('Auth0 API Error:', error);
        
        // If password is required, try again with a temporary password
        if (error.message && error.message.includes('password') && !userData.password) {
            console.log('Password required, retrying with temporary password...');
            const userDataWithPassword = {
                ...userData,
                password: 'TempPassword123!',
                email_verified: true
            };
            
            console.log('Retrying with password:', JSON.stringify(userDataWithPassword, null, 2));
            
            const retryResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userDataWithPassword)
            });

            if (!retryResponse.ok) {
                const retryError = await retryResponse.json();
                console.error('Auth0 API Retry Error:', retryError);
                throw new Error(retryError.message || retryError.error_description || 'Failed to create user in Auth0');
            }

            return await retryResponse.json();
        }
        
        throw new Error(error.message || error.error_description || 'Failed to create user in Auth0');
    }

    return await response.json();
}

// Helper function to delete user from Auth0
async function deleteAuth0User(userId, token) {
    const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    });

    if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to delete Auth0 user: ${error}`);
        throw new Error('Failed to delete user from Auth0');
    }
}

// Helper function to create password change ticket for user invitation
async function createPasswordChangeTicket(userId, token) {
    console.log('Creating password change ticket for user invitation...');
    
    const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/tickets/password-change`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            result_url: process.env.APP_BASE_URL || 'http://localhost:3000',
            user_id: userId,
            mark_email_as_verified: true,
            ttl_sec: 432000 // 5 days
        })
    });

    if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to create password change ticket: ${error}`);
        throw new Error('Failed to create password change ticket');
    }

    const result = await response.json();
    console.log('Password change ticket created successfully');
    console.log('Ticket URL:', result.ticket);
    return result;
}

// Helper function to ask Auth0 to send a Change Password email
async function requestAuth0ChangePasswordEmail(email) {
    if (!process.env.AUTH0_CLIENT_ID) {
        throw new Error('Missing AUTH0_CLIENT_ID in server configuration');
    }
    const body = {
        client_id: process.env.AUTH0_CLIENT_ID,
        email,
        connection: process.env.AUTH0_DB_CONNECTION || 'Username-Password-Authentication'
    };

    console.log('Calling Auth0 /dbconnections/change_password for email:', email);
    const resp = await fetch(`https://${process.env.AUTH0_DOMAIN}/dbconnections/change_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const text = await resp.text();
    if (!resp.ok) {
        console.error('Auth0 change_password error:', text);
        throw new Error(`Auth0 change_password failed (${resp.status}): ${text}`);
    }
    console.log('Auth0 change_password response:', text);
    return text;
}

/**
 * @desc    Create a new user in Auth0 and our DB
 * @route   POST /api/users
 * @access  Private/Admin
 */
export const createUser = asyncHandler(async (req, res) => {
    // Validate environment variables first
    if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_MANAGEMENT_CLIENT_ID || !process.env.AUTH0_MANAGEMENT_CLIENT_SECRET) {
        console.error('Missing Auth0 Management API credentials');
        res.status(500);
        throw new Error('Server configuration error: Missing Auth0 credentials');
    }

    console.log('--- Checking Management Env Variables ---');
    console.log('Domain:', process.env.AUTH0_DOMAIN);
    console.log('Client ID:', process.env.AUTH0_MANAGEMENT_CLIENT_ID);
    console.log('Client Secret length:', process.env.AUTH0_MANAGEMENT_CLIENT_SECRET?.length);
    console.log('------------------------------------');
    
    const { fullName, email, role, phoneNumber, stores } = req.body;
    const normalizedEmail = (email || '').toLowerCase();

    // Validate required fields
    if (!fullName || !email || !role) {
        res.status(400);
        throw new Error('Missing required fields: fullName, email, and role are required');
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
        res.status(400);
        throw new Error('Invalid or missing role');
    }

    // Validate employee store assignment
    if (role === 'employee' && (!stores || stores.length !== 1)) {
        res.status(400);
        throw new Error('An employee must be assigned to exactly one store.');
    }

    // 1. Check if user already exists in our local DB
    const existingLocal = await User.findOne({ email: normalizedEmail });
    if (existingLocal) {
        res.status(409);
        throw new Error('משתמש עם כתובת האימייל הזו כבר קיים.');
    }

    let auth0UserId = null;
    let managementToken = null;

    try {
        console.log('Getting Auth0 Management token...');
        managementToken = await getAuth0ManagementToken();
        console.log('Successfully obtained management token');

        console.log('Attempting to create Auth0 user with email:', normalizedEmail);
        
        // Option 1: Try with email invitation (no password required)
        let userPayload = {
            email: normalizedEmail,
            name: fullName,
            connection: 'Username-Password-Authentication',
            email_verified: false, // Will be verified through invitation
        };
        
        console.log('User payload (invitation method):', JSON.stringify(userPayload, null, 2));
        
        // 2. Create the user in Auth0 FIRST. If this fails, the whole process stops.
        const auth0User = await createAuth0User(userPayload, managementToken);
        
        console.log('Auth0 user created successfully:', auth0User);
        auth0UserId = auth0User.user_id;

        if (!auth0UserId) {
            throw new Error('Failed to get user_id from Auth0 response.');
        }

        console.log('Creating user in local database...');
        
        // 3. If Auth0 creation is successful, create the user in our local DB
        const newUserPayload = {
            auth0Id: auth0UserId,
            fullName,
            email: normalizedEmail,
            role,
        };
        
        if (role === 'manager') {
            newUserPayload.phoneNumber = phoneNumber || '';
            newUserPayload.stores = Array.isArray(stores) ? stores : [];
        } else if (role === 'employee') {
            newUserPayload.stores = Array.isArray(stores) ? stores : [];
        }

        const user = await User.create(newUserPayload);
        console.log('User created in local database:', user._id);

        // 4. Sync assignedManagers if the user is a manager
        if (role === 'manager' && Array.isArray(newUserPayload.stores) && newUserPayload.stores.length > 0) {
            console.log('Updating store assignments for manager...');
            await Store.updateMany(
                { _id: { $in: newUserPayload.stores } },
                { $addToSet: { assignedManagers: user._id } }
            );
        }

        // 5. Ask Auth0 to send the Change Password email (Auth0 sends it, not us)
        console.log('Requesting Auth0 to send password reset email...');
        const changePasswordMessage = await requestAuth0ChangePasswordEmail(normalizedEmail);

        console.log('User creation process completed successfully');
        const responseUser = await User.findById(user._id).select('-password');
        
        // Include minimal debug info to help verify the flow
        res.status(201).json({
            ...responseUser.toObject(),
            _debug: {
                changePasswordEmail: changePasswordMessage
            }
        });

    } catch (error) {
        console.error('Error in createUser:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            statusCode: error.statusCode,
            originalError: error.originalError
        });

        // If user was somehow created in Auth0 but a later step failed, roll back.
        if (auth0UserId && managementToken) {
            console.warn(`Rolling back Auth0 user creation for ${auth0UserId} due to an error.`);
            try {
                await deleteAuth0User(auth0UserId, managementToken);
                console.log('Successfully rolled back Auth0 user creation');
            } catch (rollbackError) {
                console.error('Failed to rollback Auth0 user creation:', rollbackError);
            }
        }
        
        // More specific error handling based on Auth0 error types
        if (error.statusCode === 409) {
            res.status(409);
            throw new Error('המשתמש כבר קיים ב-Auth0');
        } else if (error.statusCode === 400) {
            res.status(400);
            throw new Error('נתונים לא תקינים: ' + error.message);
        } else if (error.message.includes('client_secret')) {
            res.status(500);
            throw new Error('בעיה בהגדרות האימות של השרת. אנא פנה למנהל המערכת.');
        } else {
            res.status(500);
            throw new Error(`שגיאה ביצירת המשתמש: ${error.message}`);
        }
    }
});

/**
 * @desc    Handle user migration from legacy system (called by Auth0 hook)
 * @route   POST /api/users/migrate
 * @access  Public
 */
export const migrateUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    // Ensure you have a 'matchPassword' method on your User model
    if (user && (await user.matchPassword(password))) {
        // Password is correct, return user profile for Auth0 to create a new profile
        res.status(200).json({
            user_id: user._id.toString(),
            email: user.email,
            name: user.fullName,
        });
    } else {
        // User not found or password incorrect, Auth0 will handle as failed login
        res.status(401).json({ message: 'Invalid credentials' });
    }
});


/**
 * @desc    Update user details
 * @route   PUT /api/users/:id
 * @access  Private (Admin only)
 */
export const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email, fullName, role, phoneNumber, stores } = req.body;
    
    console.log('=== UPDATE USER DEBUG ===');
    console.log('User ID:', id);
    console.log('Request body:', { email, fullName, role, phoneNumber, stores });
    console.log('Stores type:', typeof stores, 'Length:', Array.isArray(stores) ? stores.length : 'N/A');
    
    const user = await User.findById(id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    console.log('Current user data:', {
        role: user.role,
        stores: user.stores,
        fullName: user.fullName
    });

    // Validate role if provided
    if (role && !VALID_ROLES.includes(role)) {
        res.status(400);
        throw new Error('Invalid role');
    }

    // Validate employee store assignment
    const finalRole = role || user.role;
    if (finalRole === 'employee' && (!stores || stores.length !== 1)) {
        res.status(400);
        throw new Error('An employee must be assigned to exactly one store.');
    }

    const oldStores = Array.isArray(user.stores) ? user.stores.map((s) => s.toString()) : [];
    const newStores = Array.isArray(stores) ? stores.map((s) => s.toString()) : [];
    
    const storesToAdd = newStores.filter(s => !oldStores.includes(s));
    const storesToRemove = oldStores.filter(s => !newStores.includes(s));

    // Update Auth0 profile
    const auth0UpdatePayload = {};
    if (fullName && fullName !== user.fullName) auth0UpdatePayload.name = fullName;
    if (email && email !== user.email) auth0UpdatePayload.email = email;
    // Note: Updating roles in Auth0 is a separate, more complex operation (assign/remove roles).
    // For now, we are managing roles only in our local DB.

    if (Object.keys(auth0UpdatePayload).length > 0 && user.auth0Id) {
        try {
            if (process.env.AUTH0_MANAGEMENT_CLIENT_ID && process.env.AUTH0_MANAGEMENT_CLIENT_SECRET) {
                const managementToken = await getAuth0ManagementToken();
                const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users/${user.auth0Id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${managementToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(auth0UpdatePayload)
                });
                
                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Failed to update Auth0 user: ${error}`);
                }
            } else {
                console.warn('Auth0 management credentials missing; skipping Auth0 profile update for user:', user._id);
            }
        } catch (auth0Err) {
            console.warn('Auth0 profile update failed (continuing with local DB update):', auth0Err?.message || auth0Err);
        }
    }

    // Update local DB
    user.email = email || user.email;
    user.fullName = fullName || user.fullName;
    user.role = role || user.role;

    console.log('Final role:', user.role);
    console.log('Stores from request:', stores);

    if (user.role === 'manager') {
        user.phoneNumber = phoneNumber;
        user.stores = Array.isArray(stores) ? stores : [];
        console.log('Set manager stores:', user.stores);
    } else if (user.role === 'employee') {
        user.phoneNumber = undefined;
        user.stores = Array.isArray(stores) ? stores : [];
        console.log('Set employee stores:', user.stores);
    } else if (user.role !== 'manager' && user.role !== 'employee') {
        user.phoneNumber = undefined;
        user.stores = [];
        console.log('Cleared stores for role:', user.role);
    }
    
    console.log('User before save:', {
        role: user.role,
        stores: user.stores,
        fullName: user.fullName
    });
    
    await user.save();
    
    console.log('User after save:', {
        role: user.role,
        stores: user.stores,
        fullName: user.fullName
    });
    console.log('=== END UPDATE USER DEBUG ===');

    // Sync store assignments
    if (storesToAdd.length > 0) {
        await Store.updateMany({ _id: { $in: storesToAdd } }, { $addToSet: { assignedManagers: user._id } });
    }
    if (storesToRemove.length > 0) {
         await Store.updateMany({ _id: { $in: storesToRemove } }, { $pull: { assignedManagers: user._id } });
    }
    if (role && role !== 'manager' && oldStores.length > 0) {
        await Store.updateMany({ _id: { $in: oldStores } }, { $pull: { assignedManagers: user._id } });
    }
    
    const updatedUser = await User.findById(id).select('-password');
    res.json(updatedUser);
});


/**
 * @desc    Delete a user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
export const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    
    // 1. Delete user from Auth0 (if linked and management creds exist)
    if (user.auth0Id && process.env.AUTH0_MANAGEMENT_CLIENT_ID && process.env.AUTH0_MANAGEMENT_CLIENT_SECRET) {
        try {
            const managementToken = await getAuth0ManagementToken();
            await deleteAuth0User(user.auth0Id, managementToken);
        } catch (e) {
            console.warn('Auth0 delete failed (continuing with local delete):', e?.message || e);
        }
    }

    // 2. Delete user from our DB and get stores to update
    const storesToUpdate = user.stores;
    await user.deleteOne();

    // 3. Sync store assignments
    if (user.role === 'manager' && storesToUpdate.length > 0) {
        await Store.updateMany(
            { _id: { $in: storesToUpdate } },
            { $pull: { assignedManagers: user._id } }
        );
    }

    res.json({ message: 'User removed from Auth0 and database' });
});


/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private (Admin only)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password');
    res.json(users);
});


/**
 * @desc    Get current authenticated user's profile from our DB
 * @route   GET /api/users/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
    // The `protect` middleware already found the user and attached it to req.user
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
});