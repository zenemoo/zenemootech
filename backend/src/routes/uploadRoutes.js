import { Router } from 'express';
import { uploadMedia, getMedia, updateMedia, deleteMedia } from '../controllers/uploadController.js';
import { upload } from '../middleware/upload.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public Media View
router.get('/', getMedia);

// Admin Media Upload & Management
router.post('/', verifyToken, requireRole(['admin']), upload.single('file'), uploadMedia);
router.post('/upload', verifyToken, requireRole(['admin']), upload.single('file'), uploadMedia);
router.put('/:id', verifyToken, requireRole(['admin']), upload.single('file'), updateMedia);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteMedia);

export default router;
