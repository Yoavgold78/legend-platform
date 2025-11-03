import express from 'express';
import { trustGateway } from '../middleware/trustGateway.js';
import {
  createInspection,
  getInspections,
  getInspection, 
  getInspectionPdf,
  previewInspection,
  generateShareableLink, // I've added this new function
  getSharedInspection,   // And this one
  getPreviousInspectionAnswers,
} from '../controllers/inspections.js';

const router = express.Router();

// --- Public Route ---
// This route is for viewing a shared inspection and does NOT require a login.
// It's important to place it BEFORE other routes with parameters like '/:id'.
router.get('/share/:token', getSharedInspection);


// --- Protected Routes ---
// All routes below this line require a user to be logged in.
router.route('/')
  .post(trustGateway, createInspection)
  .get(trustGateway, getInspections);

router.route('/previous-answers').get(trustGateway, getPreviousInspectionAnswers);

router.route('/preview').post(trustGateway, previewInspection);

// Route to generate the shareable link for an inspection
router.route('/:id/share').post(trustGateway, generateShareableLink);

// Routes for a specific inspection by its ID
router.route('/:id').get(trustGateway, getInspection);
router.route('/:id/pdf').get(trustGateway, getInspectionPdf);

export default router;