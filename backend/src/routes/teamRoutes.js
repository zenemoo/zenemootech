import { Router } from 'express';
import {
  getTeam,
  createTeamMember,
  updateTeamMember,
  reorderTeam,
  generateMemberSummary,
  deleteTeamMember,
} from '../controllers/teamController.js';

const router = Router();

router.get('/', getTeam);
router.post('/', createTeamMember);
router.put('/reorder', reorderTeam);
router.post('/:id/generate-summary', generateMemberSummary);
router.put('/:id', updateTeamMember);
router.delete('/:id', deleteTeamMember);

export default router;

