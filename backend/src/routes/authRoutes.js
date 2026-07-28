import express from 'express';
import {
  login,
  verifyEmailOTP,
  verifyTOTP,
  setup2FA,
  confirm2FA,
  getProfile,
  getSessions,
  revokeSession,
  logout,
  changePassword,
  getAuditLogs,
} from '../controllers/authController.js';
import { authenticateAdmin, authorizeRoles, authRateLimiter } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Authentication Flow Endpoints (Protected by Rate Limiting)
router.post('/login', authRateLimiter, login);
router.post('/verify-email', authRateLimiter, verifyEmailOTP);
router.post('/verify-email-otp', authRateLimiter, verifyEmailOTP);
router.post('/verify-totp', authRateLimiter, verifyTOTP);

// Protected Admin Endpoints
router.use(authenticateAdmin);

router.get('/me', getProfile);
router.post('/logout', logout);
router.get('/sessions', getSessions);
router.delete('/session/:sessionId', revokeSession);
router.post('/change-password', changePassword);

// 2FA Setup & Confirmation
router.post('/setup-2fa', setup2FA);
router.post('/confirm-2fa', confirm2FA);

// Audit Logs (SuperAdmin & Admin Only)
router.get('/audit-logs', authorizeRoles(['SuperAdmin', 'Admin']), getAuditLogs);

export default router;
