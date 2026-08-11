import { Router } from 'express';
import {
  subscribeNewsletter,
  unsubscribeNewsletter,
  getSubscribers,
  updateSubscriber,
  deleteSubscriber,
} from '../controllers/subscriberController.js';

const router = Router();

router.get('/', getSubscribers);
router.post('/', subscribeNewsletter);
router.post('/bulk', subscribeNewsletter);
router.post('/unsubscribe', unsubscribeNewsletter);
router.put('/:id', updateSubscriber);
router.delete('/:id', deleteSubscriber);

export default router;
