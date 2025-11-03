// backend/controllers/notifications.js

import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js'; // המודל החדש לשמירת מנויים
import webpush from 'web-push'; // החבילה החדשה שהתקנו

// הגדרת מפתחות VAPID לשליחת התראות מהקובץ .env
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:yoav@legenda.co.il', // אפשר לשנות לאימייל שלך
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID keys are not set in .env file. Push notifications will be disabled.');
}

/**
 * @desc    Get unread notifications for the logged-in user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ user: req.user.id, isRead: false })
        .sort({ createdAt: -1 })
        .limit(20);

    res.status(200).json({
        success: true,
        count: notifications.length,
        data: notifications
    });
});

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }

    if (notification.user.toString() !== req.user.id) {
        res.status(403);
        throw new Error('User not authorized to update this notification');
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ success: true, data: notification });
});

/**
 * @desc    Mark all notifications as read for the logged-in user
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { user: req.user.id, isRead: false },
        { $set: { isRead: true } }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

// --- פונקציות חדשות שהוספנו ---

/**
 * @desc    Subscribe user to push notifications
 * @route   POST /api/notifications/subscribe
 * @access  Private
 */
export const subscribe = asyncHandler(async (req, res) => {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        return res.status(500).json({ error: 'VAPID keys not configured on the server.' });
    }

    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Subscription object is invalid.' });
    }

    try {
        const existingSubscription = await PushSubscription.findOne({ 'subscription.endpoint': subscription.endpoint });

        if (existingSubscription) {
            return res.status(200).json({ msg: 'Subscription already exists.' });
        }

        const newSubscription = new PushSubscription({
            user: req.user.id,
            subscription: subscription,
        });

        await newSubscription.save();

        res.status(201).json({ msg: 'Successfully subscribed to notifications.' });
    } catch (err) {
        console.error('Error saving subscription:', err.message);
        res.status(500).send('Server Error');
    }
});


/**
 * Helper function to create a notification and send a push notification.
 * This function is exported to be used by other controllers (like tasks, inspections).
 */
export const createAndSendNotification = async (userId, type, message, relatedItem) => {
  try {
    // 1. Create notification in DB
    const notification = new Notification({
      user: userId,
      type,
      message,
      relatedItem,
      isRead: false
    });
    await notification.save();

    // 2. Send Push Notification if configured
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      const subscriptions = await PushSubscription.find({ user: userId });
      
      const payload = JSON.stringify({
        title: 'AuditsApp התראה חדשה',
        body: message,
        data: {
          url: '/', // אפשר להתאים את הלינק בעתיד
        },
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub.subscription, payload);
        } catch (error) {
          console.error('Error sending push notification, it might be expired:', error.statusCode);
          // If 410 (Gone), remove the subscription from the database
          if (error.statusCode === 410) {
            await PushSubscription.findByIdAndDelete(sub._id);
            console.log(`Expired subscription ${sub._id} deleted.`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to create notification for user ${userId}:`, error);
  }
};