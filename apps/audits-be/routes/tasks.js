import express from 'express';
const router = express.Router();

import { createTask, getManagerTasks, markTaskCompleted, getTasksByInspection, getPreviousInspectionTasks, getAdminTasks, createAdminTask, updateAdminTask, deleteAdminTask } from '../controllers/tasks.js'; // Updated import

// Middleware for authentication
import { trustGateway, admin } from '../middleware/trustGateway.js';

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.route('/').post(trustGateway, createTask);


// NEW ROUTE ADDED
// @route   GET /api/tasks/mytasks
// @desc    Get tasks for the logged-in manager
// @access  Private
router.route('/mytasks').get(trustGateway, getManagerTasks);

// @route   PUT /api/tasks/:id/complete
// @desc    Mark task as
// completed by assigned manager
// @access  Private
router.route('/:id/complete').put(trustGateway, markTaskCompleted);

// @route   GET /api/tasks/by-inspection/:inspectionId
// @desc    Get tasks for a given inspection
// @access  Private
router.route('/by-inspection/:inspectionId').get(trustGateway, getTasksByInspection);

// @route   GET /api/tasks/previous-for?storeId=&templateId=&before=
// @desc    Get tasks from the previous inspection matching store+template
// @access  Private
router.route('/previous-for').get(trustGateway, getPreviousInspectionTasks);

// Admin routes for task management
// @route   GET /api/tasks/admin
// @desc    Get all admin-created task templates
// @access  Private (Admin)
router.route('/admin').get(trustGateway, admin, getAdminTasks);

// @route   POST /api/tasks/admin
// @desc    Create a new admin task template
// @access  Private (Admin)
router.route('/admin').post(trustGateway, admin, createAdminTask);

// @route   PUT /api/tasks/admin/:id
// @desc    Update an admin task template
// @access  Private (Admin)
router.route('/admin/:id').put(trustGateway, admin, updateAdminTask);

// @route   DELETE /api/tasks/admin/:id
// @desc    Delete an admin task template
// @access  Private (Admin)
router.route('/admin/:id').delete(trustGateway, admin, deleteAdminTask);


export default router;