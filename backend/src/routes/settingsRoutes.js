import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public Settings Fetch
router.get('/', getSettings);

// Admin Settings Update
router.put('/', verifyToken, requireRole(['admin']), updateSettings);

export default router;
