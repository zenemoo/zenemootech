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
} from '../controllers/talentHubController.js';

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

export default router;
