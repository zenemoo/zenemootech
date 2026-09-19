import { Router } from 'express';
import { submitContact, getContacts, getContactById, updateContact, deleteContact } from '../controllers/contactController.js';
import { contactRateLimiter } from '../middleware/rateLimiter.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public Contact Form Submission
router.post('/', contactRateLimiter, submitContact);

// Admin Contact Inquiry Management
router.get('/', verifyToken, requireRole(['admin']), getContacts);
router.get('/:id', verifyToken, requireRole(['admin']), getContactById);
router.put('/:id', verifyToken, requireRole(['admin']), updateContact);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteContact);

export default router;
