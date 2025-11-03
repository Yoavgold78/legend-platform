// backend/routes/checklists.js

import express from 'express';
import { 
  createChecklistTemplate, 
  getActiveChecklistForStore,
  getChecklistTemplatesForStore,
  getChecklistTemplateById,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  getUniversalTasks,
  getUniversalTemplates
} from '../controllers/checklists.js';
import { trustGateway } from '../middleware/trustGateway.js';

const router = express.Router(); 

// @route   POST /api/checklists
// @desc    Create a new checklist item
router.route('/').post(trustGateway, createChecklistTemplate);

// @route   GET /api/checklists/templates
// @desc    Get all templates for a store
router.route('/templates').get(trustGateway, getChecklistTemplatesForStore);

// @route   GET /api/checklists/universal
// @desc    Get all universal tasks (admin only)
router.route('/universal').get(trustGateway, getUniversalTasks);

// @route   GET /api/checklists/universal-templates
// @desc    Get all universal task templates for managers to schedule
router.route('/universal-templates').get(trustGateway, getUniversalTemplates);

// @route   GET /api/checklists/store/:storeId/active
// @desc    Get the active checklist for a store
router.route('/store/:storeId/active').get(trustGateway, getActiveChecklistForStore);

// --- נתיבים חדשים ---

// @route   GET /api/checklists/:id
// @desc    Get a single checklist item by ID
router.route('/:id').get(trustGateway, getChecklistTemplateById);

// @route   PUT /api/checklists/:id
// @desc    Update a single checklist item by ID
router.route('/:id').put(trustGateway, updateChecklistTemplate);

// @route   DELETE /api/checklists/:id
// @desc    Delete a single checklist item by ID
router.route('/:id').delete(trustGateway, deleteChecklistTemplate);

// --------------------

export default router;