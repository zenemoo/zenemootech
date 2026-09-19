import { Router } from 'express';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';
import { chatWithAi, getAiAnalytics, runDiagnostics } from '../controllers/aiController.js';

const router = Router();

router.post('/chat', aiRateLimiter, chatWithAi);
router.get('/analytics', verifyToken, requireRole(['admin']), getAiAnalytics);
router.get('/diagnostics', verifyToken, requireRole(['admin']), runDiagnostics);

export default router;
