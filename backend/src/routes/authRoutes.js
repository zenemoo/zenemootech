import { Router } from 'express';
import {
  login,
  logout,
  getProfile,
  checkEmail,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getAuditLogs,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Authentication Endpoints
router.post('/login', login);
router.post('/logout', authMiddleware, logout);
router.get('/profile', authMiddleware, getProfile);
router.get('/audit-logs', authMiddleware, getAuditLogs);

// Password Recovery Workflows
router.post('/check-email', checkEmail);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

export default router;
