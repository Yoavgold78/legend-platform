// backend/routes/checklistInstances.js

import express from 'express';
const router = express.Router();
import { submitChecklistInstance } from '../controllers/checklists.js';
import { trustGateway } from '../middleware/trustGateway.js';
// @route   POST /api/checklist-instances
// @desc    Submit a completed checklist instance
// @access  Private
router.route('/').post(trustGateway, submitChecklistInstance);

export default router;