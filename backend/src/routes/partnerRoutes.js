import { Router } from 'express';
import { getPartners, createPartner, reorderPartner, updatePartner, deletePartner } from '../controllers/partnerController.js';
import { partnerRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/', getPartners);
router.post('/', partnerRateLimiter, createPartner);
router.put('/reorder', reorderPartner);
router.put('/:id', updatePartner);
router.delete('/:id', deletePartner);

export default router;
