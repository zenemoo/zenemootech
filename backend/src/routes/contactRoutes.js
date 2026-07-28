import { Router } from 'express';
import { submitContact, getContacts, updateContact, deleteContact } from '../controllers/contactController.js';

const router = Router();

router.get('/', getContacts);
router.post('/', submitContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

export default router;
