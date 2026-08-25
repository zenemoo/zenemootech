import { Router } from 'express';
import {
  getVapidPublicKey,
  registerSubscription,
  getUserNotifications,
  getAdminNotifications,
  getAppVersionInfo,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteUserNotification,
  createAdminNotification,
  deleteAdminNotification,
} from '../controllers/notificationController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public Endpoints (No Login Required — for Public Web Visitors & Android App Users)
// Strictly returns public broadcast & announcement notifications only
router.get('/vapid-key', getVapidPublicKey);
router.get('/app-version', getAppVersionInfo);
router.post('/subscribe', registerSubscription);

// Public Notification History & Read Status (Supports both authenticated users & guests via installation_id)
router.get('/', getUserNotifications);
router.put('/read-all', markAllNotificationsAsRead);
router.put('/:id/read', markNotificationAsRead);
router.delete('/:id', deleteUserNotification);

// Admin Notification Center Endpoints (Strictly Require Admin Authentication)
router.get('/admin', verifyToken, requireRole(['admin']), getAdminNotifications);
router.post('/dispatch', verifyToken, requireRole(['admin']), createAdminNotification);
router.post('/', verifyToken, requireRole(['admin']), createAdminNotification);
router.delete('/admin/:id', verifyToken, requireRole(['admin']), deleteAdminNotification);

export default router;
