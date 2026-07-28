import express from 'express';
import {
  getApplications,
  submitApplication,
  updateApplication,
  deleteApplication,
} from '../controllers/opportunityApplicationController.js';

const router = express.Router();

router.get('/', getApplications);
router.post('/', submitApplication);
router.put('/:id', updateApplication);
router.delete('/:id', deleteApplication);

export default router;
