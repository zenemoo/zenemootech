import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';

/**
 * Universal Token Verification Middleware
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED_MISSING_TOKEN',
      message: 'Access Denied: Missing or malformed authorization token.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Issue renewed sliding token with 30-min expiration
    const newToken = jwt.sign(
      {
        id: decoded.id,
        team_member_id: decoded.team_member_id,
        role: decoded.role,
        email: decoded.email,
        email_access: decoded.email_access,
      },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.setHeader('X-New-Token', newToken);
    res.setHeader('Access-Control-Expose-Headers', 'X-New-Token');

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED_EXPIRED_TOKEN',
      message: 'Access Denied: Your session token has expired or is invalid. Please log in again.',
    });
  }
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
    const isAllowed = allowedRoles.some((r) => r.toLowerCase() === userRole || userRole === 'admin');

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

  // Admin always has email access
  if (role === 'admin') {
    return next();
  }

  if (!req.user.email_access) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_NO_EMAIL_ACCESS',
      message: '403 Access Denied: You do not have permission to access the Company Email System. Contact your administrator.',
    });
  }

  next();
};
