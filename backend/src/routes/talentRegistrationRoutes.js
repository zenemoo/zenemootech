import express from 'express';
import {
  registerTalent,
  getRegistrationsAdmin,
  getRegistrationByIdAdmin,
  updateRegistrationAdmin,
  addAdminNote,
  exportRegistrationsAdmin,
} from '../controllers/talentRegistrationController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public Anonymous Registration Submit
router.post('/register', registerTalent);
router.post('/', registerTalent);

// Protected Admin Operations (Requires JWT auth)
router.get('/admin/list', authMiddleware, getRegistrationsAdmin);
router.get('/admin/detail/:id', authMiddleware, getRegistrationByIdAdmin);
router.patch('/admin/status/:id', authMiddleware, updateRegistrationAdmin);
router.post('/admin/note/:id', authMiddleware, addAdminNote);
router.get('/admin/export', authMiddleware, exportRegistrationsAdmin);

export default router;
