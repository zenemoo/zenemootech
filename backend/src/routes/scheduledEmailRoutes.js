import express from 'express';
import {
  createScheduledEmail,
  getScheduledEmails,
  getScheduledEmailById,
  updateScheduledEmail,
  cancelScheduledEmail,
  retryScheduledEmail,
  processScheduledEmailsEndpoint,
} from '../controllers/scheduledEmailController.js';
import { verifyToken, requireEmailAccess } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Cloudflare Cron Webhook Endpoint (Authenticated via x-zenemoo-scheduler-secret header)
router.post('/process', processScheduledEmailsEndpoint);

// Scheduled Email management routes (Admin authenticated)
router.post('/', verifyToken, requireEmailAccess, createScheduledEmail);
router.get('/', verifyToken, requireEmailAccess, getScheduledEmails);
router.get('/:id', verifyToken, requireEmailAccess, getScheduledEmailById);
router.patch('/:id', verifyToken, requireEmailAccess, updateScheduledEmail);
router.post('/:id/cancel', verifyToken, requireEmailAccess, cancelScheduledEmail);
router.post('/:id/retry', verifyToken, requireEmailAccess, retryScheduledEmail);

export default router;
