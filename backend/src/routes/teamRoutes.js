import { Router } from 'express';
import {
  getTeam,
  createTeamMember,
  updateTeamMember,
  reorderTeam,
  generateMemberSummary,
  deleteTeamMember,
  updateSelfProfile,
  uploadSelfImage,
  getPendingProfileUpdates,
  approveProfileUpdate,
  rejectProfileUpdate,
} from '../controllers/teamController.js';
import {
  getMyPrivateProfile,
  updateMyPrivateProfile,
} from '../controllers/privateProfileController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Self-Service Private Profile System (Team Member & HR)
router.get('/private-profile/me', verifyToken, getMyPrivateProfile);
router.put('/private-profile/me', verifyToken, updateMyPrivateProfile);

// Legacy Public Roster Update Workflow
router.put('/profile/me', verifyToken, updateSelfProfile);
router.post('/profile/upload-image', verifyToken, uploadSelfImage);

// Admin Profile Update Approvals Workflow
router.get('/profile-updates/pending', verifyToken, requireRole(['admin']), getPendingProfileUpdates);
router.post('/profile-updates/:id/approve', verifyToken, requireRole(['admin']), approveProfileUpdate);
router.post('/profile-updates/:id/reject', verifyToken, requireRole(['admin']), rejectProfileUpdate);

// Admin Team Roster CRUD
router.get('/', getTeam);
router.post('/', createTeamMember);
router.put('/reorder', reorderTeam);
router.post('/:id/generate-summary', generateMemberSummary);
router.put('/:id', updateTeamMember);
router.delete('/:id', deleteTeamMember);

export default router;

