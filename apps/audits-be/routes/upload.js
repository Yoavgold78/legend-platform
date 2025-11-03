import express from 'express';
const router = express.Router();
import { trustGateway } from '../middleware/trustGateway.js';
import { uploadImage, uploadMiddleware } from '../controllers/upload.js';

router.post('/image', trustGateway, uploadMiddleware, uploadImage);

export default router;
