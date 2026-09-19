import { Router } from 'express';
import { getBlog, createBlog } from '../controllers/blogController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public Blog Listing
router.get('/', getBlog);

// Admin Blog Management
router.post('/', verifyToken, requireRole(['admin']), createBlog);

export default router;
