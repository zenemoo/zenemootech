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
} from '../controllers/teamController.js';
import { verifyToken } from '../middleware/rbacMiddleware.js';

const router = Router();

// Self-Service Profile Updates (Team Member & HR)
router.put('/profile/me', verifyToken, updateSelfProfile);
router.post('/profile/upload-image', verifyToken, uploadSelfImage);

// Admin Team Roster CRUD
router.get('/', getTeam);
router.post('/', createTeamMember);
router.put('/reorder', reorderTeam);
router.post('/:id/generate-summary', generateMemberSummary);
router.put('/:id', updateTeamMember);
router.delete('/:id', deleteTeamMember);

export default router;

