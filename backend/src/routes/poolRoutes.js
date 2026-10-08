import express from 'express';
import {
  getPublicActivePools,
  getPublicPoolByPublicId,
  submitPublicPoolResponse,
  requestPublicHistoryOtp,
  verifyPublicHistoryOtp,
  getTalentHubPools,
  getTalentHubPoolHistory,
  getAdminPools,
  createAdminPool,
  updateAdminPool,
  updateAdminPoolStatus,
  duplicateAdminPool,
  deleteAdminPool,
  getAdminPoolResponses,
  exportAdminPoolResponses,
} from '../controllers/poolController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';
import { supabaseAuthMiddleware } from '../middleware/supabaseAuth.js';
import {
  poolSubmissionRateLimiter,
  poolHistoryRateLimiter,
} from '../middleware/rateLimiter.js';

const router = express.Router();

// ============================================================================
// 1. PUBLIC ROUTES
// ============================================================================
router.get('/public/active', getPublicActivePools);
router.get('/public/:publicId', getPublicPoolByPublicId);
router.post('/public/:publicId/submit', poolSubmissionRateLimiter, submitPublicPoolResponse);
router.post('/public/history/request-otp', poolHistoryRateLimiter, requestPublicHistoryOtp);
router.post('/public/history/verify', poolHistoryRateLimiter, verifyPublicHistoryOtp);

// ============================================================================
// 2. TALENT HUB AUTHENTICATED ROUTES
// ============================================================================
router.get('/talent-hub/list', supabaseAuthMiddleware, getTalentHubPools);
router.get('/talent-hub/history', supabaseAuthMiddleware, getTalentHubPoolHistory);
router.post('/talent-hub/:publicId/submit', supabaseAuthMiddleware, submitPublicPoolResponse);

// ============================================================================
// 3. ADMIN / HR PROTECTED ROUTES
// ============================================================================
const adminRoles = ['admin', 'super_admin', 'administrator', 'hr'];
const adminWriteRoles = ['admin', 'super_admin', 'administrator'];

router.get('/admin', verifyToken, requireRole(adminRoles), getAdminPools);
router.post('/admin', verifyToken, requireRole(adminWriteRoles), createAdminPool);
router.put('/admin/:id', verifyToken, requireRole(adminWriteRoles), updateAdminPool);
router.patch('/admin/:id/status', verifyToken, requireRole(adminWriteRoles), updateAdminPoolStatus);
router.post('/admin/:id/duplicate', verifyToken, requireRole(adminWriteRoles), duplicateAdminPool);
router.delete('/admin/:id', verifyToken, requireRole(adminWriteRoles), deleteAdminPool);
router.get('/admin/:id/responses', verifyToken, requireRole(adminRoles), getAdminPoolResponses);
router.get('/admin/:id/export', verifyToken, requireRole(adminRoles), exportAdminPoolResponses);

export default router;
