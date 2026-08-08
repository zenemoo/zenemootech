import express from 'express';
import {
  getApplications,
  submitApplication,
  updateApplication,
  deleteApplication,
  resyncApplication,
  resyncOpportunityApplications,
  sendConfirmationEmailEndpoint,
} from '../controllers/opportunityApplicationController.js';
import { applicationRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/', getApplications);
router.post('/', applicationRateLimiter, submitApplication);
router.post('/send-confirmation', sendConfirmationEmailEndpoint);
router.put('/:id', updateApplication);
router.delete('/:id', deleteApplication);
router.post('/:id/resync', resyncApplication);
router.post('/opportunity/:opportunity_id/resync-all', resyncOpportunityApplications);

export default router;
