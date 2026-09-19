import express from 'express';
import {
  getApplications,
  getApplicationById,
  checkDuplicateApplication,
  submitApplication,
  updateApplication,
  deleteApplication,
  resyncApplication,
  resyncOpportunityApplications,
  sendConfirmationEmailEndpoint,
  resendAcceptanceEmailEndpoint,
} from '../controllers/opportunityApplicationController.js';
import { applicationRateLimiter } from '../middleware/rateLimiter.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Public Applicant Endpoints
router.post('/', applicationRateLimiter, submitApplication);
router.get('/check-duplicate', checkDuplicateApplication);
router.post('/send-confirmation', sendConfirmationEmailEndpoint);

// Protected Admin / HR Review Endpoints
router.get('/', verifyToken, requireRole(['admin', 'hr']), getApplications);
router.get('/:id', verifyToken, requireRole(['admin', 'hr']), getApplicationById);
router.put('/:id', verifyToken, requireRole(['admin', 'hr']), updateApplication);
router.post('/:id/resend-acceptance', verifyToken, requireRole(['admin', 'hr']), resendAcceptanceEmailEndpoint);

// Administrative Deletion and Sheet Resync
router.delete('/:id', verifyToken, requireRole(['admin']), deleteApplication);
router.post('/:id/resync', verifyToken, requireRole(['admin']), resyncApplication);
router.post('/opportunity/:opportunity_id/resync-all', verifyToken, requireRole(['admin']), resyncOpportunityApplications);

export default router;
