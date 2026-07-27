import { Router } from 'express';
import { submitContact, getContacts, deleteContact } from '../controllers/contactController.js';

const router = Router();

router.get('/', getContacts);
router.post('/', submitContact);
router.delete('/:id', deleteContact);

export default router;
