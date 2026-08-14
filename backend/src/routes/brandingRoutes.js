import { Router } from 'express';
import { getActiveLogo, uploadOrReplaceLogo, deleteLogo } from '../controllers/brandingController.js';
import { upload } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Public route to fetch currently active site logo
router.get('/active', getActiveLogo);
router.get('/logo', getActiveLogo);

// Protected Admin Routes to upload, replace, or delete site logo
router.post('/logo', requireAuth, upload.single('file'), uploadOrReplaceLogo);
router.put('/logo', requireAuth, upload.single('file'), uploadOrReplaceLogo);
router.delete('/logo', requireAuth, deleteLogo);

export default router;
