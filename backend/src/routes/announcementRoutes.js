import express from 'express';
import {
  getActiveAnnouncements,
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  toggleAnnouncementStatus,
  reorderAnnouncements,
  deleteAnnouncement,
} from '../controllers/announcementController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Public: Get Active Announcements for Public Ticker (Zero Authentication Required)
router.get('/active', getActiveAnnouncements);

// Admin-Protected Endpoints (Requires verified Admin or SuperAdmin role)
router.get('/', verifyToken, requireRole(['admin', 'super_admin']), getAdminAnnouncements);
router.post('/', verifyToken, requireRole(['admin', 'super_admin']), createAnnouncement);
router.patch('/reorder', verifyToken, requireRole(['admin', 'super_admin']), reorderAnnouncements);
router.patch('/:id', verifyToken, requireRole(['admin', 'super_admin']), updateAnnouncement);
router.patch('/:id/status', verifyToken, requireRole(['admin', 'super_admin']), toggleAnnouncementStatus);
router.delete('/:id', verifyToken, requireRole(['admin', 'super_admin']), deleteAnnouncement);

export default router;
