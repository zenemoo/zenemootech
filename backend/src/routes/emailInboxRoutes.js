import express from 'express';
import {
  getEmailAddresses,
  addEmailAddress,
  getIncomingEmails,
  getIncomingEmailById,
  updateIncomingEmailState,
  deleteIncomingEmail,
  ingestCloudflareEmail,
  getEmailStorageUsage,
} from '../controllers/emailInboxController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Cloudflare Email Routing Worker Ingestion Webhook (Secret Auth Header)
router.post('/webhook/cloudflare', ingestCloudflareEmail);

// Admin Authorized Email Inbox Routes
router.get('/storage-usage', verifyToken, requireRole(['admin']), getEmailStorageUsage);
router.get('/inbox', verifyToken, requireRole(['admin']), getIncomingEmails);
router.get('/inbox/:id', verifyToken, requireRole(['admin']), getIncomingEmailById);
router.patch('/inbox/:id', verifyToken, requireRole(['admin']), updateIncomingEmailState);
router.delete('/inbox/:id', verifyToken, requireRole(['admin']), deleteIncomingEmail);

// Admin Zenemoo Email Address Management Routes
router.get('/addresses', verifyToken, requireRole(['admin']), getEmailAddresses);
router.post('/addresses', verifyToken, requireRole(['admin']), addEmailAddress);

export default router;
