import { Router } from 'express';
import {
  searchRosterForAccess,
  grantUserAccess,
  getUsers,
  updateUser,
  resetUserPassword,
  deleteUserAccess,
} from '../controllers/userManagementController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// All routes require Admin authorization
router.use(verifyToken, requireRole(['admin']));

router.get('/search-roster', searchRosterForAccess);
router.post('/grant-access', grantUserAccess);
router.get('/', getUsers);
router.put('/:id', updateUser);
router.post('/:id/reset-password', resetUserPassword);
router.delete('/:id', deleteUserAccess);

export default router;
