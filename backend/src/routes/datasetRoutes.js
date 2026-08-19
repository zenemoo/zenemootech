import express from 'express';
import {
  getDatasets,
  getDatasetBySlugOrId,
  createDataset,
  createFolder,
  uploadFile,
  deleteFile,
  deleteDataset,
} from '../controllers/datasetController.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Read Routes
router.get('/', getDatasets);
router.get('/:identifier', getDatasetBySlugOrId);

// Admin Authorized Management Routes
router.post('/', authenticateJwt, createDataset);
router.post('/:id/folders', authenticateJwt, createFolder);
router.post('/:id/upload', authenticateJwt, uploadFile);
router.delete('/files/:fileId', authenticateJwt, deleteFile);
router.delete('/:id', authenticateJwt, deleteDataset);

export default router;
