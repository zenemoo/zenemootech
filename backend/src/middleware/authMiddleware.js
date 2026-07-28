import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const JWT_SECRET = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';

// Rate Limiter for Login & Auth endpoints (5 attempts per 15 minutes)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Account temporarily locked for 30 minutes due to security rate limit.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authenticate Admin Cookie or Bearer Header Middleware
export const authenticateAdmin = (req, res, next) => {
  try {
    // 1. Check HTTPOnly Cookie
    let token = req.cookies?.['__Host-admin_session'] || req.cookies?.['admin_session'];

    // 2. Fallback to Authorization Header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No session token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, code: 'SESSION_EXPIRED', message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid or revoked session token.' });
  }
};

// Role-Based Access Control (RBAC) Middleware
export const authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.admin || !req.admin.role) {
      return res.status(403).json({ success: false, message: 'Access denied. User role undefined.' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Role '${req.admin.role}' is not authorized for this resource.`,
      });
    }

    next();
  };
};
