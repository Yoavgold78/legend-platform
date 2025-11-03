import express from 'express';
import { trustGateway, admin } from '../middleware/trustGateway.js';
import {
  createStore,
  getStores,
  getStore,
  updateStore,
  deleteStore,
} from '../controllers/stores.js'; // Note the added '.js' extension

const router = express.Router();

// הגדרת נתיב לקבלת כל החנויות ויצירת חנות חדשה
router
  .route('/')
  // GET /api/stores - הסרנו את בדיקת ה-admin כדי שכל משתמש מחובר יוכל לראות את הרשימה
  .get(trustGateway, getStores)
  // POST /api/stores - השארנו את בדיקת ה-admin כדי שרק מנהלים יוכלו ליצור חנות
  .post(trustGateway, admin, createStore);

// הגדרת נתיב לפעולות על חנות ספציפית
router
  .route('/:id')
  // GET /api/stores/:id - הסרנו את בדיקת ה-admin כדי שכל משתמש מחובר יוכל לראות פרטי חנות
  .get(trustGateway, getStore)
  // PUT /api/stores/:id - השארנו את בדיקת ה-admin כדי שרק מנהלים יוכלו לעדכן
  .put(trustGateway, admin, updateStore)
  // DELETE /api/stores/:id - השארנו את בדיקת ה-admin כדי שרק מנהלים יוכלו למחוק
  .delete(trustGateway, admin, deleteStore);



export default router;