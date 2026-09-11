import express from 'express';
import {
  getPublicTeamInviteInfo,
  submitPublicTeamMember,
} from '../controllers/talentTeamController.js';

const router = express.Router();

// Public invitation verification
router.get('/:token', getPublicTeamInviteInfo);

// Public submission under vendor invite
router.post('/:token/submit', submitPublicTeamMember);

export default router;
