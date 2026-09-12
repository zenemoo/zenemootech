import express from 'express';
import jwt from 'jsonwebtoken';
import {
  getEligibleCommunityEmails,
  getGoogleGroupOverview,
  getGoogleGroupMembers,
  getGoogleGroupExclusions,
  restoreGoogleGroupExclusion,
  triggerGoogleGroupSync,
  removeGoogleGroupMember,
} from '../controllers/googleGroupSyncController.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';

/**
 * Dual Authentication Guard Middleware:
 * Allows either:
 * 1. Valid Secret Key in header `x-zenemoo-sync-secret` or `authorization: Bearer <secret>`
 * 2. Valid Admin JWT Token with role 'admin' or 'super_admin'
 */
export const requireSyncAuth = (req, res, next) => {
  const syncSecret = process.env.GOOGLE_GROUP_SYNC_SECRET || process.env.ZENEMOO_SCHEDULER_SECRET;
  const rawAuthHeader = req.headers.authorization || '';
  const providedSecret =
    req.get('x-zenemoo-sync-secret') ||
    req.headers['x-zenemoo-sync-secret'] ||
    req.headers['x-sync-secret'];

  // Check 1: Custom secret header
  if (syncSecret && providedSecret && String(providedSecret).trim() === String(syncSecret).trim()) {
    req.authMethod = 'SECRET_HEADER';
    return next();
  }

  // Check 2: Bearer token (could be either secret or JWT)
  if (rawAuthHeader.startsWith('Bearer ')) {
    const token = rawAuthHeader.substring(7).trim();

    // Check if token matches the configured secret
    if (syncSecret && token === String(syncSecret).trim()) {
      req.authMethod = 'SECRET_BEARER';
      return next();
    }

    // Attempt JWT verification
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userRole = (decoded.role || '').toLowerCase();
      const isAdmin = ['admin', 'super_admin', 'administrator', 'superadmin', 'root'].includes(userRole);

      if (isAdmin) {
        req.user = decoded;
        req.authMethod = 'ADMIN_JWT';
        return next();
      }

      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_INSUFFICIENT_ROLE',
        message: '403 Access Denied: Admin authorization required to manage Google Group.',
      });
    } catch (_) {
      // Token invalid or expired
    }
  }

  return res.status(401).json({
    success: false,
    code: 'UNAUTHORIZED_SYNC_REQUEST',
    message: 'Access Denied: Missing or invalid authorization token/secret.',
  });
};

// Overview dashboard metrics
router.get('/overview', requireSyncAuth, getGoogleGroupOverview);

// Pure eligible emails array (for Google Apps Script pull integration)
router.get('/eligible-emails', requireSyncAuth, getEligibleCommunityEmails);

// Member listing with sync status
router.get('/members', requireSyncAuth, getGoogleGroupMembers);

// Excluded emails listing
router.get('/exclusions', requireSyncAuth, getGoogleGroupExclusions);

// Restore excluded email (supports DELETE and POST alias)
router.delete('/exclusions/:email', requireSyncAuth, restoreGoogleGroupExclusion);
router.post('/exclusions/restore', requireSyncAuth, restoreGoogleGroupExclusion);

// Interactive sync trigger
router.post('/sync', requireSyncAuth, triggerGoogleGroupSync);

// Remove member endpoints (supports both DELETE and POST alias)
router.delete('/members/:email', requireSyncAuth, removeGoogleGroupMember);
router.post('/members/remove', requireSyncAuth, removeGoogleGroupMember);

export default router;

