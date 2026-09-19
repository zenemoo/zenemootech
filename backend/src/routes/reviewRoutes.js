import express from 'express';
import {
  getPublicReviews,
  submitReview,
  getAdminReviews,
  updateReview,
  deleteReview,
  publishAllPending,
  bulkPublish,
  bulkDelete,
} from '../controllers/reviewController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';
import { reviewRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public Endpoints
router.get('/', getPublicReviews);
router.post('/', reviewRateLimiter, submitReview);

// Admin Moderation Endpoints
router.get('/admin/all', verifyToken, requireRole(['admin']), getAdminReviews);
router.put('/admin/:id', verifyToken, requireRole(['admin']), updateReview);
router.delete('/admin/:id', verifyToken, requireRole(['admin']), deleteReview);
router.post('/admin/publish-all-pending', verifyToken, requireRole(['admin']), publishAllPending);
router.post('/admin/bulk-publish', verifyToken, requireRole(['admin']), bulkPublish);
router.post('/admin/bulk-delete', verifyToken, requireRole(['admin']), bulkDelete);

export default router;
