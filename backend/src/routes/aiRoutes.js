import { Router } from 'express';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { chatWithAi, getAiAnalytics, runDiagnostics } from '../controllers/aiController.js';

const router = Router();

router.post('/chat', aiRateLimiter, chatWithAi);
router.get('/analytics', getAiAnalytics);
router.get('/diagnostics', runDiagnostics);

export default router;
