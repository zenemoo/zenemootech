import { Router } from 'express';
import { getPortfolio, createPortfolio } from '../controllers/portfolioController.js';
import {
  uploadMiddleware,
  uploadDatasetDriveFile,
  deleteDatasetDriveFile,
  checkDriveHealth,
} from '../controllers/drivePortfolioController.js';

const router = Router();

// Existing Portfolio routes
router.get('/', getPortfolio);
router.post('/', createPortfolio);

// Google Drive API Integration routes (Service Account ADC Architecture)
router.get('/drive-health', checkDriveHealth);
router.post('/upload-drive', uploadMiddleware, uploadDatasetDriveFile);
router.delete('/delete-drive/:fileId', deleteDatasetDriveFile);
router.delete('/delete-drive', deleteDatasetDriveFile);

export default router;
