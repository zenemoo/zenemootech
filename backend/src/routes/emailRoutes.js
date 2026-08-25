import { Router } from 'express';
import {
  sendEmail,
  getEmailHistory,
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
import { verifyToken, requireEmailAccess } from '../middleware/rbacMiddleware.js';

const router = Router();

router.get('/diagnose', runEmailDiagnostics);
router.post('/diagnose', runEmailDiagnostics);

// Email operations (Permitted for Admin, HR, or authorized members with email_access=true)
router.post('/send', verifyToken, requireEmailAccess, sendEmail);
router.post('/reply', verifyToken, requireEmailAccess, sendInboxEmail);
router.post('/forward', verifyToken, requireEmailAccess, sendInboxEmail);
router.get('/sent', verifyToken, requireEmailAccess, getSentEmails);
router.get('/inbox', verifyToken, requireEmailAccess, getIncomingEmails);
router.get('/history', verifyToken, requireEmailAccess, getEmailHistory);
router.delete('/history/:id', verifyToken, requireEmailAccess, deleteEmailHistory);

router.get('/drafts', verifyToken, requireEmailAccess, getEmailDrafts);
router.post('/drafts', verifyToken, requireEmailAccess, saveEmailDraft);
router.delete('/drafts/:id', verifyToken, requireEmailAccess, deleteEmailDraft);

export default router;
