// backend/controllers/tasks.js

import Task from '../models/Task.js';
import Store from '../models/Store.js';
import User from '../models/User.js';
import Inspection from '../models/Inspection.js';
// --- 1. ייבאנו את הפונקציה החדשה והסרנו את הישנות ---
import { createAndSendNotification } from './notifications.js';
import asyncHandler from 'express-async-handler';
// ----------------------------------------------------

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private (Inspectors)
export const createTask = asyncHandler(async (req, res) => {
    const {
        inspectionId,
        storeId,
        questionId,
        description,
        dueDate,
        priority,
        originatingQuestionText,
    } = req.body;

    const createdBy = req.user.id; 

    const store = await Store.findById(storeId);
    if (!store) {
        res.status(404);
        throw new Error('Store not found');
    }

    let assignedToIds = [];
    if (store.assignedManagers && Array.isArray(store.assignedManagers) && store.assignedManagers.length > 0) {
        assignedToIds = store.assignedManagers;
    }

    const task = new Task({
        inspectionId,
        storeId,
        assignedTo: assignedToIds,
        createdBy,
        questionId,
        description,
        dueDate,
        priority,
        originatingQuestionText,
    });

    const createdTask = await task.save();

    // --- 2. START: שימוש בפונקציה החדשה ---
    if (assignedToIds.length > 0) {
        const message = `הוקצתה לך משימה חדשה בחנות '${store.name}': ${description}`;
        const relatedItem = { kind: 'Task', item: createdTask._id };
        
        for (const managerId of assignedToIds) {
            // קוראים לפונקציה שיודעת לשלוח גם Push Notification
            await createAndSendNotification(managerId, 'NEW_TASK', message, relatedItem);
        }
    }
    // --- END ---

    res.status(201).json(createdTask);
});


// @desc    Get tasks assigned to the logged-in manager
// @route   GET /api/tasks/mytasks?storeId=xxx
// @access  Private (Managers)
export const getManagerTasks = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { storeId } = req.query;

    const filter = {
        assignedTo: userId,
    };

    if (storeId && storeId !== 'all') {
        filter.storeId = storeId;
    }

    const tasks = await Task.find(filter)
        .populate('storeId', 'name')
        .populate('createdBy', 'name')
        .sort({ dueDate: 1 });

    if (tasks) {
        res.json(tasks);
    } else {
        res.status(404);
        throw new Error('Tasks not found');
    }
});


// @desc    Mark a task as completed by an assigned manager
// @route   PUT /api/tasks/:id/complete
// @access  Private (Managers assigned to the task)
export const markTaskCompleted = asyncHandler(async (req, res) => {
    const taskId = req.params.id;
    const userId = req.user.id;
    const { proofImageUrls = [], managerComment } = req.body || {};

    if (!Array.isArray(proofImageUrls) || proofImageUrls.length === 0) {
        res.status(400);
        throw new Error('At least one proof image is required');
    }

    const task = await Task.findById(taskId);
    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    const isAssigned = (task.assignedTo || []).some(id => String(id) === String(userId));
    if (!isAssigned) {
        res.status(403);
        throw new Error('Not authorized to complete this task');
    }

    task.status = 'Completed';
    task.completedAt = new Date();
    task.proofImageUrls = proofImageUrls;
    if (managerComment) task.managerComment = managerComment;

    const updatedTask = await task.save();

    // --- 3. START: שימוש בפונקציה החדשה גם כאן ---
    const manager = await User.findById(userId);
    const store = await Store.findById(task.storeId);
    if (manager && store) {
        const message = `משימה בחנות '${store.name}' הושלמה על ידי ${manager.fullName}`;
        const relatedItem = { kind: 'Task', item: updatedTask._id };

        // 1. Notify all admins
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            await createAndSendNotification(admin._id, 'TASK_COMPLETED', message, relatedItem);
        }

        // 2. Notify the inspector who created the task
        if (task.createdBy) {
            await createAndSendNotification(task.createdBy, 'TASK_COMPLETED', message, relatedItem);
        }
    }
    // --- END ---

    await updatedTask.populate({ path: 'storeId', select: 'name' });
    await updatedTask.populate({ path: 'createdBy', select: 'name' });
    res.json(updatedTask);
});

// @desc    Get tasks for a specific inspection
// @route   GET /api/tasks/by-inspection/:inspectionId
// @access  Private
export const getTasksByInspection = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;
    const tasks = await Task.find({ inspectionId })
        .select('questionId originatingQuestionText description status priority dueDate completedAt managerComment proofImageUrl proofImageUrls storeId')
        .populate('storeId', 'name');
    res.json(tasks);
});

// @desc    Get tasks from the previous inspection for same store+template
// @route   GET /api/tasks/previous-for?storeId=...&templateId=...&before=<iso>
// @access  Private
export const getPreviousInspectionTasks = asyncHandler(async (req, res) => {
    const { storeId, templateId, before } = req.query;
    if (!storeId || !templateId) {
        res.status(400);
        throw new Error('storeId and templateId are required');
    }
    const beforeDate = before ? new Date(String(before)) : new Date();
    const prev = await Inspection.findOne({ storeId, templateId, createdAt: { $lt: beforeDate } })
        .sort({ createdAt: -1 })
        .select('_id');
    if (!prev) return res.json([]);
    const tasks = await Task.find({ inspectionId: prev._id })
        .select('questionId originatingQuestionText description status priority dueDate completedAt managerComment proofImageUrl proofImageUrls storeId')
        .populate('storeId', 'name');
    res.json(tasks);
});

// @desc    Get all admin-created task templates
// @route   GET /api/tasks/admin
// @access  Private (Admin)
export const getAdminTasks = asyncHandler(async (req, res) => {
    const tasks = await Task.find({ isTemplate: true })
        .populate('createdBy', 'fullName name email')
        .sort({ createdAt: -1 });
    
    res.json(tasks);
});

// @desc    Create a new admin task template
// @route   POST /api/tasks/admin
// @access  Private (Admin)
export const createAdminTask = asyncHandler(async (req, res) => {
    const { name, description, priority = 'Normal' } = req.body;

    if (!description || !description.trim()) {
        res.status(400);
        throw new Error('Task description is required');
    }

    const task = new Task({
        name: name?.trim(),
        description: description.trim(),
        priority,
        createdBy: req.user.id,
        isTemplate: true
    });

    const createdTask = await task.save();
    await createdTask.populate('createdBy', 'fullName name email');
    
    res.status(201).json(createdTask);
});

// @desc    Update an admin task template
// @route   PUT /api/tasks/admin/:id
// @access  Private (Admin)
export const updateAdminTask = asyncHandler(async (req, res) => {
    const { name, description, priority } = req.body;

    const task = await Task.findById(req.params.id);
    
    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    if (!task.isTemplate) {
        res.status(400);
        throw new Error('Can only update admin task templates');
    }

    if (name !== undefined) task.name = name.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined) task.priority = priority;

    const updatedTask = await task.save();
    await updatedTask.populate('createdBy', 'fullName name email');
    
    res.json(updatedTask);
});

// @desc    Delete an admin task template
// @route   DELETE /api/tasks/admin/:id
// @access  Private (Admin)
export const deleteAdminTask = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    if (!task.isTemplate) {
        res.status(400);
        throw new Error('Can only delete admin task templates');
    }

    await task.deleteOne();
    res.json({ message: 'Task template deleted successfully' });
});