import express from 'express';
import {
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  reorderOpportunity,
  deleteOpportunity,
} from '../controllers/opportunityController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Public opportunity listing
router.get('/', getOpportunities);

// Admin-only management endpoints
router.post('/', verifyToken, requireRole(['admin']), createOpportunity);
router.put('/:id', verifyToken, requireRole(['admin']), updateOpportunity);
router.put('/:id/reorder', verifyToken, requireRole(['admin']), reorderOpportunity);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteOpportunity);

export default router;
