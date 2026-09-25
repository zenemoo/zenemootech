import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { memoryUserAccounts } from '../controllers/userManagementController.js';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    return null;
  }
  return secret.trim();
};

// Core Executive Allowed Email List Backup
const DEFAULT_ALLOWED_EMAILS = [
  'prem@zenemoo.in',
  'contact@zenemoo.in',
  'support@zenemoo.in',
  'info@zenemoo.in',
  'noreply@zenemoo.in',
  'zenemootech@gmail.com',
  'mr.prem2006@gmail.com',
];

// In-Memory Role Cache (userKey -> { role, status, email_access, verifiedAt })
const roleVerificationCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

/**
 * Invalidate cached role for a user (called upon role update/revocation)
 */
export const invalidateUserRoleCache = (identifier) => {
  if (!identifier) return;
  const cleanId = String(identifier).toLowerCase().trim();
  for (const [key] of roleVerificationCache.entries()) {
    if (key.toLowerCase().includes(cleanId)) {
      roleVerificationCache.delete(key);
    }
  }
};

/**
 * Helper to fetch latest account role & status with minimal database projection
 */
const fetchLatestUserAccount = async (decoded) => {
  const cleanEmail = (decoded.email || '').toLowerCase().trim();
  const userId = decoded.id;
  const teamMemberId = decoded.team_member_id;

  // 1. Check in-memory fallback accounts first if present
  if (Array.isArray(memoryUserAccounts) && memoryUserAccounts.length > 0) {
    const memMatch = memoryUserAccounts.find(
      (u) =>
        (userId && u.id === userId) ||
        (teamMemberId && u.team_member_id === teamMemberId) ||
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
    );
    if (memMatch) {
      return {
        role: memMatch.role,
        status: memMatch.status || 'active',
        email_access: memMatch.email_access !== false,
      };
    }
  }

  // 2. Minimal single-row lookup in Supabase user_accounts
  if (supabase) {
    try {
      if (userId && !String(userId).startsWith('admin_') && !String(userId).startsWith('usr_')) {
        const { data, error } = await supabase
          .from('user_accounts')
          .select('id, role, status, email_access')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data) {
          return {
            role: data.role,
            status: data.status || 'active',
            email_access: data.email_access !== false,
          };
        }
      }

      if (teamMemberId) {
        const { data, error } = await supabase
          .from('user_accounts')
          .select('id, role, status, email_access')
          .eq('team_member_id', teamMemberId)
          .maybeSingle();

        if (!error && data) {
          return {
            role: data.role,
            status: data.status || 'active',
            email_access: data.email_access !== false,
          };
        }
      }

      if (cleanEmail) {
        const { data, error } = await supabase
          .from('user_accounts')
          .select('id, role, status, email_access')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (!error && data) {
          return {
            role: data.role,
            status: data.status || 'active',
            email_access: data.email_access !== false,
          };
        }
      }
    } catch (err) {
      console.warn('[RBAC Role Re-verification DB Note]', err.message);
    }
  }

  return null;
};

/**
 * Universal Token Verification Middleware with periodic role re-verification
 */
export const verifyToken = async (req, res, next) => {
  const secret = getJwtSecret();
  if (!secret) {
    console.error('[Security Warning] JWT_SECRET environment variable is missing on server.');
    return res.status(500).json({
      success: false,
      code: 'SERVER_AUTH_CONFIG_ERROR',
      message: 'Server configuration error: Authentication is temporarily unavailable.',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED_MISSING_TOKEN',
      message: 'Access Denied: Missing or malformed authorization token.',
    });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED_EXPIRED_TOKEN',
      message: 'Access Denied: Your session token has expired or is invalid. Please log in again.',
    });
  }

  // Derive cache key from verified claims
  const cacheKey = decoded.id
    ? `id:${decoded.id}`
    : decoded.team_member_id
    ? `team:${decoded.team_member_id}`
    : decoded.email
    ? `email:${decoded.email.toLowerCase().trim()}`
    : null;

  const now = Date.now();
  let accountData = null;

  if (cacheKey && roleVerificationCache.has(cacheKey)) {
    const entry = roleVerificationCache.get(cacheKey);
    if (now - entry.verifiedAt < CACHE_TTL_MS) {
      accountData = entry;
    }
  }

  // If not in cache or cache expired, re-verify role & status
  if (!accountData && cacheKey) {
    try {
      const dbAccount = await fetchLatestUserAccount(decoded);
      if (dbAccount) {
        accountData = {
          role: dbAccount.role || decoded.role,
          status: dbAccount.status || 'active',
          email_access: dbAccount.email_access !== undefined ? dbAccount.email_access : decoded.email_access,
          verifiedAt: now,
        };
      } else {
        accountData = {
          role: decoded.role || 'team_member',
          status: 'active',
          email_access: decoded.email_access !== undefined ? decoded.email_access : true,
          verifiedAt: now,
        };
        roleVerificationCache.set(cacheKey, accountData);
      }
    } catch (e) {
      console.warn('[RBAC Re-verification Warning]', e.message);
      accountData = {
        role: decoded.role || 'team_member',
        status: 'active',
        email_access: decoded.email_access !== undefined ? decoded.email_access : true,
        verifiedAt: now,
      };
    }
  }

  // Check if user account was disabled or revoked
  if (accountData?.status && ['inactive', 'disabled', 'revoked', 'suspended'].includes(String(accountData.status).toLowerCase())) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_ACCOUNT_REVOKED',
      message: '403 Access Denied: Your account is inactive or access has been revoked. Contact your administrator.',
    });
  }

  // Apply verified / updated role & claims
  const originalRole = decoded.role;
  const originalEmailAccess = decoded.email_access;
  if (accountData) {
    if (accountData.role) decoded.role = accountData.role;
    if (accountData.email_access !== undefined) decoded.email_access = accountData.email_access;
  }

  req.user = decoded;

  // STRICT ABSOLUTE EXPIRATION PRESERVATION:
  // If claims updated, issue renewed token that STRICTLY preserves the original absolute 'exp' timestamp
  // Never extend the session deadline on API calls
  const claimsChanged = originalRole !== decoded.role || originalEmailAccess !== decoded.email_access;
  if (claimsChanged && decoded.exp) {
    const currentEpochSec = Math.floor(Date.now() / 1000);
    const remainingSec = decoded.exp - currentEpochSec;

    if (remainingSec > 0) {
      const newToken = jwt.sign(
        {
          id: decoded.id,
          team_member_id: decoded.team_member_id,
          role: decoded.role || 'team_member',
          email: decoded.email,
          email_access: decoded.email_access !== undefined ? decoded.email_access : true,
          auth_method: decoded.auth_method,
          session_start: decoded.session_start || decoded.iat,
          exp: decoded.exp, // Strict absolute expiration preserved
          iat: decoded.iat || currentEpochSec,
        },
        secret
      );

      res.setHeader('X-New-Token', newToken);
      res.setHeader('Access-Control-Expose-Headers', 'X-New-Token');
    }
  }

  next();
};


/**
 * Role Verification Middleware Guard
 * @param {Array<string>} allowedRoles E.g. ['admin', 'hr', 'team_member']
 */
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const isAdmin = ['admin', 'super_admin', 'administrator', 'superadmin', 'root'].includes(userRole);
    const isAllowed = allowedRoles.some((r) => r.toLowerCase() === userRole) || isAdmin;

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_INSUFFICIENT_ROLE',
        message: `403 Access Denied: Role '${req.user.role}' is not authorized to access this module.`,
      });
    }

    next();
  };
};

/**
 * Email Access Permission Guard for HR & Team Members
 */
export const requireEmailAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const role = (req.user.role || '').toLowerCase();

  // Admin roles always have email access
  if (['admin', 'super_admin', 'administrator', 'superadmin', 'root'].includes(role)) {
    return next();
  }

  // HR, Team Members, Managers, Leads, Core staff all have email access unless explicitly revoked (email_access === false)
  if (['hr', 'team_member', 'team', 'manager', 'lead', 'core', 'user'].includes(role)) {
    if (req.user.email_access !== false) {
      return next();
    }
  }

  if (req.user.email_access === false) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_NO_EMAIL_ACCESS',
      message: '403 Access Denied: You do not have permission to access the Company Email System. Contact your administrator.',
    });
  }

  next();
};
