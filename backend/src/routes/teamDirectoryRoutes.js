import express from 'express';
import { verifyToken } from '../middleware/rbacMiddleware.js';
import { getTeamDirectoryMembers } from '../controllers/teamDirectoryController.js';

const router = express.Router();

// GET /api/directory/members — Fetch role-sanitized enterprise directory
router.get('/members', verifyToken, getTeamDirectoryMembers);

export default router;
