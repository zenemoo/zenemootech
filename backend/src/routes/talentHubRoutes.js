import express from 'express';
import { supabaseAuthMiddleware } from '../middleware/supabaseAuth.js';
import {
  getTalentProfile,
  getTalentOpportunities,
  getTalentOpportunityById,
  getTalentApplications,
  getTalentApplicationById,
  submitTalentOpportunityApplication,
} from '../controllers/talentHubController.js';

const router = express.Router();

// All talent hub routes strictly require authenticated Supabase session
router.use(supabaseAuthMiddleware);

// Talent profile endpoint
router.get('/me', getTalentProfile);

// Opportunities endpoints
router.get('/opportunities', getTalentOpportunities);
router.get('/opportunities/:id', getTalentOpportunityById);

// Opportunity application submission
router.post('/opportunities/:id/apply', submitTalentOpportunityApplication);

// Candidate submitted applications endpoints
router.get('/applications', getTalentApplications);
router.get('/applications/:id', getTalentApplicationById);

export default router;
