import { Router } from 'express';
import {
  login,
  portalLogin,
  logout,
  getProfile,
  getMeProfile,
  changePassword,
  checkEmail,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getAuditLogs,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { verifyToken } from '../middleware/rbacMiddleware.js';

const router = Router();

// Authentication Endpoints
router.post('/login', login);
router.post('/portal-login', portalLogin);
router.post('/logout', authMiddleware, logout);
router.get('/profile', authMiddleware, getProfile);
router.get('/me', verifyToken, getMeProfile);
router.post('/change-password', verifyToken, changePassword);
router.get('/audit-logs', authMiddleware, getAuditLogs);

// Password Recovery Workflows
router.post('/check-email', checkEmail);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

export default router;
