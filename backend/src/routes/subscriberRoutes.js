import { Router } from 'express';
import {
  subscribeNewsletter,
  unsubscribeNewsletter,
  getSubscribers,
  updateSubscriber,
  deleteSubscriber,
} from '../controllers/subscriberController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';
import { subscriberRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public Newsletter Subscription Endpoints
router.post('/', subscriberRateLimiter, subscribeNewsletter);
router.post('/bulk', subscriberRateLimiter, subscribeNewsletter);
router.post('/unsubscribe', subscriberRateLimiter, unsubscribeNewsletter);

// Admin Subscriber Management Endpoints
router.get('/', verifyToken, requireRole(['admin']), getSubscribers);
router.put('/:id', verifyToken, requireRole(['admin']), updateSubscriber);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteSubscriber);

export default router;
