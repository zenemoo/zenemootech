import { Router } from 'express';
import { getPortfolio, createPortfolio } from '../controllers/portfolioController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public Portfolio Listing
router.get('/', getPortfolio);

// Admin Portfolio Management
router.post('/', verifyToken, requireRole(['admin']), createPortfolio);

export default router;
