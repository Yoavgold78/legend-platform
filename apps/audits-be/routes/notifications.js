// backend/routes/notifications.js

import express from 'express';
import { trustGateway } from '../middleware/trustGateway.js';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    subscribe // <-- הוספנו את הפונקציה החדשה
} from '../controllers/notifications.js';

const router = express.Router();

// Get all unread notifications for the logged-in user
router.route('/').get(trustGateway, getNotifications);

// Mark a single notification as read
router.route('/:id/read').put(trustGateway, markAsRead);

// Mark all notifications as read
router.route('/read-all').put(trustGateway, markAllAsRead);

// --- הנתיב החדש שהוספנו ---
// Subscribe to push notifications
router.route('/subscribe').post(trustGateway, subscribe);
// -------------------------

export default router;