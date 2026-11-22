import express from 'express';
import {
  getOpportunities,
  getAdminOpportunities,
  createOpportunity,
  updateOpportunity,
  reorderOpportunity,
  deleteOpportunity,
  getNextProjectCodePreview,
  getOpportunityOgImage,
  getOpportunityShareCard,
} from '../controllers/opportunityController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Public opportunity listing (only active & coming_soon)
router.get('/', getOpportunities);

// Auto-generated next Project ID preview helper
router.get('/next-code', verifyToken, requireRole(['admin']), getNextProjectCodePreview);

// Public Social Share & Open Graph Card Image generator (Design 2 Minimalist Obsidian)
router.get('/:id/og-image', getOpportunityOgImage);
router.get('/:id/share-card', getOpportunityShareCard);

// Admin-only management endpoints
router.get('/admin/all', verifyToken, requireRole(['admin']), getAdminOpportunities);
router.post('/', verifyToken, requireRole(['admin']), createOpportunity);
router.put('/:id', verifyToken, requireRole(['admin']), updateOpportunity);
router.put('/:id/reorder', verifyToken, requireRole(['admin']), reorderOpportunity);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteOpportunity);

export default router;
