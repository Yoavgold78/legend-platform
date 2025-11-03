import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    // NEW: This is the primary link to the Auth0 user profile. It is now the unique identifier.
    auth0Id: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    // REMOVED: The password is no longer stored in our database.
    // password: {
    //     type: String,
    //     required: true
    // },
    fullName: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'inspector', 'manager', 'employee'],
        default: 'inspector'
    },
    stores: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store'
    }],
    phoneNumber: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// IMPORTANT: This method is still needed for the user migration process.
// It allows us to check the old passwords of existing users when they log in for the first time via Auth0.
// Do NOT remove this until all users have been migrated.
UserSchema.methods.matchPassword = async function (enteredPassword) {
  // Check if password exists on the document before comparing.
  // For new users created via Auth0, this field will not exist.
  if (!this.password) return false; 
  return await bcrypt.compare(enteredPassword, this.password);
};


export default mongoose.model('User', UserSchema);