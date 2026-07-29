import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chatWithAi, getAiAnalytics } from '../controllers/aiController.js';

const router = Router();

// Rate limiter for AI Chat requests (Max 20 requests per IP every 5 minutes)
const aiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many requests to Zenemoo AI. Please wait 5 minutes before asking more questions.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/chat', aiRateLimiter, chatWithAi);
router.get('/analytics', getAiAnalytics);

export default router;
