import { Router } from 'express';
import { handleExportData } from '../controllers/exportController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Endpoint requires valid authentication & admin/hr RBAC authorization
router.post('/export', verifyToken, requireRole(['admin', 'super_admin', 'administrator', 'hr']), handleExportData);

export default router;
