import { Router } from 'express';
import { getPartners, createPartner, reorderPartner, updatePartner, deletePartner } from '../controllers/partnerController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public Partners Display
router.get('/', getPartners);

// Admin Partners Management
router.post('/', verifyToken, requireRole(['admin']), createPartner);
router.put('/reorder', verifyToken, requireRole(['admin']), reorderPartner);
router.put('/:id', verifyToken, requireRole(['admin']), updatePartner);
router.delete('/:id', verifyToken, requireRole(['admin']), deletePartner);

export default router;
