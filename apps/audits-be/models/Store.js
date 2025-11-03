import mongoose from 'mongoose';

const StoreSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    address: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // --- THIS IS THE NEW FIELD ---
    // This creates a reference to all User documents that are managers for this store.
    assignedManagers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
    // ---------------------------
}, { timestamps: true });

export default mongoose.model('Store', StoreSchema);