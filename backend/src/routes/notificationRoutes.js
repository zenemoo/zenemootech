import { Router } from 'express';
import {
  getVapidPublicKey,
  registerSubscription,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteUserNotification,
  createAdminNotification,
  deleteAdminNotification,
} from '../controllers/notificationController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public Endpoints (No Login Required — for Public Web Visitors & Android App Users)
router.get('/vapid-key', getVapidPublicKey);
router.post('/subscribe', registerSubscription);

// Notification History & Read Status (Supports both authenticated users & guests via installation_id)
router.get('/', getUserNotifications);
router.put('/read-all', markAllNotificationsAsRead);
router.put('/:id/read', markNotificationAsRead);
router.delete('/:id', deleteUserNotification);

// Admin Dispatcher Endpoints (Require Admin Authentication)
router.post('/dispatch', verifyToken, requireRole(['admin']), createAdminNotification);
router.post('/', verifyToken, requireRole(['admin']), createAdminNotification);
router.delete('/admin/:id', verifyToken, requireRole(['admin']), deleteAdminNotification);

export default router;
