// backend/models/Notification.js

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    // The user who should receive the notification
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // The notification message
    message: {
        type: String,
        required: true
    },
    // Type of notification for potential frontend logic (e.g., icons)
    type: {
        type: String,
        enum: [
            'NEW_INSPECTION',
            'NEW_TASK',
            'TASK_COMPLETED',
            'TASK_DUE_SOON',
            'TASK_EXPIRED',
            'CHECKLIST_COMPLETED'
        ],
        required: true
    },
    // Link to the relevant item (Inspection, Task, etc.)
    relatedItem: {
        kind: {
            type: String,
            enum: ['Inspection', 'Task', 'ChecklistInstance'],
            required: true
        },
        item: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'relatedItem.kind'
        }
    },
    // To track if the notification has been seen
    isRead: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);