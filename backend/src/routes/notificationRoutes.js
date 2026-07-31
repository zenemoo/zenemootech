import { Router } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteUserNotification,
  createAdminNotification,
  deleteAdminNotification,
} from '../controllers/notificationController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// All notification routes require JWT verification
router.use(verifyToken);

// User Notification Endpoints (Admin, HR, Team Member)
router.get('/', getUserNotifications);
router.put('/read-all', markAllNotificationsAsRead);
router.put('/:id/read', markNotificationAsRead);
router.delete('/:id', deleteUserNotification);

// Admin Notification Dispatcher Endpoints
router.post('/', requireRole(['admin']), createAdminNotification);
router.delete('/admin/:id', requireRole(['admin']), deleteAdminNotification);

export default router;
