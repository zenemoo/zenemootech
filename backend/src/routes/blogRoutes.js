import { Router } from 'express';
import { getBlog, createBlog } from '../controllers/blogController.js';

const router = Router();

router.get('/', getBlog);
router.post('/', createBlog);

export default router;
