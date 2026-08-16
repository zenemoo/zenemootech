import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { generateCommunication, modifyCommunication } from '../controllers/adminHrAiController.js';
import { authMiddleware } from '../middleware/auth.js';

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

// Protected routes (Requires valid auth token / session)
router.post('/generate', authMiddleware, adminAiRateLimiter, generateCommunication);
router.post('/modify', authMiddleware, adminAiRateLimiter, modifyCommunication);

export default router;
