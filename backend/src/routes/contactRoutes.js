import { Router } from 'express';
import { submitContact, getContacts, getContactById, updateContact, deleteContact } from '../controllers/contactController.js';
import { contactRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/', getContacts);
router.get('/:id', getContactById);
router.post('/', contactRateLimiter, submitContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

export default router;
