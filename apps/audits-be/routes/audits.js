import express from 'express';
const router = express.Router();
import { trustGateway, admin } from '../middleware/trustGateway.js';

router.get('/', trustGateway, (req, res) => {
    res.json({ msg: 'Welcome to the audits section' });
});

router.get('/admin', trustGateway, admin, (req, res) => {
    res.json({ msg: 'Welcome to the admin section' });
});

export default router;