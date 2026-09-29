import { Router } from 'express';
import {
  getPortfolio,
  getAdminPortfolio,
  uploadOrReplacePortfolio,
  deletePortfolio,
  togglePortfolioStatus,
} from '../controllers/portfolioController.js';
import { uploadPdf } from '../middleware/upload.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public route to fetch active published company portfolio (Cached JSON, never 404)
router.get('/', getPortfolio);
router.get('/active', getPortfolio);

// Protected Admin Routes to manage company portfolio
router.get('/admin', verifyToken, requireRole(['admin']), getAdminPortfolio);

// Upload / Replace Portfolio PDF (up to 15MB)
router.post('/upload', verifyToken, requireRole(['admin']), uploadPdf.single('file'), uploadOrReplacePortfolio);
router.post('/', verifyToken, requireRole(['admin']), uploadPdf.single('file'), uploadOrReplacePortfolio);
router.put('/', verifyToken, requireRole(['admin']), uploadPdf.single('file'), uploadOrReplacePortfolio);

// Toggle publish / unpublish status
router.patch('/status', verifyToken, requireRole(['admin']), togglePortfolioStatus);
router.put('/status', verifyToken, requireRole(['admin']), togglePortfolioStatus);

// Delete / Unpublish Portfolio
router.delete('/', verifyToken, requireRole(['admin']), deletePortfolio);

export default router;
