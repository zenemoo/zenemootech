import express from 'express';
import {
  getShortenerStats,
  getShortenerLinks,
  getShortenerLinkByCode,
  createShortenerLink,
  updateShortenerLink,
  toggleShortenerLinkStatus,
  deleteShortenerLink,
  exportShortenerLinksCsv,
} from '../controllers/shortenerController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Public lookup endpoint for redirection (accessible without admin JWT for visitor redirects)
router.get('/links/:code', getShortenerLinkByCode);

// Strict Admin-Only Authorization Guard applied to administrative management routes below
router.use(verifyToken);
router.use(requireRole(['admin', 'super_admin']));

// Statistics overview
router.get('/stats', getShortenerStats);

// CSV Export
router.get('/export/csv', exportShortenerLinksCsv);

// CRUD operations
router.get('/links', getShortenerLinks);
router.post('/links', createShortenerLink);
router.patch('/links/:code', updateShortenerLink);
router.patch('/links/:code/status', toggleShortenerLinkStatus);
router.delete('/links/:code', deleteShortenerLink);

export default router;
