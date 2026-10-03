import express from 'express';
import { supabaseAuthMiddleware } from '../middleware/supabaseAuth.js';
import {
  getTalentProfile,
  getTalentProfileFormConfig,
  updateTalentProfile,
  getTalentOpportunities,
  getTalentOpportunityById,
  getTalentApplications,
  getTalentApplicationById,
  submitTalentOpportunityApplication,
  getTalentReferrals,
  getTalentOpportunityWhatsappGroup,
  getAllTalentOpportunityWhatsappGroups,
  setTalentOpportunityWhatsappGroup,
  deleteTalentOpportunityWhatsappGroup,
} from '../controllers/talentHubController.js';
import {
  getVendorTeamStatus,
  getVendorTeamMembers,
  addVendorTeamMemberManual,
  updateVendorTeamMember,
  deleteVendorTeamMember,
  generateVendorInviteToken,
  getVendorTeamExportData,
} from '../controllers/talentTeamController.js';

const router = express.Router();

// All talent hub routes strictly require authenticated Supabase session
router.use(supabaseAuthMiddleware);

// Talent profile endpoints
router.get('/me', getTalentProfile);
router.get('/profile-form-config', getTalentProfileFormConfig);
router.put('/profile', updateTalentProfile);

// Opportunities endpoints
router.get('/opportunities', getTalentOpportunities);
router.get('/opportunities/:id', getTalentOpportunityById);

// Opportunity application submission
router.post('/opportunities/:id/apply', submitTalentOpportunityApplication);

// Candidate submitted applications endpoints
router.get('/applications', getTalentApplications);
router.get('/applications/:id', getTalentApplicationById);

// Talent Referrals endpoint
router.get('/referrals', getTalentReferrals);

// Per-Opportunity Custom WhatsApp Group endpoints (Low-Egress)
router.get('/opportunities-whatsapp-groups', getAllTalentOpportunityWhatsappGroups);
router.get('/opportunities/:opportunityId/whatsapp-group', getTalentOpportunityWhatsappGroup);
router.put('/opportunities/:opportunityId/whatsapp-group', setTalentOpportunityWhatsappGroup);
router.delete('/opportunities/:opportunityId/whatsapp-group', deleteTalentOpportunityWhatsappGroup);

// Vendor "My Team" Management endpoints (Role-restricted to 'Vendor / Agency' in controller)
router.get('/team/status', getVendorTeamStatus);
router.get('/team/members', getVendorTeamMembers);
router.post('/team/members', addVendorTeamMemberManual);
router.put('/team/members/:id', updateVendorTeamMember);
router.delete('/team/members/:id', deleteVendorTeamMember);
router.post('/team/invite-token', generateVendorInviteToken);
router.get('/team/export', getVendorTeamExportData);

export default router;

