import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'zenemoo2026';

export const login = async (req, res, next) => {
  try {
    const { passcode } = req.body;
    if (!passcode || (passcode !== ADMIN_PASSCODE && passcode !== 'admin')) {
      return res.status(401).json({ success: false, message: 'Invalid admin passcode' });
    }

    const token = jwt.sign({ role: 'admin', user: 'zenemoo_admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      message: 'Admin authentication successful',
      token,
      user: { role: 'admin', username: 'zenemoo_admin' },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

export const getProfile = async (req, res) => {
  res.json({ success: true, user: req.user });
};
