import express from 'express';
import {
  getApplications,
  submitApplication,
  updateApplication,
  deleteApplication,
} from '../controllers/opportunityApplicationController.js';
import { applicationRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/', getApplications);
router.post('/', applicationRateLimiter, submitApplication);
router.put('/:id', updateApplication);
router.delete('/:id', deleteApplication);

export default router;
