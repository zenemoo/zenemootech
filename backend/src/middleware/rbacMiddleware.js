import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';

/**
 * Middleware: Verify JWT Authentication and attach user object
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '401 Unauthorized: Missing or invalid authorization token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Issue renewed sliding session token
    const newToken = jwt.sign(
      { id: decoded.id, role: decoded.role, email: decoded.email, permissions: decoded.permissions },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.setHeader('X-New-Token', newToken);
    res.setHeader('Access-Control-Expose-Headers', 'X-New-Token');

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: '401 Unauthorized: Session token expired or invalid' });
  }
};

/**
 * Middleware: Verify user role against allowed roles list
 */
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '401 Unauthorized: Access denied' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const rolesList = allowedRoles.map((r) => r.toLowerCase());

    if (userRole === 'admin' || rolesList.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      code: 'ERR_FORBIDDEN',
      message: '403 Access Denied: You do not have permission to access this portal or resource.',
    });
  };
};

/**
 * Middleware: Verify specific permission key (e.g., 'email_access')
 */
export const requirePermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '401 Unauthorized: Access denied' });
    }

    // Admin bypasses permission checks
    if (req.user.role === 'admin') {
      return next();
    }

    const perms = req.user.permissions || {};
    if (perms[permissionKey] === true) {
      return next();
    }

    return res.status(403).json({
      success: false,
      code: 'ERR_PERMISSION_DENIED',
      message: `403 Access Denied: Requires '${permissionKey}' authorization from system administrator.`,
    });
  };
};
