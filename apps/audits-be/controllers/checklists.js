// backend/controllers/checklists.js

import ChecklistTemplate from '../models/ChecklistTemplate.js';
import ChecklistInstance from '../models/ChecklistInstance.js';
import Store from '../models/Store.js';
import User from '../models/User.js'; // --- הוספנו את מודל המשתמשים ---
import Notification from '../models/Notification.js'; // --- הוספנו את מודל ההתראות ---
import { createAndSendNotification } from './notifications.js'; // --- הוספנו עבור push notifications ---

// --- הוספנו פונקציית עזר ליצירת התראות ---
const createNotification = async (user, type, message, relatedItem) => {
    try {
        await Notification.create({
            user,
            type,
            message,
            relatedItem
        });
    } catch (error) {
        console.error(`Failed to create notification for user ${user}:`, error);
    }
};
// ------------------------------------------

/**
 * @desc    Create a new checklist template OR a scheduled task
 * @route   POST /api/checklists
 */
export const createChecklistTemplate = async (req, res) => {
  try {
    const { name, description, store, tasks, schedule, type, taskType, parentTemplate, universalTemplateId } = req.body;
    
    // Basic validation
    if (!name || !type) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    // Task-specific validation
    if (type === 'task') {
      if (!taskType) {
        return res.status(400).json({ message: 'taskType is required for task items.' });
      }
      
      // Universal template validation (admin creates templates)
      if (taskType === 'universal' && !universalTemplateId) {
        // This is a universal template creation
        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
          return res.status(400).json({ message: 'Universal task templates must have task items.' });
        }
        if (store) {
          return res.status(400).json({ message: 'Universal task templates cannot be assigned to a specific store.' });
        }
        if (schedule) {
          return res.status(400).json({ message: 'Universal task templates should not have schedules.' });
        }
      }
      
      // Universal instance validation (manager schedules templates)
      if (taskType === 'universal' && universalTemplateId) {
        if (!store) {
          return res.status(400).json({ message: 'Universal task instances must be assigned to a store.' });
        }
        if (!schedule) {
          return res.status(400).json({ message: 'Universal task instances must have a schedule.' });
        }
      }
      
      // Store tasks must have a store
      if (taskType === 'store' && !store) {
        return res.status(400).json({ message: 'Store-specific tasks must be assigned to a store.' });
      }
    }

    // Template validation - templates need a store and tasks
    if (type === 'template') {
      if (!store) {
        return res.status(400).json({ message: 'Templates must be assigned to a store.' });
      }
      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ message: 'Templates must have task items.' });
      }
      if (!schedule) {
        return res.status(400).json({ message: 'Templates must have a schedule.' });
      }
    }

    // Verify store exists if provided
    if (store) {
      const storeExists = await Store.findById(store);
      if (!storeExists) {
        return res.status(404).json({ message: 'Store not found.' });
      }
    }

    const newTemplate = new ChecklistTemplate({
      name, 
      description, 
      store, 
      tasks, 
      schedule, 
      type, 
      taskType, 
      parentTemplate, 
      universalTemplateId,
      createdBy: req.user.id,
    });

    const savedTemplate = await newTemplate.save();
    res.status(201).json(savedTemplate);
  } catch (error) {
    console.error('Error creating checklist item:', error);
    res.status(500).json({ message: 'Server error while creating item.' });
  }
};

/**
 * @desc    Get all templates and tasks for a specific store.
 * Includes store-specific items and universal task instances.
 * @route   GET /api/checklists/templates
 */
export const getChecklistTemplatesForStore = async (req, res) => {
  try {
    const { storeId, allItems } = req.query;
    console.log('Debug - getChecklistTemplatesForStore called with:', { storeId, allItems }); // Debug log
    
    if (!storeId) {
      return res.status(400).json({ message: 'Store ID is required.' });
    }

    let storeItems = [];

    // Get store-specific items (including universal instances for this store)
    const storeQuery = {
      store: storeId,
      isActive: true,
    };

    // If not requesting all items, only get base templates for the store
    if (allItems !== 'true') {
      storeQuery.type = 'template';
    }

    console.log('Debug - Query being executed:', storeQuery); // Debug log

    // Important: do NOT populate universalTemplateId here so it remains an ObjectId (string)
    // Frontend logic compares by id; when populated, it becomes an object and breaks strict equality.
    // Also make sure to include 'store' and 'isUniversalTemplate' in the projection.
    storeItems = await ChecklistTemplate.find(storeQuery)
      .select('name type taskType schedule tasks description isActive parentTemplate universalTemplateId store isUniversalTemplate');

    console.log('Debug - Found items:', storeItems.length); // Debug log
    console.log('Debug - Items details:', storeItems); // Debug log

    res.status(200).json(storeItems);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Server error while fetching templates.' });
  }
};

/**
 * @desc    Get a single checklist item by ID
 * @route   GET /api/checklists/:id
 */
export const getChecklistTemplateById = async (req, res) => {
  try {
    const item = await ChecklistTemplate.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json(item);
  } catch (error) {
    console.error('Error fetching item by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Update a single checklist item by ID
 * @route   PUT /api/checklists/:id
 */
export const updateChecklistTemplate = async (req, res) => {
    try {
        // First, get the existing item to check permissions
        const existingItem = await ChecklistTemplate.findById(req.params.id);
        if (!existingItem) {
            return res.status(404).json({ message: 'Item not found' });
        }

    // Permissions: universal templates vs instances
    if (existingItem.type === 'task' && existingItem.taskType === 'universal') {
      const isTemplate = existingItem.isUniversalTemplate === true;

      // Universal templates (definition) are admin-only
      if (isTemplate && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators can update universal templates' });
      }

      // Universal instances (per-store schedules): managers may update schedule only
      if (!isTemplate && req.user.role !== 'admin') {
        const { schedule } = req.body || {};
        if (!schedule || !schedule.startTime || !schedule.endTime) {
          return res.status(400).json({ message: 'Universal task instances can only update schedule with start and end times.' });
        }

        // Build a sanitized update for non-admins: schedule only
        const sanitizedUpdate = {
          schedule: {
            type: schedule.type || existingItem.schedule?.type || 'daily',
            daysOfWeek: Array.isArray(schedule.daysOfWeek) ? schedule.daysOfWeek : (existingItem.schedule?.daysOfWeek || []),
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          },
        };

        const updatedInstance = await ChecklistTemplate.findByIdAndUpdate(
          req.params.id,
          sanitizedUpdate,
          { new: true, runValidators: true }
        );
        return res.status(200).json(updatedInstance);
      }
    }

        const updatedItem = await ChecklistTemplate.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedItem);
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Delete a single checklist item by ID
 * @route   DELETE /api/checklists/:id
 */
export const deleteChecklistTemplate = async (req, res) => {
    try {
        // First, get the existing item to check permissions
        const existingItem = await ChecklistTemplate.findById(req.params.id);
        if (!existingItem) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Check if user is trying to delete a universal task
        if (existingItem.type === 'task' && existingItem.taskType === 'universal') {
            // Only admin users can delete universal tasks
            if (req.user.role !== 'admin') {
                return res.status(403).json({ 
                    message: 'Only administrators can delete universal tasks' 
                });
            }
        }

        await ChecklistTemplate.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Get the currently active checklist for a specific store
 * @route   GET /api/checklists/store/:storeId/active
 */
export const getActiveChecklistForStore = async (req, res) => {
  try {
    const { storeId } = req.params;

    // --- התיקון נמצא כאן ---
    // קובעים את השעה הנוכחית לפי אזור הזמן של ישראל
    const now = new Date();
    const currentTime = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false });
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday...
    // ----------------------
    
    // Get store-specific items
    const storeItems = await ChecklistTemplate.find({ store: storeId, isActive: true });
    
    // Get universal tasks (admin-created tasks for all stores)
    const universalTasks = await ChecklistTemplate.find({ 
      type: 'task', 
      taskType: 'universal', 
      isActive: true 
    });
    
    const allItems = [...storeItems, ...universalTasks];
    
    if (!allItems || allItems.length === 0) {
      return res.status(200).json([]);
    }
    
    // Changed: Find ALL active templates instead of just one
    let activeTemplates = allItems.filter(item => {
      if (item.type !== 'template') return false;
      const { schedule } = item;
      // ההשוואה מתבצעת כעת עם השעה הנכונה בישראל
      const isTimeMatch = currentTime >= schedule.startTime && currentTime <= schedule.endTime;
      if (!isTimeMatch) return false;
      if (schedule.type === 'daily') return true;
      if (schedule.type === 'weekly' && schedule.daysOfWeek.includes(currentDay)) return true;
      return false;
    });

    if (!activeTemplates || activeTemplates.length === 0) {
      return res.status(200).json([]);
    }

    // Process each active template to include scheduled tasks
    const processedTemplates = activeTemplates.map(activeTemplate => {
      // Find both store-specific and universal scheduled tasks for this template
      const scheduledTasks = allItems.filter(item => {
        if (item.type !== 'task') return false;
        
        // Include universal tasks or tasks linked to this template
        const isUniversal = item.taskType === 'universal';
        const isLinkedToTemplate = item.parentTemplate?.toString() === activeTemplate._id.toString();
        
        if (!isUniversal && !isLinkedToTemplate) return false;
        
        const { schedule } = item;
        // Check if schedule exists and has required properties
        if (!schedule || !schedule.startTime || !schedule.endTime) return false;
        
        const isTimeMatch = currentTime >= schedule.startTime && currentTime <= schedule.endTime;
        if (!isTimeMatch) return false;
        if (schedule.type === 'daily') return true;
        if (schedule.type === 'weekly' && schedule.daysOfWeek.includes(currentDay)) return true;
        return false;
      });

      // Create a copy of the template and add scheduled tasks
      let processedTemplate = activeTemplate.toObject();
      if (scheduledTasks.length > 0) {
        scheduledTasks.forEach(scheduledTask => {
          processedTemplate.tasks.push(...scheduledTask.tasks);
        });
      }
      
      return processedTemplate;
    });

    res.status(200).json(processedTemplates);

  } catch (error) {
    console.error('Error fetching active checklist:', error);
    res.status(500).json({ message: 'Server error while fetching active checklist.' });
  }
};

/**
 * @desc    Get all universal task templates (admin-created templates for all stores)
 * @route   GET /api/checklists/universal
 */
export const getUniversalTasks = async (req, res) => {
  try {
    const universalTasks = await ChecklistTemplate.find({
      type: 'task',
      taskType: 'universal',
      isUniversalTemplate: true, // Only templates, not instances
      isActive: true,
    }).select('name type taskType tasks description isActive createdBy createdAt');

    res.status(200).json(universalTasks);
  } catch (error) {
    console.error('Error fetching universal tasks:', error);
    res.status(500).json({ message: 'Server error while fetching universal tasks.' });
  }
};

/**
 * @desc    Get available universal task templates for managers to schedule
 * @route   GET /api/checklists/universal-templates
 */
export const getUniversalTemplates = async (req, res) => {
  try {
    const templates = await ChecklistTemplate.find({
      type: 'task',
      taskType: 'universal',
      isUniversalTemplate: true,
      isActive: true,
    }).select('name description tasks');

    res.status(200).json(templates);
  } catch (error) {
    console.error('Error fetching universal templates:', error);
    res.status(500).json({ message: 'Server error while fetching universal templates.' });
  }
};

/**
 * @desc    Submit a completed checklist instance
 * @route   POST /api/checklist-instances
 */
export const submitChecklistInstance = async (req, res) => {
  try {
    const { template, store, date, taskResults } = req.body;

    if (!template || !store || !date || !taskResults) {
      return res.status(400).json({ message: 'Missing required fields for submission.' });
    }

    const newInstance = new ChecklistInstance({
      template,
      store,
      date,
      taskResults,
      completedBy: req.user.id,
      status: 'completed',
      completionTimestamp: new Date(),
    });

    const savedInstance = await newInstance.save();

    // --- START: NOTIFICATION LOGIC ---
    const employee = await User.findById(req.user.id);
    const storeInfo = await Store.findById(store);
    const templateInfo = await ChecklistTemplate.findById(template);

    if (employee && storeInfo && templateInfo && storeInfo.assignedManagers.length > 0) {
        const message = `צ'קליסט '${templateInfo.name}' הושלם בחנות '${storeInfo.name}' על ידי ${employee.fullName}.`;
        const relatedItem = { kind: 'ChecklistInstance', item: savedInstance._id };

        // Notify all assigned managers of the store with BOTH dashboard notifications AND push notifications
        for (const managerId of storeInfo.assignedManagers) {
            // Dashboard notification
            await createNotification(managerId, 'CHECKLIST_COMPLETED', message, relatedItem);
            // Push notification
            await createAndSendNotification(managerId, 'CHECKLIST_COMPLETED', message, relatedItem);
        }
    }
    // --- END: NOTIFICATION LOGIC ---

    res.status(201).json(savedInstance);

  } catch (error) {
    console.error('Error submitting checklist instance:', error);
    res.status(500).json({ message: 'Server error while submitting instance.' });
  }
};