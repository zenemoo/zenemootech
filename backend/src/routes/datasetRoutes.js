import express from 'express';
import {
  getDatasets,
  getDatasetBySlugOrId,
  createDataset,
  createFolder,
  uploadFile,
  uploadChunk,
  deleteFile,
  deleteDataset,
} from '../controllers/datasetController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public Read Routes
router.get('/', getDatasets);
router.get('/:identifier', getDatasetBySlugOrId);

// Admin Authorized Management Routes
router.post('/', authMiddleware, createDataset);
router.post('/:id/folders', authMiddleware, createFolder);
router.post('/:id/upload', authMiddleware, uploadFile);
router.post('/:id/upload-chunk', authMiddleware, uploadChunk);
router.delete('/files/:fileId', authMiddleware, deleteFile);
router.delete('/:id', authMiddleware, deleteDataset);

export default router;
