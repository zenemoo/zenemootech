import express from 'express';
import {
  getEmailAddresses,
  addEmailAddress,
  getIncomingEmails,
  getSentEmails,
  getIncomingEmailById,
  updateIncomingEmailState,
  deleteIncomingEmail,
  ingestCloudflareEmail,
  getEmailStorageUsage,
  sendInboxEmail,
} from '../controllers/emailInboxController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Cloudflare Email Routing Worker Ingestion Webhook (Secret Auth Header)
router.post('/webhook/cloudflare', ingestCloudflareEmail);

// Admin Authorized Email Inbox Routes
router.get('/storage-usage', verifyToken, requireRole(['admin']), getEmailStorageUsage);
router.get('/inbox', verifyToken, requireRole(['admin']), getIncomingEmails);
router.get('/sent', verifyToken, requireRole(['admin']), getSentEmails);
router.post('/send', verifyToken, requireRole(['admin']), sendInboxEmail);
router.post('/reply', verifyToken, requireRole(['admin']), sendInboxEmail);
router.post('/forward', verifyToken, requireRole(['admin']), sendInboxEmail);
router.get('/inbox/:id', verifyToken, requireRole(['admin']), getIncomingEmailById);
router.patch('/inbox/:id', verifyToken, requireRole(['admin']), updateIncomingEmailState);
router.delete('/inbox/:id', verifyToken, requireRole(['admin']), deleteIncomingEmail);

// Admin Zenemoo Email Address Management Routes
router.get('/addresses', verifyToken, requireRole(['admin']), getEmailAddresses);
router.post('/addresses', verifyToken, requireRole(['admin']), addEmailAddress);

// Attachment Route Handlers
router.get('/inbox/:id/attachments/:attachmentId/url', verifyToken, requireRole(['admin']), (req, res) => {
  res.json({
    success: true,
    url: `/api/emails/inbox/${req.params.id}`,
    filename: 'attachment',
  });
});
router.get('/inbox/:id/attachments/:attachmentId', verifyToken, requireRole(['admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Attachment file download handler',
  });
});

export default router;
