// backend/models/PushSubscription.js

import mongoose from 'mongoose';

const PushSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subscription: {
    endpoint: { type: String, required: true, unique: true },
    expirationTime: { type: Number, default: null },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// שינינו את השורה הזו מ-module.exports ל-export default
export default mongoose.model('PushSubscription', PushSubscriptionSchema);