import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { sendTelegramAlert, getClientIp, parseUserAgent, getApproximateLocation } from '../services/telegramService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'zenemoo2026';

// In-Memory Backup Caches (Ensures System Reliability even if DB table creation is pending)
const otpStore = new Map(); // key: email, value: { hash, expiresAt, attempts, used }
const rateLimitStore = new Map(); // key: email, value: [timestamps]
const auditLogsStore = [];

// Core Executive Allowed Email List Backup
const DEFAULT_ALLOWED_EMAILS = [
  'mr.prem2006@gmail.com',
  'contact@mrprem.in',
  'zenemootech@gmail.com',
  'contact@zenemoo.in',
  'support@zenemoo.in',
  'info@zenemoo.in',
];

/**
 * Helper: Audit Log Writer
 */
const writeAuditLog = async (req, eventType, email, details = {}) => {
  const logEntry = {
    event_type: eventType,
    email: email || 'unknown',
    ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown',
    details,
    created_at: new Date().toISOString(),
  };

  auditLogsStore.push(logEntry);

  if (supabase) {
    try {
      await supabase.from('admin_audit_logs').insert([logEntry]);
    } catch (err) {
      console.warn('[Audit Log Supabase Note]', err.message);
    }
  }
};

/**
 * Helper: Check Admin Email Authorization
 */
const checkAdminEmailAuthorized = async (email) => {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return false;

  // 1. Query Supabase authorized_admin_emails table
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('authorized_admin_emails')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!error && data) {
        return true;
      }
    } catch (err) {
      console.warn('[Auth Check DB Note]', err.message);
    }
  }

  // 2. Check domain or fallback list
  return DEFAULT_ALLOWED_EMAILS.includes(cleanEmail) || cleanEmail.endsWith('@zenemoo.in');
};

/**
 * Helper: Hash OTP using SHA-256
 */
const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
};

/**
 * 1. Admin Login
 */
export const login = async (req, res, next) => {
  try {
    const { passcode, email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    console.log('-----------------------------------------------------');
    console.log('🔑 ADMIN LOGIN ATTEMPT');
    console.log('   - Email:', cleanEmail || '❌ NOT PROVIDED');
    console.log('   - Passcode Provided:', passcode ? '***' : '❌ NOT PROVIDED');
    console.log('-----------------------------------------------------');

    if (!cleanEmail) {
      console.warn('⚠️ Login failed: Email is missing.');
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const isAuth = await checkAdminEmailAuthorized(cleanEmail);
    if (!isAuth) {
      console.warn(`⚠️ Login unauthorized: ${cleanEmail} is not on the authorized list.`);
      await writeAuditLog(req, 'LOGIN_FAILED_UNAUTHORIZED_EMAIL', cleanEmail);
      return res.status(403).json({ success: false, message: 'Access Denied: Email is not an authorized administrator.' });
    }

    let dbUser = null;
    let passwordHash = null;

    if (supabase) {
      try {
        console.log(`🌐 Querying database for authorized admin email: ${cleanEmail}`);
        const { data, error } = await supabase
          .from('authorized_admin_emails')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (error) {
          console.error('❌ Supabase database query error on login:', error.message);
        } else if (data) {
          dbUser = data;
          passwordHash = data.password_hash;
          console.log(`✅ DB record found for ${cleanEmail}. Password hash present:`, passwordHash ? 'YES' : 'NO');
        } else {
          console.log(`ℹ️ No DB record found in authorized_admin_emails for ${cleanEmail} (using email rules fallback).`);
        }
      } catch (dbErr) {
        console.error('❌ Database connection/query exception during login:', dbErr);
      }
    }

    let isPasswordValid = false;

    if (passwordHash) {
      console.log('🔐 Performing bcrypt hash comparison against database password...');
      isPasswordValid = await bcrypt.compare(passcode, passwordHash);
      console.log('🔒 Bcrypt verification result:', isPasswordValid ? '✅ MATCH' : '❌ MISMATCH');
    } else {
      console.warn(`⚠️ Login failed: No password hash configured in database for ${cleanEmail}.`);
    }

    if (!isPasswordValid) {
      console.warn(`❌ Login failure: Invalid credentials for admin email: ${cleanEmail}`);
      await writeAuditLog(req, 'LOGIN_FAILED_BAD_PASSCODE', cleanEmail);
      return res.status(401).json({ success: false, message: 'Invalid admin passcode.' });
    }

    const token = jwt.sign(
      { role: 'admin', email: cleanEmail },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    console.log(`🎉 LOGIN SUCCESS! Generated JWT token for ${cleanEmail}`);

    // Detect new device before writing the new audit log
    let isNewDevice = false;
    if (supabase) {
      try {
        const { data: lastLogin, error: lastLoginErr } = await supabase
          .from('admin_audit_logs')
          .select('user_agent')
          .eq('email', cleanEmail)
          .eq('event_type', 'LOGIN_SUCCESS')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!lastLoginErr && lastLogin) {
          const lastUA = lastLogin.user_agent;
          const currentUA = req.headers['user-agent'] || '';
          
          const lastDetails = parseUserAgent(lastUA);
          const currentDetails = parseUserAgent(currentUA);
          
          if (lastDetails.device !== currentDetails.device || lastDetails.browser !== currentDetails.browser) {
            isNewDevice = true;
            console.log(`⚠️ New Device/Browser Detected for ${cleanEmail}: ${currentDetails.device} / ${currentDetails.browser}`);
          }
        }
      } catch (err) {
        console.warn('Error checking last login user agent:', err.message);
      }
    }

    await writeAuditLog(req, 'LOGIN_SUCCESS', cleanEmail, { isNewDevice });

    // Send Telegram Alert if Chat ID is linked
    const telegramChatId = dbUser?.telegram_chat_id;
    if (telegramChatId) {
      const clientIp = getClientIp(req);
      const userAgent = req.headers['user-agent'] || '';
      
      // Execute alert asynchronously to minimize login latency
      (async () => {
        try {
          const location = await getApproximateLocation(clientIp);
          console.log(`📍 Resolved Location for ${cleanEmail}: ${location}`);
          await sendTelegramAlert(telegramChatId, 'login', {
            email: cleanEmail,
            ip: clientIp,
            userAgent: userAgent,
            location: location,
            isNewDevice: isNewDevice
          });
        } catch (e) {
          console.error('Failed to send login Telegram alert:', e.message);
        }
      })();
    }

    res.json({
      success: true,
      message: 'Admin authentication successful',
      token,
      user: { role: 'admin', email: cleanEmail },
    });
  } catch (err) {
    console.error('🔥 Login Exception:', err);
    next(err);
  }
};

/**
 * 2. POST /api/auth/check-email
 * Live validation as user types email address
 */
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    console.log(`🔍 Live validating authorization for email: ${cleanEmail}`);

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const isAuthorized = await checkAdminEmailAuthorized(cleanEmail);

    if (!isAuthorized) {
      await writeAuditLog(req, 'UNAUTHORIZED_EMAIL_ATTEMPT', cleanEmail);
      return res.status(404).json({
        success: false,
        exists: false,
        message: '❌ You are not an authorized administrator.',
      });
    }

    console.log(`✅ Live validation success: ${cleanEmail} is authorized.`);
    return res.json({
      success: true,
      exists: true,
      message: '✅ Administrator account found.',
    });
  } catch (err) {
    console.error('🔥 checkEmail Error:', err);
    return res.status(500).json({ success: false, message: 'Error checking email authorization.' });
  }
};

/**
 * 3. POST /api/auth/forgot-password
 * Generates OTP, stores SHA-256 hash (5 min expiry), dispatches Brevo Email
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    console.log('-----------------------------------------------------');
    console.log('🔑 TELEGRAM OTP GENERATION & DISPATCH FLOW INITIATED');
    console.log('   - Recipient Email:', cleanEmail);
    console.log('-----------------------------------------------------');

    if (!cleanEmail) {
      console.warn('⚠️ OTP request failed: Email is required.');
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const isAuthorized = await checkAdminEmailAuthorized(cleanEmail);
    if (!isAuthorized) {
      console.warn(`⚠️ OTP request unauthorized for email: ${cleanEmail}`);
      await writeAuditLog(req, 'UNAUTHORIZED_EMAIL_ATTEMPT', cleanEmail);
      return res.status(404).json({ success: false, message: '❌ You are not an authorized administrator.' });
    }

    // Lookup linked Telegram Chat ID from database
    let telegramChatId = null;
    if (supabase) {
      try {
        console.log(`🌐 Querying database for authorized admin email: ${cleanEmail}`);
        const { data, error } = await supabase
          .from('authorized_admin_emails')
          .select('telegram_chat_id')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (error) {
          console.error('❌ Supabase database query error on password recovery:', error.message);
        } else if (data) {
          telegramChatId = data.telegram_chat_id;
          console.log(`✅ DB record found for ${cleanEmail}. Telegram Chat ID:`, telegramChatId || '❌ NONE');
        }
      } catch (dbErr) {
        console.error('❌ Database connection/query exception during password recovery:', dbErr);
      }
    }

    if (!telegramChatId) {
      console.warn(`⚠️ Telegram account is not linked for admin email: ${cleanEmail}`);
      await writeAuditLog(req, 'PASSWORD_RESET_FAILED_NO_TELEGRAM_LINKED', cleanEmail);
      return res.status(400).json({
        success: false,
        message: 'Telegram account is not linked. Please contact the system administrator.'
      });
    }

    // Rate Limiting Check: Max 3 OTP requests per hour per email
    const now = Date.now();
    const userLimits = rateLimitStore.get(cleanEmail) || [];
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentRequests = userLimits.filter((ts) => ts > oneHourAgo);

    if (recentRequests.length >= 3) {
      console.warn(`⚠️ OTP request rate limited for ${cleanEmail}. Count: ${recentRequests.length}`);
      await writeAuditLog(req, 'OTP_RATE_LIMIT_EXCEEDED', cleanEmail);
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Maximum 3 requests allowed per hour. Please wait before retrying.',
      });
    }

    recentRequests.push(now);
    rateLimitStore.set(cleanEmail, recentRequests);

    // Generate Secure 6-digit numeric OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHashed = hashOtp(rawOtp);
    const expiresAt = new Date(now + 5 * 60 * 1000); // 5 minutes expiration

    console.log(`🔐 Generated 6-digit OTP for Telegram. Expiry: ${expiresAt.toISOString()}`);

    // Delete Previous OTPs for this email in Supabase DB
    if (supabase) {
      try {
        console.log(`🌐 Deleting old OTPs and saving new OTP for ${cleanEmail} in Supabase...`);
        const { error: delError } = await supabase.from('admin_otps').delete().eq('email', cleanEmail);
        if (delError) {
          console.warn('⚠️ Supabase OTP deletion warning:', delError.message);
        }
        
        const { error: insError } = await supabase.from('admin_otps').insert([
          {
            email: cleanEmail,
            otp_hash: otpHashed,
            expires_at: expiresAt.toISOString(),
            attempts: 0,
            used: false,
          },
        ]);
        if (insError) {
          console.warn('⚠️ Supabase OTP insert warning:', insError.message);
        } else {
          console.log(`✅ Stored OTP hash in Supabase admin_otps table for ${cleanEmail}`);
        }
      } catch (dbErr) {
        console.error('❌ Supabase OTP storage exception:', dbErr);
      }
    }

    // Update in-memory OTP cache backup
    otpStore.set(cleanEmail, {
      hash: otpHashed,
      expiresAt: expiresAt.getTime(),
      attempts: 0,
      used: false,
    });
    console.log(`✅ Updated in-memory backup cache with OTP hash for ${cleanEmail}`);

    // Send Telegram OTP
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const location = await getApproximateLocation(clientIp);

    console.log(`📧 Dispatching OTP via Telegram Bot to chat: ${telegramChatId}`);
    const telegramResult = await sendTelegramAlert(telegramChatId, 'otp', {
      email: cleanEmail,
      otp: rawOtp,
      ip: clientIp,
      userAgent: userAgent,
      location: location
    });

    if (!telegramResult || !telegramResult.success) {
      console.error(`❌ Telegram delivery failed: ${telegramResult?.error || 'Unknown Telegram API error'}`);
      return res.status(500).json({
        success: false,
        message: `Failed to deliver Telegram OTP code. Details: ${telegramResult?.error || 'Telegram API failure'}`
      });
    }

    console.log(`✅ Telegram OTP delivered successfully! Message ID: ${telegramResult.messageId}`);
    await writeAuditLog(req, 'PASSWORD_RESET_TELEGRAM_OTP_SENT', cleanEmail);

    return res.json({
      success: true,
      message: `A verification code has been sent to your linked Telegram account.`,
    });
  } catch (err) {
    console.error('🔥 forgotPassword Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to process password reset request.' });
  }
};

/**
 * 4. POST /api/auth/verify-otp
 * Verifies the 6-digit OTP code against the stored SHA-256 hash
 */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    console.log('-----------------------------------------------------');
    console.log('🔑 OTP VERIFICATION ATTEMPT');
    console.log('   - Recipient:', cleanEmail);
    console.log('   - Input OTP:', cleanOtp);
    console.log('-----------------------------------------------------');

    if (!cleanEmail || !cleanOtp) {
      console.warn('⚠️ OTP Verification failed: Email and OTP are required.');
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required.' });
    }

    const hashedInput = hashOtp(cleanOtp);
    const now = Date.now();

    let record = null;
    let dbLookupSucceeded = false;

    // Check Supabase DB
    if (supabase) {
      try {
        console.log(`🌐 Querying Supabase admin_otps for: ${cleanEmail}`);
        const { data, error } = await supabase
          .from('admin_otps')
          .select('*')
          .eq('email', cleanEmail)
          .eq('used', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('❌ Supabase OTP lookup error:', error.message);
        } else if (data) {
          record = {
            id: data.id,
            hash: data.otp_hash,
            expiresAt: new Date(data.expires_at).getTime(),
            attempts: data.attempts || 0,
            used: data.used,
          };
          dbLookupSucceeded = true;
          console.log(`✅ DB record found. Attempts: ${record.attempts}, Expires at: ${data.expires_at}`);
        } else {
          console.log('ℹ️ No unused DB record found for this email.');
        }
      } catch (err) {
        console.error('❌ Supabase OTP Query exception:', err);
      }
    }

    // Fallback to Memory Cache if DB lookup produced no record
    if (!record) {
      console.log('ℹ️ Checking in-memory fallback OTP backup cache...');
      record = otpStore.get(cleanEmail);
      if (record) {
        console.log(`✅ In-memory backup record found. Attempts: ${record.attempts}, Expires: ${new Date(record.expiresAt).toISOString()}`);
      } else {
        console.warn('⚠️ No backup memory record found.');
      }
    }

    if (!record || record.used) {
      console.warn(`❌ OTP verification failed: No active OTP record exists for ${cleanEmail}`);
      await writeAuditLog(req, 'OTP_VERIFICATION_FAILED_NO_RECORD', cleanEmail);
      return res.status(400).json({ success: false, message: 'No active OTP request found for this email. Please request a new code.' });
    }

    if (now > record.expiresAt) {
      console.warn(`❌ OTP verification failed: OTP has expired. Current time: ${new Date(now).toISOString()}, Expiry: ${new Date(record.expiresAt).toISOString()}`);
      await writeAuditLog(req, 'OTP_EXPIRED', cleanEmail);
      return res.status(400).json({ success: false, message: 'OTP has expired (5-minute limit). Please click Resend OTP.' });
    }

    if (record.attempts >= 5) {
      console.warn(`❌ OTP verification failed: Maximum attempts reached. Attempts count: ${record.attempts}`);
      await writeAuditLog(req, 'OTP_MAX_ATTEMPTS_EXCEEDED', cleanEmail);
      return res.status(400).json({ success: false, message: 'Maximum verification attempts (5) exceeded. Please request a new OTP.' });
    }

    if (record.hash !== hashedInput) {
      const newAttempts = record.attempts + 1;
      console.warn(`❌ OTP verification mismatch: Input ${cleanOtp} (Hash: ${hashedInput}) does not match stored hash: ${record.hash}. Attempt ${newAttempts} of 5.`);
      
      if (supabase && record.id) {
        try {
          await supabase.from('admin_otps').update({ attempts: newAttempts }).eq('id', record.id);
        } catch (dbUpdErr) {
          console.error('❌ Failed to increment OTP attempts in database:', dbUpdErr.message);
        }
      }
      otpStore.set(cleanEmail, { ...record, attempts: newAttempts });

      await writeAuditLog(req, 'OTP_VERIFICATION_FAILED_BAD_CODE', cleanEmail, { attempt: newAttempts });
      return res.status(400).json({
        success: false,
        message: `Invalid 6-digit OTP code. Attempt ${newAttempts} of 5.`,
      });
    }

    console.log(`🎉 SUCCESS! OTP verification succeeded for ${cleanEmail}`);
    await writeAuditLog(req, 'OTP_VERIFIED', cleanEmail);

    return res.json({
      success: true,
      message: 'OTP verified successfully.',
    });
  } catch (err) {
    console.error('🔥 verifyOtp Error:', err);
    return res.status(500).json({ success: false, message: 'Error verifying OTP code.' });
  }
};

/**
 * 5. POST /api/auth/reset-password
 * Verifies OTP again, hashes new password with bcrypt, updates DB password_hash
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    console.log('-----------------------------------------------------');
    console.log('🔒 PASSWORD RESET FLOW INITIATED');
    console.log('   - Recipient:', cleanEmail);
    console.log('   - Verify OTP:', cleanOtp);
    console.log('-----------------------------------------------------');

    if (!cleanEmail || !cleanOtp || !newPassword) {
      console.warn('⚠️ Password reset failed: Missing required fields.');
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    }

    // Password strength check
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.',
      });
    }

    // Hash OTP and verify
    const hashedInput = hashOtp(cleanOtp);
    const now = Date.now();

    let record = null;

    if (supabase) {
      try {
        console.log(`🌐 Double-checking OTP record in database for: ${cleanEmail}`);
        const { data } = await supabase
          .from('admin_otps')
          .select('*')
          .eq('email', cleanEmail)
          .eq('used', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          record = {
            id: data.id,
            hash: data.otp_hash,
            expiresAt: new Date(data.expires_at).getTime(),
          };
          console.log(`✅ DB record found for password reset.`);
        }
      } catch (err) {
        console.error('❌ Supabase OTP lookup exception during reset:', err.message);
      }
    }

    if (!record) {
      console.log('ℹ️ Checking fallback in-memory OTP cache during reset...');
      record = otpStore.get(cleanEmail);
    }

    if (!record || record.hash !== hashedInput || now > record.expiresAt) {
      console.warn('❌ Security verification failed: OTP is invalid or expired.');
      return res.status(400).json({ success: false, message: 'Security verification failed or OTP expired.' });
    }

    console.log('🔐 Hashing new password with bcrypt...');
    // Hash new password using bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 10);
    console.log('✅ Hashing successful.');

    // Update password_hash in Supabase authorized_admin_emails table
    if (supabase) {
      try {
        console.log(`🌐 Fetching user details to retrieve telegram_chat_id for: ${cleanEmail}...`);
        
        let telegramChatId = null;
        const { data: userData, error: userError } = await supabase
          .from('authorized_admin_emails')
          .select('telegram_chat_id')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (!userError && userData) {
          telegramChatId = userData.telegram_chat_id;
        }

        console.log(`🌐 Updating password_hash and last_password_reset in DB for: ${cleanEmail}...`);
        const { error } = await supabase
          .from('authorized_admin_emails')
          .update({ 
            password_hash: passwordHash,
            last_password_reset: new Date().toISOString()
          })
          .eq('email', cleanEmail);

        if (error) {
          console.error('❌ Supabase password_hash update error:', error.message);
          throw error;
        }
        
        console.log(`✅ Password hash successfully updated in database.`);

        // If a telegram chat ID is linked, send a password change success confirmation alert!
        if (telegramChatId) {
          const clientIp = getClientIp(req);
          const userAgent = req.headers['user-agent'] || '';
          const location = await getApproximateLocation(clientIp);
          console.log(`📧 Dispatching password changed confirmation via Telegram Bot to chat: ${telegramChatId}`);
          await sendTelegramAlert(telegramChatId, 'password_changed', {
            email: cleanEmail,
            ip: clientIp,
            userAgent: userAgent,
            location: location
          });
        }

        // Delete used OTP
        if (record.id) {
          console.log(`🌐 Deleting used OTP with ID ${record.id} from Supabase...`);
          await supabase.from('admin_otps').delete().eq('id', record.id);
        }
      } catch (dbErr) {
        console.error('❌ Supabase database password update exception:', dbErr.message);
      }
    }

    // Save in process environment and clear OTP store
    process.env.CUSTOM_ADMIN_PASSCODE = newPassword;
    otpStore.delete(cleanEmail);
    console.log('🧹 Cleared OTP store cache and updated custom admin passcode environment variable.');

    await writeAuditLog(req, 'PASSWORD_RESET_SUCCESS', cleanEmail);

    return res.json({
      success: true,
      message: 'Password updated successfully! Old session tokens invalidated. Please log in with your new password.',
    });
  } catch (err) {
    console.error('🔥 resetPassword Error:', err);
    return res.status(500).json({ success: false, message: 'Error resetting admin password.' });
  }
};

/**
 * 6. Logout & Profile
 */
export const logout = async (req, res) => {
  const cleanEmail = req.user?.email || 'unknown';
  await writeAuditLog(req, 'LOGOUT', cleanEmail);
  res.json({ success: true, message: 'Logged out successfully' });
};

export const getProfile = async (req, res) => {
  const cleanEmail = req.user?.email || '';
  let profile = { email: cleanEmail, role: req.user?.role || 'admin', name: cleanEmail.split('@')[0] };
  
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';
  
  if (supabase && cleanEmail) {
    try {
      const { data, error } = await supabase
        .from('authorized_admin_emails')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (!error && data) {
        profile = {
          ...profile,
          ...data,
        };
      }
    } catch (e) {
      console.warn('Error fetching profile from db:', e.message);
    }
  }
  
  res.json({
    success: true,
    user: profile,
    connection: {
      ip: clientIp,
      userAgent: userAgent,
    }
  });
};

export const getAuditLogs = async (req, res) => {
  const cleanEmail = req.user?.email || '';
  if (!cleanEmail) {
    return res.status(400).json({ success: false, message: 'Invalid session' });
  }

  // Fetch last 10 audit logs from Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        return res.json({ success: true, logs: data });
      }
    } catch (err) {
      console.warn('Error querying audit logs from Supabase:', err.message);
    }
  }

  // Fallback to in-memory backup logs filtered by email
  const fallbackLogs = auditLogsStore
    .filter(log => log.email === cleanEmail)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  res.json({ success: true, logs: fallbackLogs });
};
