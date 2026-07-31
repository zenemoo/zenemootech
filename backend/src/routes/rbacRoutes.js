import { Router } from 'express';
import {
  portalLogin,
  getMyProfile,
  updateMyProfile,
  updateProfileImage,
  changePassword,
  getMyNotifications,
  markNotificationRead,
  deleteUserNotification,
} from '../controllers/rbacController.js';
import { requireAuth } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public Authentication Endpoint
router.post('/auth/portal-login', portalLogin);

// Protected User Self-Service Endpoints
router.get('/user/profile', requireAuth, getMyProfile);
router.put('/user/profile', requireAuth, updateMyProfile);
router.post('/user/profile-image', requireAuth, updateProfileImage);
router.post('/user/change-password', requireAuth, changePassword);

// User Notification Endpoints
router.get('/user/notifications', requireAuth, getMyNotifications);
router.put('/user/notifications/:id/read', requireAuth, markNotificationRead);
router.delete('/user/notifications/:id', requireAuth, deleteUserNotification);

export default router;
