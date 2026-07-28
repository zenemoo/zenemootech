import { Router } from 'express';
import { login, logout, getProfile } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', authMiddleware, getProfile);

export default router;
