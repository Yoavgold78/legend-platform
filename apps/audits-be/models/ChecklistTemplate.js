// backend/models/ChecklistTemplate.js

import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Task text is required'],
    trim: true,
  },
  requiresPhoto: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

const scheduleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['daily', 'weekly'],
    required: function() {
      // Schedule is required for templates, store tasks, and universal task instances
      const parent = this.parent && this.parent();
      if (!parent) return true; // Default to required during updates when parent context is unavailable
      
      return parent.type === 'template' || 
             (parent.type === 'task' && parent.taskType === 'store') ||
             (parent.type === 'task' && parent.taskType === 'universal' && parent.universalTemplateId);
    },
  },
  daysOfWeek: {
    type: [Number],
    validate: [
      (val) => val.length === 0 || val.every(day => day >= 0 && day <= 6),
      'Days must be between 0 (Sunday) and 6 (Saturday)'
    ],
  },
  startTime: {
    type: String,
    required: function() {
      return this.type !== undefined; // Required if schedule type is set
    },
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:mm format'],
  },
  endTime: {
    type: String,
    required: function() {
      return this.type !== undefined; // Required if schedule type is set
    },
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:mm format'],
  },
}, { _id: false });

const checklistTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Checklist name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: function() {
      // Store is required only for store-specific tasks and templates
      return this.type === 'template' || this.taskType === 'store';
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tasks: [taskSchema],
  schedule: {
    type: scheduleSchema,
    required: function() {
      // Schedule required for templates, store tasks, and scheduled universal instances
      return this.type === 'template' || 
             (this.type === 'task' && this.taskType === 'store') ||
             (this.type === 'task' && this.taskType === 'universal' && this.universalTemplateId);
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // --- Updated fields for task types ---
  type: {
    type: String,
    enum: ['template', 'task'], // 'template' for base, 'task' for scheduled task
    default: 'template',
  },
  taskType: {
    type: String,
    enum: ['universal', 'store'], // 'universal' for admin tasks, 'store' for manager tasks
    required: function() {
      return this.type === 'task';
    },
  },
  parentTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChecklistTemplate',
    default: null, // Only relevant if type is 'task'
  },
  // New field for universal task instances
  universalTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChecklistTemplate',
    required: function() {
      return this.type === 'task' && this.taskType === 'universal' && !this.isUniversalTemplate;
    },
  },
  // Flag to distinguish universal templates from universal instances
  isUniversalTemplate: {
    type: Boolean,
    default: function() {
      return this.type === 'task' && this.taskType === 'universal' && !this.universalTemplateId;
    },
  },
  // -------------------------

}, { timestamps: true });

// Indexes for better performance
checklistTemplateSchema.index({ type: 1, taskType: 1 });
checklistTemplateSchema.index({ store: 1, type: 1 });
checklistTemplateSchema.index({ createdBy: 1, type: 1 });

// Validation middleware
checklistTemplateSchema.pre('save', function(next) {
  // If it's a universal template, ensure no store is assigned and no schedule
  if (this.type === 'task' && this.taskType === 'universal' && this.isUniversalTemplate) {
    if (this.store) {
      return next(new Error('Universal task templates cannot be assigned to a specific store'));
    }
    if (this.schedule && (this.schedule.type || this.schedule.startTime || this.schedule.endTime)) {
      return next(new Error('Universal task templates should not have schedules'));
    }
  }
  
  // If it's a universal instance, ensure store is assigned and has universalTemplateId
  if (this.type === 'task' && this.taskType === 'universal' && !this.isUniversalTemplate) {
    if (!this.store) {
      return next(new Error('Universal task instances must be assigned to a store'));
    }
    if (!this.universalTemplateId) {
      return next(new Error('Universal task instances must reference a universal template'));
    }
  }
  
  // If it's a store task, ensure store is assigned
  if (this.type === 'task' && this.taskType === 'store' && !this.store) {
    return next(new Error('Store-specific tasks must be assigned to a store'));
  }
  
  next();
});

export default mongoose.model('ChecklistTemplate', checklistTemplateSchema);