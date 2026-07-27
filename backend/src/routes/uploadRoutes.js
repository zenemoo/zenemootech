import { Router } from 'express';
import { uploadMedia, getMedia, updateMedia, deleteMedia } from '../controllers/uploadController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', getMedia);
router.post('/', upload.single('file'), uploadMedia);
router.post('/upload', upload.single('file'), uploadMedia);
router.put('/:id', upload.single('file'), updateMedia);
router.delete('/:id', deleteMedia);

export default router;
