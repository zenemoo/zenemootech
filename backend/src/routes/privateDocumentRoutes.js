import express from 'express';
import {
  getDashboardStats,
  getPrivateDocuments,
  getPrivateDocumentById,
  createPrivateDocument,
  updatePrivateDocument,
  uploadNewVersion,
  previewPrivateDocument,
  downloadPrivateDocument,
  archivePrivateDocument,
  deletePrivateDocument,
  exportMetadata,
} from '../controllers/privateDocumentController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Enforce strict authentication and admin-only role verification across all routes
router.use(verifyToken);
router.use(requireRole(['admin']));

// Dashboard metrics & safe metadata export
router.get('/stats', getDashboardStats);
router.get('/export', exportMetadata);

// Document Listing & Details
router.get('/', getPrivateDocuments);
router.get('/:id', getPrivateDocumentById);

// Document Creation & Modifications
router.post('/', createPrivateDocument);
router.patch('/:id', updatePrivateDocument);
router.post('/:id/versions', uploadNewVersion);

// Authorized Secure File Streaming (Inline Preview & Attachment Download)
router.get('/:id/preview', previewPrivateDocument);
router.get('/:id/download', downloadPrivateDocument);

// Document Archival & Deletion
router.patch('/:id/archive', archivePrivateDocument);
router.delete('/:id', deletePrivateDocument);

export default router;
