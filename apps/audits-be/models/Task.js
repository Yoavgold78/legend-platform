import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
    inspectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inspection',
        required: false // Made optional for admin-created task templates
    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: false // Made optional for admin-created task templates
    },
    // MODIFIED: This is now an array to support multiple assignees (e.g., store manager and area manager)
    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Made optional for admin-created task templates
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // The inspector who created the task
        required: true
    },
    // NEW: Flag to indicate if this is an admin-created template task
    isTemplate: {
        type: Boolean,
        default: false
    },
    // NEW: Optional name field for admin task templates
    name: {
        type: String
    },
    // Optional, for tasks created from a specific question
    originatingQuestionText: {
        type: String 
    },
    // NEW: Stable link back to the originating question (optional for older tasks)
    questionId: {
        type: String
    },
    description: {
        type: String,
        required: true
    },
    dueDate: {
        type: Date,
        required: false // Made optional for admin-created task templates
    },
    priority: {
        type: String,
        enum: ['Normal', 'High'],
        default: 'Normal'
    },
    status: {
        type: String,
        enum: ['Open', 'Completed', 'Verified'], // 'Verified' is for future use
        default: 'Open'
    },
    // Fields for when the manager completes the task
    managerComment: {
        type: String
    },
    proofImageUrl: {
        type: String
    },
    // NEW: Multiple proof images (non-breaking; keeps old field too)
    proofImageUrls: [{
        type: String
    }],
    completedAt: {
        type: Date
    }
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

export default mongoose.model('Task', TaskSchema);

// Helpful indexes for common queries
try {
    TaskSchema.index({ inspectionId: 1 });
    TaskSchema.index({ storeId: 1 });
    TaskSchema.index({ questionId: 1, inspectionId: 1 });
} catch (_) {
    // ignore if indexes already exist
}