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
import { verifyToken, requireEmailAccess } from '../middleware/rbacMiddleware.js';

const router = Router();

router.get('/diagnose', runEmailDiagnostics);
router.post('/diagnose', runEmailDiagnostics);

// Email operations (Permitted for Admin, HR, or authorized members with email_access=true)
router.post('/send', verifyToken, requireEmailAccess, sendEmail);
router.get('/history', verifyToken, requireEmailAccess, getEmailHistory);
router.delete('/history/:id', verifyToken, requireEmailAccess, deleteEmailHistory);

router.get('/drafts', verifyToken, requireEmailAccess, getEmailDrafts);
router.post('/drafts', verifyToken, requireEmailAccess, saveEmailDraft);
router.delete('/drafts/:id', verifyToken, requireEmailAccess, deleteEmailDraft);

export default router;
