import express from 'express';
import {
  getDatasets,
  getDatasetBySlugOrId,
  createDataset,
  createFolder,
  uploadFile,
  uploadChunk,
  fetchLinkMetadata,
  deleteFile,
  deleteDataset,
} from '../controllers/datasetController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Public Read Routes
router.get('/', getDatasets);
router.get('/:identifier', getDatasetBySlugOrId);

// Admin Authorized Management Routes
router.post('/', verifyToken, requireRole(['admin']), createDataset);
router.post('/fetch-link-metadata', verifyToken, requireRole(['admin']), fetchLinkMetadata);
router.post('/:id/folders', verifyToken, requireRole(['admin']), createFolder);
router.post('/:id/upload', verifyToken, requireRole(['admin']), uploadFile);
router.post('/:id/upload-chunk', verifyToken, requireRole(['admin']), uploadChunk);
router.delete('/files/:fileId', verifyToken, requireRole(['admin']), deleteFile);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteDataset);

export default router;
