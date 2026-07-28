import express from 'express';
import {
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  reorderOpportunity,
  deleteOpportunity,
} from '../controllers/opportunityController.js';

const router = express.Router();

router.get('/', getOpportunities);
router.post('/', createOpportunity);
router.put('/:id', updateOpportunity);
router.put('/:id/reorder', reorderOpportunity);
router.delete('/:id', deleteOpportunity);

export default router;
