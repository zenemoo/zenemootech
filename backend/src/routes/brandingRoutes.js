import { Router } from 'express';
import { getActiveLogo, uploadOrReplaceLogo, deleteLogo } from '../controllers/brandingController.js';
import { upload } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Public routes to fetch currently active site logo (NEVER 404)
router.get('/active', getActiveLogo);
router.get('/logo', getActiveLogo);
router.get('/', getActiveLogo);

// Protected Admin Routes to upload, replace, or delete site logo
router.post('/logo', requireAuth, upload.single('file'), uploadOrReplaceLogo);
router.post('/active', requireAuth, upload.single('file'), uploadOrReplaceLogo);
router.post('/', requireAuth, upload.single('file'), uploadOrReplaceLogo);

router.put('/logo', requireAuth, upload.single('file'), uploadOrReplaceLogo);
router.put('/active', requireAuth, upload.single('file'), uploadOrReplaceLogo);
router.put('/', requireAuth, upload.single('file'), uploadOrReplaceLogo);

router.delete('/logo', requireAuth, deleteLogo);
router.delete('/active', requireAuth, deleteLogo);
router.delete('/', requireAuth, deleteLogo);

export default router;
