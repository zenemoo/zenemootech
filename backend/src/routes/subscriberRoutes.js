import { Router } from 'express';
import {
  subscribeNewsletter,
  getSubscribers,
  updateSubscriber,
  deleteSubscriber,
} from '../controllers/subscriberController.js';

const router = Router();

router.get('/', getSubscribers);
router.post('/', subscribeNewsletter);
router.put('/:id', updateSubscriber);
router.delete('/:id', deleteSubscriber);

export default router;
