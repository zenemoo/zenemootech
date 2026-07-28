import { Router } from 'express';
import { login, logout, getProfile } from '../controllers/authController.js';
import {
  get2faStatus,
  setup2fa,
  verify2faSetup,
  login2fa,
  disable2fa,
  reset2fa,
  verifyRecoveryCode,
} from '../controllers/twoFactorController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Legacy / Direct Auth
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', authMiddleware, getProfile);

// Production 2FA Endpoints (Google Authenticator TOTP RFC 6238)
router.get('/2fa/status', get2faStatus);
router.post('/2fa/setup', setup2fa);
router.post('/2fa/verify', verify2faSetup);
router.post('/2fa/login', login2fa);
router.post('/2fa/disable', disable2fa);
router.post('/2fa/reset', reset2fa);
router.post('/2fa/recovery', verifyRecoveryCode);

export default router;
