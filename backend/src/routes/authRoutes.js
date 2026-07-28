import { Router } from 'express';
import { registerAdmin, login, logout, getMe, getProfile } from '../controllers/authController.js';
import {
  get2faStatus,
  setup2fa,
  verify2faSetup,
  login2fa,
  disable2fa,
  reset2fa,
  verifyRecoveryCode,
  forgotPasswordWithTotp,
} from '../controllers/twoFactorController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Authentication Endpoints
router.post('/register', registerAdmin);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);
router.get('/profile', authMiddleware, getProfile);

// Password Management
router.post('/forgot-password', forgotPasswordWithTotp);
router.post('/reset-password', forgotPasswordWithTotp);

// Google Authenticator (RFC 6238 TOTP) 2FA Endpoints
router.get('/2fa/status', get2faStatus);
router.post('/2fa/setup', setup2fa);
router.post('/2fa/verify', verify2faSetup);
router.post('/2fa/login', login2fa);
router.post('/2fa/disable', disable2fa);
router.post('/2fa/reset', reset2fa);
router.post('/2fa/recovery', verifyRecoveryCode);

export default router;
