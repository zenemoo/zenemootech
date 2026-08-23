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

// Roster search for Email Composer recipient autocomplete (accessible to Admin, HR, Team Members)
router.get(
  '/search-roster',
  verifyToken,
  requireRole(['admin', 'super_admin', 'administrator', 'hr', 'team_member', 'manager', 'lead', 'core']),
  searchRosterForAccess
);

// All admin management routes require Admin authorization
router.get('/', verifyToken, requireRole(['admin']), getUsers);
router.post('/grant-access', verifyToken, requireRole(['admin']), grantUserAccess);
router.put('/:id', verifyToken, requireRole(['admin']), updateUser);
router.post('/:id/reset-password', verifyToken, requireRole(['admin']), resetUserPassword);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteUserAccess);

export default router;
