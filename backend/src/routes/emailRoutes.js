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

const router = Router();

router.get('/diagnose', runEmailDiagnostics);
router.post('/diagnose', runEmailDiagnostics);

router.post('/send', sendEmail);
router.get('/history', getEmailHistory);
router.delete('/history/:id', deleteEmailHistory);

router.get('/drafts', getEmailDrafts);
router.post('/drafts', saveEmailDraft);
router.delete('/drafts/:id', deleteEmailDraft);

export default router;
