import { Router } from 'express';
import { uploadMedia, deleteMedia } from '../controllers/uploadController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.post('/', upload.single('file'), uploadMedia);
router.delete('/:id', deleteMedia);

export default router;
