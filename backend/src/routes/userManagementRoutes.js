import { Router } from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
} from '../controllers/userManagementController.js';
import { requireAuth, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// All user management routes require Admin privileges
router.use(requireAuth, requireRole(['admin']));

router.get('/admin/users', getAllUsers);
router.post('/admin/users', createUser);
router.put('/admin/users/:id', updateUser);
router.put('/admin/users/:id/toggle-status', toggleUserStatus);
router.post('/admin/users/:id/reset-password', resetUserPassword);
router.delete('/admin/users/:id', deleteUser);

export default router;
