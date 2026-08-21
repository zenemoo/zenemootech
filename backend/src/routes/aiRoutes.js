import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chatWithAi, getAiAnalytics, runDiagnostics } from '../controllers/aiController.js';

const router = Router();

// Rate limiter for AI Chat requests (Max 30 requests per IP every 5 minutes)
const aiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many requests to Zenemoo AI. Please wait a moment before asking more questions.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/chat', aiRateLimiter, chatWithAi);
router.get('/analytics', getAiAnalytics);
router.get('/diagnostics', runDiagnostics);

export default router;
