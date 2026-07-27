import { Router } from 'express';
import { getPortfolio, createPortfolio } from '../controllers/portfolioController.js';

const router = Router();

router.get('/', getPortfolio);
router.post('/', createPortfolio);

export default router;
