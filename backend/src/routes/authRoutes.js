import { Router } from 'express';
import {
  login,
  googleAdminLogin,
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
  getAuthorizedAdminEmails,
  upsertAuthorizedAdminEmail,
  deleteAuthorizedAdminEmail,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';
import { authLoginRateLimiter, authOtpRateLimiter, authCheckEmailRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Authentication Endpoints
router.post('/login', authLoginRateLimiter, login);
router.post('/google-admin-login', authLoginRateLimiter, googleAdminLogin);
router.post('/portal-login', authLoginRateLimiter, portalLogin);
router.post('/logout', authMiddleware, logout);
router.get('/profile', authMiddleware, getProfile);
router.get('/me', verifyToken, getMeProfile);
router.post('/change-password', verifyToken, changePassword);
router.get('/audit-logs', verifyToken, requireRole(['admin']), getAuditLogs);

// Authorized Admin Emails Management (Admin Only)
router.get('/authorized-emails', verifyToken, requireRole(['admin']), getAuthorizedAdminEmails);
router.post('/authorized-emails', verifyToken, requireRole(['admin']), upsertAuthorizedAdminEmail);
router.delete('/authorized-emails/:idOrEmail', verifyToken, requireRole(['admin']), deleteAuthorizedAdminEmail);

// Password Recovery Workflows
router.post('/check-email', authCheckEmailRateLimiter, checkEmail);
router.post('/forgot-password', authOtpRateLimiter, forgotPassword);
router.post('/verify-otp', authOtpRateLimiter, verifyOtp);
router.post('/reset-password', authOtpRateLimiter, resetPassword);

export default router;

