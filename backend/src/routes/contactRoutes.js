import { Router } from 'express';
import { submitContact, getContacts, updateContact, deleteContact } from '../controllers/contactController.js';
import { contactRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/', getContacts);
router.post('/', contactRateLimiter, submitContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

export default router;
