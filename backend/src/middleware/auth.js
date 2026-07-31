import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Sliding session token renewal: Sign a new token with fresh 30-minute expiry
    const newToken = jwt.sign(
      { role: decoded.role, email: decoded.email },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.setHeader('X-New-Token', newToken);
    res.setHeader('Access-Control-Expose-Headers', 'X-New-Token');

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
  }
};
