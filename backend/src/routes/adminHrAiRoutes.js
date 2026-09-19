import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { generateCommunication, modifyCommunication } from '../controllers/adminHrAiController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Internal Admin & HR AI Rate Limiter (Max 50 requests per user/IP per 5 minutes)
const adminAiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: 'Too many request attempts to Admin & HR AI. Please wait 5 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Protected routes (Requires valid admin/hr authorization)
router.post('/generate', verifyToken, requireRole(['admin', 'hr']), adminAiRateLimiter, generateCommunication);
router.post('/modify', verifyToken, requireRole(['admin', 'hr']), adminAiRateLimiter, modifyCommunication);

export default router;
