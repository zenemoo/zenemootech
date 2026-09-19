import { Router } from 'express';
import {
  sendEmail,
  getEmailHistory,
  getEmailHistoryById,
  deleteEmailHistory,
  getEmailDrafts,
  saveEmailDraft,
  deleteEmailDraft,
  runEmailDiagnostics,
} from '../controllers/emailController.js';
import {
  getIncomingEmails,
  getSentEmails,
  sendInboxEmail,
} from '../controllers/emailInboxController.js';
import { verifyToken, requireRole, requireEmailAccess } from '../middleware/rbacMiddleware.js';
import { emailSendRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Production Live Diagnostic Suite (Admin Only)
router.get('/diagnose', verifyToken, requireRole(['admin']), runEmailDiagnostics);
router.post('/diagnose', verifyToken, requireRole(['admin']), runEmailDiagnostics);

// Email operations (Permitted for Admin, HR, or authorized members with email_access=true)
router.post('/send', verifyToken, requireEmailAccess, emailSendRateLimiter, sendEmail);
router.post('/reply', verifyToken, requireEmailAccess, emailSendRateLimiter, sendInboxEmail);
router.post('/forward', verifyToken, requireEmailAccess, emailSendRateLimiter, sendInboxEmail);
router.get('/sent', verifyToken, requireEmailAccess, getSentEmails);
router.get('/inbox', verifyToken, requireEmailAccess, getIncomingEmails);
router.get('/history', verifyToken, requireEmailAccess, getEmailHistory);
router.get('/history/:id', verifyToken, requireEmailAccess, getEmailHistoryById);
router.delete('/history/:id', verifyToken, requireEmailAccess, deleteEmailHistory);

router.get('/drafts', verifyToken, requireEmailAccess, getEmailDrafts);
router.post('/drafts', verifyToken, requireEmailAccess, saveEmailDraft);
router.delete('/drafts/:id', verifyToken, requireEmailAccess, deleteEmailDraft);

export default router;
