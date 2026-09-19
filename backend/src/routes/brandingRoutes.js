import { Router } from 'express';
import { getActiveLogo, uploadOrReplaceLogo, deleteLogo } from '../controllers/brandingController.js';
import { upload } from '../middleware/upload.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public routes to fetch currently active site logo (NEVER 404)
router.get('/active', getActiveLogo);
router.get('/logo', getActiveLogo);
router.get('/', getActiveLogo);

// Protected Admin Routes to upload, replace, or delete site logo
router.post('/logo', verifyToken, requireRole(['admin']), upload.single('file'), uploadOrReplaceLogo);
router.post('/active', verifyToken, requireRole(['admin']), upload.single('file'), uploadOrReplaceLogo);
router.post('/', verifyToken, requireRole(['admin']), upload.single('file'), uploadOrReplaceLogo);

router.put('/logo', verifyToken, requireRole(['admin']), upload.single('file'), uploadOrReplaceLogo);
router.put('/active', verifyToken, requireRole(['admin']), upload.single('file'), uploadOrReplaceLogo);
router.put('/', verifyToken, requireRole(['admin']), upload.single('file'), uploadOrReplaceLogo);

router.delete('/logo', verifyToken, requireRole(['admin']), deleteLogo);
router.delete('/active', verifyToken, requireRole(['admin']), deleteLogo);
router.delete('/', verifyToken, requireRole(['admin']), deleteLogo);

export default router;
