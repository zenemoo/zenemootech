import { Router } from 'express';
import {
  sendEmail,
  getEmailHistory,
  deleteEmailHistory,
  getEmailDrafts,
  saveEmailDraft,
  deleteEmailDraft,
} from '../controllers/emailController.js';

const router = Router();

router.post('/send', sendEmail);
router.get('/history', getEmailHistory);
router.delete('/history/:id', deleteEmailHistory);

router.get('/drafts', getEmailDrafts);
router.post('/drafts', saveEmailDraft);
router.delete('/drafts/:id', deleteEmailDraft);

export default router;
