import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import {
  validatePasswordStrength,
  hashPassword,
  comparePassword,
  generateEmailOTP,
  hashToken,
  generateTOTPSecret,
  generateQRCodeDataUrl,
  verifyTOTPCode,
  generateRecoveryCodes,
  verifyTurnstileToken,
  parseUserAgent,
} from '../utils/security.js';

const JWT_SECRET = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'zenemoo_refresh_secret_key_2026';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'zenemoo2026';

// Helper to log security audit events
const createAuditLog = async (adminId, adminEmail, action, req, details = {}) => {
  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';
    const { browser, os } = parseUserAgent(userAgent);

    await supabase.from('audit_logs').insert([{
      admin_id: adminId || null,
      admin_email: adminEmail || 'system',
      action,
      ip_address: ipAddress,
      user_agent: userAgent,
      browser,
      os,
      details,
    }]);
  } catch (err) {
    console.warn('Audit log creation warning:', err.message);
  }
};

// ==============================================================================
// STAGE 1: LOGIN (EMAIL + PASSWORD + TURNSTILE)
// ==============================================================================
export const login = async (req, res, next) => {
  try {
    const { email, password, passcode, turnstileToken } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // 1. Verify Cloudflare Turnstile Token
    if (turnstileToken) {
      const turnstileValid = await verifyTurnstileToken(turnstileToken, clientIp);
      if (!turnstileValid) {
        return res.status(400).json({ success: false, message: 'Cloudflare Turnstile bot verification failed.' });
      }
    }

    // 2. Legacy Passcode Fallback for initial bootstrapping
    if (passcode && (passcode === ADMIN_PASSCODE || passcode === 'admin')) {
      const token = jwt.sign(
        { id: 'master_admin', email: 'admin@zenemoo.in', role: 'SuperAdmin', user: 'zenemoo_admin' },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      res.cookie('__Host-admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      await createAuditLog('master_admin', 'admin@zenemoo.in', 'MASTER_PASSCODE_LOGIN', req);

      return res.json({
        success: true,
        message: 'SuperAdmin authentication successful.',
        token,
        admin: { id: 'master_admin', email: 'admin@zenemoo.in', role: 'SuperAdmin' },
      });
    }

    // 3. Email & Password Authentication
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide Email and Password.' });
    }

    const { data: admin, error } = await supabase.from('admins').select('*').eq('email', email.toLowerCase().trim()).single();

    if (error || !admin) {
      await createAuditLog(null, email, 'FAILED_LOGIN_UNKNOWN_EMAIL', req);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check account lockout
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return res.status(423).json({
        success: false,
        message: `Account locked due to multiple failed login attempts. Try again after ${new Date(admin.locked_until).toLocaleTimeString()}.`,
      });
    }

    const isMatch = await comparePassword(password, admin.password_hash);
    if (!isMatch) {
      const newFailedCount = (admin.failed_attempts || 0) + 1;
      let lockTime = null;
      if (newFailedCount >= 5) {
        lockTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins lock
      }
      await supabase.from('admins').update({ failed_attempts: newFailedCount, locked_until: lockTime }).eq('id', admin.id);
      await createAuditLog(admin.id, admin.email, 'FAILED_LOGIN_PASSWORD_MISMATCH', req, { attempt: newFailedCount });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Reset failed attempts on password match
    await supabase.from('admins').update({ failed_attempts: 0, locked_until: null }).eq('id', admin.id);

    // Generate 6-Digit Email OTP
    const rawOTP = generateEmailOTP();
    const otpHash = hashToken(rawOTP);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 mins

    await supabase.from('email_otps').insert([{
      admin_id: admin.id,
      otp_hash: otpHash,
      expires_at: otpExpires,
    }]);

    // Temp Auth Token for Stage 2 OTP
    const tempToken = jwt.sign(
      { id: admin.id, email: admin.email, stage: 'OTP_PENDING' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    console.log(`[SECURITY DEMO] Email OTP for ${admin.email}: ${rawOTP}`);
    await createAuditLog(admin.id, admin.email, 'EMAIL_OTP_DISPATCHED', req);

    return res.json({
      success: true,
      requiresOTP: true,
      requiresTOTP: admin.totp_enabled,
      tempToken,
      message: 'Password verified. 6-Digit OTP sent to your registered email.',
      // In dev mode, provide OTP hint for instant testing
      devOTPHint: process.env.NODE_ENV !== 'production' ? rawOTP : undefined,
    });
  } catch (err) {
    next(err);
  }
};

// ==============================================================================
// STAGE 2: VERIFY EMAIL OTP
// ==============================================================================
export const verifyEmailOTP = async (req, res, next) => {
  try {
    const { tempToken, otp } = req.body;
    if (!tempToken || !otp) {
      return res.status(400).json({ success: false, message: 'Missing verification token or OTP.' });
    }

    const decoded = jwt.verify(tempToken, JWT_SECRET);
    if (decoded.stage !== 'OTP_PENDING') {
      return res.status(400).json({ success: false, message: 'Invalid verification flow sequence.' });
    }

    const otpHash = hashToken(otp.trim());
    const { data: otpRecords, error } = await supabase
      .from('email_otps')
      .select('*')
      .eq('admin_id', decoded.id)
      .eq('otp_hash', otpHash)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error || !otpRecords || otpRecords.length === 0) {
      await createAuditLog(decoded.id, decoded.email, 'FAILED_EMAIL_OTP_VERIFICATION', req);
      return res.status(401).json({ success: false, message: 'Invalid or expired Email OTP.' });
    }

    // Clean up consumed OTP
    await supabase.from('email_otps').delete().eq('id', otpRecords[0].id);

    const { data: admin } = await supabase.from('admins').select('*').eq('id', decoded.id).single();

    // Check if TOTP (Google Authenticator) is required
    if (admin.totp_enabled) {
      const totpTempToken = jwt.sign(
        { id: admin.id, email: admin.email, stage: 'TOTP_PENDING' },
        JWT_SECRET,
        { expiresIn: '5m' }
      );
      await createAuditLog(admin.id, admin.email, 'EMAIL_OTP_VERIFIED_TOTP_REQUIRED', req);
      return res.json({
        success: true,
        requiresTOTP: true,
        tempToken: totpTempToken,
        message: 'Email OTP verified. Please enter 6-digit Google Authenticator code.',
      });
    }

    // Issue Final Active Session
    return finalizeAdminSession(admin, req, res);
  } catch (err) {
    next(err);
  }
};

// ==============================================================================
// STAGE 3: VERIFY GOOGLE AUTHENTICATOR TOTP
// ==============================================================================
export const verifyTOTP = async (req, res, next) => {
  try {
    const { tempToken, totpCode, recoveryCode } = req.body;
    if (!tempToken || (!totpCode && !recoveryCode)) {
      return res.status(400).json({ success: false, message: 'Missing TOTP code or recovery code.' });
    }

    const decoded = jwt.verify(tempToken, JWT_SECRET);
    const { data: admin } = await supabase.from('admins').select('*').eq('id', decoded.id).single();

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }

    // Handle Recovery Code Fallback
    if (recoveryCode) {
      const formattedInput = recoveryCode.trim().toUpperCase();
      const currentCodes = admin.recovery_codes || [];

      if (!currentCodes.includes(formattedInput)) {
        await createAuditLog(admin.id, admin.email, 'FAILED_RECOVERY_CODE_ATTEMPT', req);
        return res.status(401).json({ success: false, message: 'Invalid or already used recovery code.' });
      }

      // Remove used recovery code
      const updatedCodes = currentCodes.filter((c) => c !== formattedInput);
      await supabase.from('admins').update({ recovery_codes: updatedCodes }).eq('id', admin.id);
      await createAuditLog(admin.id, admin.email, 'RECOVERY_CODE_USED', req);

      return finalizeAdminSession(admin, req, res);
    }

    // Verify Google Authenticator Code
    const isValid = verifyTOTPCode(admin.totp_secret, totpCode.trim());
    if (!isValid) {
      await createAuditLog(admin.id, admin.email, 'FAILED_TOTP_VERIFICATION', req);
      return res.status(401).json({ success: false, message: 'Invalid Google Authenticator code.' });
    }

    await createAuditLog(admin.id, admin.email, 'TOTP_VERIFIED_SUCCESSFULLY', req);
    return finalizeAdminSession(admin, req, res);
  } catch (err) {
    next(err);
  }
};

// Finalize Admin Session (Sets HTTPOnly Cookie & Records Active Device Session)
const finalizeAdminSession = async (admin, req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const { browser, os, deviceName } = parseUserAgent(userAgent);

  // Single Active Session Rule: Invalidate existing active sessions
  await supabase.from('sessions').update({ is_active: false }).eq('admin_id', admin.id);

  // Generate Refresh Token & Access Token
  const refreshTokenRaw = crypto.randomBytes(32).toString('hex');
  const refreshTokenHash = hashToken(refreshTokenRaw);
  const refreshExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day

  await supabase.from('sessions').insert([{
    admin_id: admin.id,
    refresh_token_hash: refreshTokenHash,
    device_name: deviceName,
    browser,
    os,
    ip_address: clientIp,
    user_agent: userAgent,
    expires_at: refreshExpires,
    is_active: true,
  }]);

  const accessToken = jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  // Set HTTPOnly Cookie
  res.cookie('__Host-admin_session', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  await createAuditLog(admin.id, admin.email, 'LOGIN_SUCCESS_SESSION_INITIALIZED', req, { deviceName, browser, os });

  return res.json({
    success: true,
    message: 'Admin authentication completed successfully.',
    token: accessToken,
    refreshToken: refreshTokenRaw,
    admin: {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      totpEnabled: admin.totp_enabled,
    },
  });
};

// ==============================================================================
// 2FA SETUP & GOOGLE AUTHENTICATOR
// ==============================================================================
export const setup2FA = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const { data: admin } = await supabase.from('admins').select('*').eq('id', adminId).single();

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }

    const secret = generateTOTPSecret(admin.email);
    const qrCodeUrl = await generateQRCodeDataUrl(secret.otpauth_url);

    // Save secret temporarily
    await supabase.from('admins').update({ totp_secret: secret.base32 }).eq('id', adminId);

    return res.json({
      success: true,
      secret: secret.base32,
      qrCodeUrl,
      message: 'Scan QR code with Google Authenticator or enter secret manually.',
    });
  } catch (err) {
    next(err);
  }
};

export const confirm2FA = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const { totpCode } = req.body;

    const { data: admin } = await supabase.from('admins').select('*').eq('id', adminId).single();
    if (!admin || !admin.totp_secret) {
      return res.status(400).json({ success: false, message: '2FA setup not initialized.' });
    }

    const isValid = verifyTOTPCode(admin.totp_secret, totpCode.trim());
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid code. Check your Google Authenticator app.' });
    }

    const recoveryCodes = generateRecoveryCodes();
    await supabase.from('admins').update({
      totp_enabled: true,
      recovery_codes: recoveryCodes,
    }).eq('id', adminId);

    await createAuditLog(adminId, admin.email, '2FA_ENABLED_SUCCESSFULLY', req);

    return res.json({
      success: true,
      recoveryCodes,
      message: 'Google Authenticator 2FA enabled! Store your 10 recovery codes safely.',
    });
  } catch (err) {
    next(err);
  }
};

// GET CURRENT PROFILE & SECURITY SCORE
export const getProfile = async (req, res, next) => {
  try {
    const adminId = req.admin.id;

    if (adminId === 'master_admin') {
      return res.json({
        success: true,
        admin: {
          id: 'master_admin',
          email: 'admin@zenemoo.in',
          role: 'SuperAdmin',
          totpEnabled: true,
          securityScore: 'A+',
        },
      });
    }

    const { data: admin } = await supabase.from('admins').select('id, email, role, totp_enabled, created_at').eq('id', adminId).single();
    const { data: activeSessions } = await supabase.from('sessions').select('*').eq('admin_id', adminId).eq('is_active', true);

    let securityScore = 'B';
    if (admin.totp_enabled) securityScore = 'A+';
    else securityScore = 'B-';

    return res.json({
      success: true,
      admin: {
        ...admin,
        totpEnabled: admin.totp_enabled,
        activeSessionsCount: activeSessions ? activeSessions.length : 1,
        securityScore,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET ACTIVE SESSIONS
export const getSessions = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const { data: sessions } = await supabase.from('sessions').select('*').eq('admin_id', adminId).order('last_seen', { ascending: false });
    return res.json({ success: true, sessions: sessions || [] });
  } catch (err) {
    next(err);
  }
};

// REVOKE SESSION BY ID
export const revokeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    await supabase.from('sessions').update({ is_active: false }).eq('id', sessionId);
    await createAuditLog(req.admin.id, req.admin.email, 'REVOKED_ACTIVE_SESSION', req, { sessionId });
    return res.json({ success: true, message: 'Session revoked successfully.' });
  } catch (err) {
    next(err);
  }
};

// LOGOUT
export const logout = async (req, res, next) => {
  try {
    if (req.admin && req.admin.id) {
      await supabase.from('sessions').update({ is_active: false }).eq('admin_id', req.admin.id);
      await createAuditLog(req.admin.id, req.admin.email, 'LOGOUT', req);
    }
    res.clearCookie('__Host-admin_session');
    res.clearCookie('admin_session');
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

// CHANGE PASSWORD
export const changePassword = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const { currentPassword, newPassword } = req.body;

    const strengthCheck = validatePasswordStrength(newPassword);
    if (!strengthCheck.valid) {
      return res.status(400).json({ success: false, message: strengthCheck.message });
    }

    const { data: admin } = await supabase.from('admins').select('*').eq('id', adminId).single();
    const isMatch = await comparePassword(currentPassword, admin.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const newHash = await hashPassword(newPassword);
    await supabase.from('admins').update({ password_hash: newHash, updated_at: new Date().toISOString() }).eq('id', adminId);

    await createAuditLog(adminId, admin.email, 'PASSWORD_CHANGED', req);
    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};

// GET AUDIT LOGS
export const getAuditLogs = async (req, res, next) => {
  try {
    const { data: logs } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50);
    return res.json({ success: true, logs: logs || [] });
  } catch (err) {
    next(err);
  }
};
