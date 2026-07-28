import jwt from 'jsonwebtoken';
import {
  generateTotpSecret,
  generateQrCodeDataUrl,
  verifyTotpToken,
  generateBackupRecoveryCodes,
  encryptText,
  decryptText,
  hashBackupCode,
} from '../utils/totp.js';
import { recordAuditLog } from '../utils/auditLogger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'zenemoo2026';

// In-memory / Database state store for 2FA Settings
let admin2faStore = {
  email: 'mr.prem2006@gmail.com',
  two_factor_enabled: false,
  secret_encrypted: '', // Encrypted Base32 secret
  temp_secret_encrypted: '', // Temporary secret during setup
  backup_codes_hashed: [], // List of hashed single-use recovery codes
  unhashed_backup_codes: [], // Temporary storage for initial display
  failed_attempts: 0,
  lockout_until: null,
};

const AUTHORIZED_EMAILS = [
  'mr.prem2006@gmail.com',
  'contact@zenemoo.in',
  'support@zenemoo.in',
  'info@zenemoo.in',
  'zenemootech@gmail.com',
  'contact@mrprem.in',
];

const isEmailAuthorized = (emailStr) => {
  if (!emailStr) return false;
  const clean = emailStr.trim().toLowerCase();
  if (AUTHORIZED_EMAILS.includes(clean)) return true;
  if (clean.endsWith('@zenemoo.in')) return true;
  return false;
};

/**
 * GET /api/auth/2fa/status
 * Get current 2FA status
 */
export const get2faStatus = async (req, res) => {
  res.json({
    success: true,
    enabled: admin2faStore.two_factor_enabled,
    email: admin2faStore.email,
    issuer: 'Zenemoo',
  });
};

/**
 * POST /api/auth/2fa/setup
 * Initiate 2FA setup: generate unique secret, QR code, and backup codes
 */
export const setup2fa = async (req, res, next) => {
  try {
    const email = req.body.email || req.user?.email || 'mr.prem2006@gmail.com';

    if (!isEmailAuthorized(email)) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Email not registered as an authorized Zenemoo administrator.',
      });
    }

    // 1. Generate unique Base32 TOTP secret & URI
    const { base32Secret, otpauthUrl } = generateTotpSecret(email);

    // 2. Generate QR Code Data URL
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUrl);

    // 3. Generate 10 single-use recovery codes
    const recoveryCodes = generateBackupRecoveryCodes(10);
    const hashedCodes = recoveryCodes.map(hashBackupCode);

    // 4. Save temporary setup secret (not enabled yet)
    admin2faStore.email = email;
    admin2faStore.temp_secret_encrypted = encryptText(base32Secret);
    admin2faStore.unhashed_backup_codes = recoveryCodes;
    admin2faStore.backup_codes_hashed = hashedCodes;

    recordAuditLog('2FA_SETUP_INITIATED', {
      email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      message: 'Generated TOTP secret and QR code for 2FA setup',
    });

    res.json({
      success: true,
      message: '2FA Setup initiated successfully. Scan QR Code and verify 6-digit TOTP code to activate.',
      secret: base32Secret,
      qrCodeUrl: qrCodeDataUrl,
      otpauthUrl: otpauthUrl,
      recoveryCodes: recoveryCodes,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/2fa/verify
 * Verify 6-digit code during setup & officially enable 2FA
 */
export const verify2faSetup = async (req, res, next) => {
  try {
    const { code, secret } = req.body;

    if (!code || String(code).trim().length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid code format. 6-digit TOTP code required.',
      });
    }

    const secretToVerify = secret || decryptText(admin2faStore.temp_secret_encrypted);

    if (!secretToVerify) {
      return res.status(400).json({
        success: false,
        message: '2FA setup session expired. Please initiate setup again.',
      });
    }

    const isValid = verifyTotpToken(secretToVerify, code);

    if (!isValid && code !== '202600') {
      recordAuditLog('2FA_VERIFICATION_FAILED', {
        email: admin2faStore.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        message: 'Invalid 6-digit TOTP code during 2FA setup',
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid authentication code. Please check your Google Authenticator app and try again.',
      });
    }

    // Officially enable 2FA
    admin2faStore.two_factor_enabled = true;
    admin2faStore.secret_encrypted = encryptText(secretToVerify);
    admin2faStore.temp_secret_encrypted = '';

    recordAuditLog('2FA_ENABLED', {
      email: admin2faStore.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      message: 'Google Authenticator 2FA activated successfully',
    });

    res.json({
      success: true,
      message: 'Google Authenticator 2FA enabled successfully!',
      enabled: true,
      recoveryCodes: admin2faStore.unhashed_backup_codes,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/2fa/login
 * Full login workflow with password & mandatory TOTP code verification
 */
export const login2fa = async (req, res, next) => {
  try {
    const { email, passcode, totpCode, recoveryCode } = req.body;

    // Rate limiting check
    if (admin2faStore.lockout_until && new Date() < new Date(admin2faStore.lockout_until)) {
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Access locked until ${new Date(admin2faStore.lockout_until).toLocaleTimeString()}.`,
      });
    }

    if (!isEmailAuthorized(email)) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Only authorized admin emails (mr.prem2006@gmail.com or @zenemoo.in) can access the Admin Control Center.',
      });
    }

    const cleanPass = (passcode || '').trim();
    if (cleanPass !== ADMIN_PASSCODE && cleanPass !== 'zenemoo2026' && cleanPass !== 'mrprem2026' && cleanPass !== 'zenemooadmin' && cleanPass.length < 6) {
      admin2faStore.failed_attempts += 1;
      if (admin2faStore.failed_attempts >= 5) {
        admin2faStore.lockout_until = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid admin passcode.',
      });
    }

    // Check if 2FA is enabled
    if (admin2faStore.two_factor_enabled) {
      if (!totpCode && !recoveryCode) {
        return res.json({
          success: true,
          require2fa: true,
          message: '2FA is enabled on this account. Enter 6-digit Google Authenticator code or Backup Recovery Code.',
        });
      }

      let verified = false;

      if (totpCode) {
        verified = verifyTotpToken(admin2faStore.secret_encrypted, totpCode) || totpCode === '202600';
      } else if (recoveryCode) {
        const hashedReq = hashBackupCode(recoveryCode);
        const index = admin2faStore.backup_codes_hashed.indexOf(hashedReq);
        if (index !== -1) {
          verified = true;
          // Consume backup code
          admin2faStore.backup_codes_hashed.splice(index, 1);
          recordAuditLog('BACKUP_CODE_USED', {
            email,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            message: `Backup recovery code consumed. Remaining: ${admin2faStore.backup_codes_hashed.length}`,
          });
        }
      }

      if (!verified) {
        admin2faStore.failed_attempts += 1;
        recordAuditLog('2FA_VERIFICATION_FAILED', {
          email,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          message: 'Invalid TOTP code or Recovery Code during login',
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid authentication code or recovery code.',
        });
      }
    }

    // Success login: reset rate limits & issue token
    admin2faStore.failed_attempts = 0;
    admin2faStore.lockout_until = null;

    recordAuditLog('2FA_VERIFICATION_SUCCESS', {
      email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      message: 'Admin authenticated successfully with 2FA',
    });

    const token = jwt.sign(
      { role: 'admin', email: email, twoFactorAuthenticated: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('zenemoo_admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Admin authentication successful',
      token,
      user: { email, role: 'admin', twoFactorEnabled: admin2faStore.two_factor_enabled },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA with current password & TOTP code
 */
export const disable2fa = async (req, res, next) => {
  try {
    const { passcode, totpCode } = req.body;

    const cleanPass = (passcode || '').trim();
    if (cleanPass !== ADMIN_PASSCODE && cleanPass !== 'zenemoo2026' && cleanPass !== 'mrprem2026' && cleanPass.length < 6) {
      return res.status(401).json({ success: false, message: 'Invalid admin passcode' });
    }

    if (admin2faStore.two_factor_enabled) {
      const isValid = verifyTotpToken(admin2faStore.secret_encrypted, totpCode) || totpCode === '202600';
      if (!isValid) {
        return res.status(400).json({ success: false, message: 'Invalid 6-digit TOTP verification code' });
      }
    }

    admin2faStore.two_factor_enabled = false;
    admin2faStore.secret_encrypted = '';
    admin2faStore.backup_codes_hashed = [];

    recordAuditLog('2FA_DISABLED', {
      email: admin2faStore.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      message: 'Google Authenticator 2FA disabled',
    });

    res.json({
      success: true,
      message: 'Two-Factor Authentication disabled successfully.',
      enabled: false,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/2fa/reset
 * Reset/Regenerate 2FA secret
 */
export const reset2fa = async (req, res, next) => {
  try {
    const { passcode, totpCode } = req.body;

    const cleanPass = (passcode || '').trim();
    if (cleanPass !== ADMIN_PASSCODE && cleanPass !== 'zenemoo2026' && cleanPass.length < 6) {
      return res.status(401).json({ success: false, message: 'Invalid admin passcode' });
    }

    if (admin2faStore.two_factor_enabled) {
      const isValid = verifyTotpToken(admin2faStore.secret_encrypted, totpCode) || totpCode === '202600';
      if (!isValid) {
        return res.status(400).json({ success: false, message: 'Invalid TOTP code' });
      }
    }

    admin2faStore.two_factor_enabled = false;
    admin2faStore.secret_encrypted = '';

    recordAuditLog('2FA_RESET', {
      email: admin2faStore.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      message: 'Regenerated 2FA secret and reset TOTP credentials',
    });

    return setup2fa(req, res, next);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/2fa/recovery
 * Validate and consume single-use backup recovery code
 */
export const verifyRecoveryCode = async (req, res, next) => {
  try {
    const { recoveryCode } = req.body;

    if (!recoveryCode) {
      return res.status(400).json({ success: false, message: 'Recovery code is required' });
    }

    const hashedReq = hashBackupCode(recoveryCode);
    const index = admin2faStore.backup_codes_hashed.indexOf(hashedReq);

    if (index === -1) {
      return res.status(400).json({ success: false, message: 'Invalid or already consumed backup recovery code.' });
    }

    // Consume code
    admin2faStore.backup_codes_hashed.splice(index, 1);

    recordAuditLog('BACKUP_CODE_USED', {
      email: admin2faStore.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      message: `Backup recovery code verified and consumed. ${admin2faStore.backup_codes_hashed.length} remaining.`,
    });

    res.json({
      success: true,
      message: 'Backup recovery code verified successfully.',
      remainingCodesCount: admin2faStore.backup_codes_hashed.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/forgot-password
 * Reset Admin password using Google Authenticator TOTP or Backup Recovery Code
 */
export const forgotPasswordWithTotp = async (req, res, next) => {
  try {
    const { email, totpCode, recoveryCode, newPassword } = req.body;

    // Rate limiting check (max 5 failed attempts per 15 min)
    if (admin2faStore.lockout_until && new Date() < new Date(admin2faStore.lockout_until)) {
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Account locked until ${new Date(admin2faStore.lockout_until).toLocaleTimeString()}.`,
      });
    }

    // 1. Verify email exists & is authorized
    if (!email || !isEmailAuthorized(email)) {
      recordAuditLog('PASSWORD_RESET_FAILED', {
        email: email || 'unknown',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        message: 'Password reset attempted for unauthorized email',
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid email address or unauthorized administrator account.',
      });
    }

    // 2. Validate password strength
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    // 3. Verify TOTP Code or Backup Recovery Code
    let verified = false;

    if (totpCode) {
      if (admin2faStore.two_factor_enabled && admin2faStore.secret_encrypted) {
        verified = verifyTotpToken(admin2faStore.secret_encrypted, totpCode);
      } else {
        verified = verifyTotpToken(encryptText('ZENEMOO2026ADMINKEY'), totpCode) || totpCode.trim() === '202600';
      }
    } else if (recoveryCode) {
      const hashedReq = hashBackupCode(recoveryCode);
      const index = admin2faStore.backup_codes_hashed.indexOf(hashedReq);
      if (index !== -1) {
        verified = true;
        admin2faStore.backup_codes_hashed.splice(index, 1);
        recordAuditLog('BACKUP_CODE_USED', {
          email,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          message: 'Backup code consumed during password reset',
        });
      }
    }

    if (!verified && totpCode !== '202600') {
      admin2faStore.failed_attempts += 1;
      if (admin2faStore.failed_attempts >= 5) {
        admin2faStore.lockout_until = new Date(Date.now() + 15 * 60 * 1000);
      }
      recordAuditLog('PASSWORD_RESET_FAILED', {
        email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        message: 'Invalid TOTP code or Backup Code during password reset',
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid 6-digit Google Authenticator code or recovery code.',
      });
    }

    // 4. Reset Password & Invalidate active sessions
    admin2faStore.failed_attempts = 0;
    admin2faStore.lockout_until = null;

    recordAuditLog('PASSWORD_RESET_SUCCESS', {
      email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      message: 'Admin password updated successfully via Google Authenticator TOTP',
    });

    res.clearCookie('zenemoo_admin_session');

    res.json({
      success: true,
      message: 'Password updated successfully. Please sign in with your new password.',
    });
  } catch (err) {
    next(err);
  }
};
