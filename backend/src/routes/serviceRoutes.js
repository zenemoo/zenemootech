import { Router } from 'express';
import { getServices, createService, updateService, deleteService } from '../controllers/serviceController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public Services Display
router.get('/', getServices);

// Admin Services Management
router.post('/', verifyToken, requireRole(['admin']), createService);
router.put('/:id', verifyToken, requireRole(['admin']), updateService);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteService);

export default router;
