import { Router } from 'express';
import {
  getAllNotificationsAdmin,
  createNotificationAdmin,
  deleteNotificationAdmin,
} from '../controllers/notificationController.js';
import { requireAuth, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Notification management requires Admin privileges
router.use(requireAuth, requireRole(['admin']));

router.get('/admin/notifications', getAllNotificationsAdmin);
router.post('/admin/notifications', createNotificationAdmin);
router.delete('/admin/notifications/:id', deleteNotificationAdmin);

export default router;
