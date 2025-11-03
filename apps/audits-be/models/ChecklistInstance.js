// backend/models/ChecklistInstance.js

import mongoose from 'mongoose';

const taskResultSchema = new mongoose.Schema({
  // Storing the original text in case the template changes
  taskText: {
    type: String,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  comment: {
    type: String,
    trim: true,
  },
  // URL from Cloudinary if a photo was required and uploaded
  photoUrl: {
    type: String,
    default: '',
  },
}, { _id: false });

const checklistInstanceSchema = new mongoose.Schema({
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChecklistTemplate',
    required: true,
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // The specific date for which this checklist was generated/completed
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'missed'],
    default: 'pending',
  },
  taskResults: [taskResultSchema],
  completionTimestamp: {
    type: Date,
  }
}, { timestamps: true });

export default mongoose.model('ChecklistInstance', checklistInstanceSchema);