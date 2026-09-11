import express from 'express';
import {
  getAdminTalentTeamsOverview,
  getAdminVendorTeamMembers,
  getAdminAllTeamMembersExport,
} from '../controllers/talentTeamController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Admin protection: requires valid token and admin/hr role
router.use(verifyToken, requireRole(['admin', 'super_admin', 'administrator', 'hr']));

// Overview of all vendors with team counts
router.get('/', getAdminTalentTeamsOverview);

// Export all or vendor-filtered team members
router.get('/export', getAdminAllTeamMembersExport);

// Drilldown into a specific vendor's team members
router.get('/:vendorId/members', getAdminVendorTeamMembers);

export default router;
