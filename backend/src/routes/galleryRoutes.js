import { Router } from 'express';
import {
  getGalleryImages,
  createGalleryImage,
  deleteGalleryImage,
  generateGallerySeo,
} from '../controllers/galleryController.js';
import { upload } from '../middleware/upload.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public route to fetch all gallery images & posters (zero egress cached)
router.get('/', getGalleryImages);

// Admin-protected routes to upload and delete posters
router.post('/', verifyToken, requireRole(['admin']), upload.single('file'), createGalleryImage);
router.post('/generate-seo', verifyToken, requireRole(['admin']), generateGallerySeo);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteGalleryImage);

export default router;
