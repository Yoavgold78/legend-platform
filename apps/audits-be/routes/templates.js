import express from 'express';
const router = express.Router();
import { trustGateway, admin } from '../middleware/trustGateway.js';
import {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/templates.js';



router
  .route('/')
  // GET /api/templates - יכול לקבל עכשיו פרמטר 'storeId'
  .get(trustGateway, getTemplates)
  .post(trustGateway, admin, createTemplate);

router
  .route('/:id')
  .get(trustGateway, getTemplate)
  .put(trustGateway, admin, updateTemplate)
  .delete(trustGateway, admin, deleteTemplate);



export default router;