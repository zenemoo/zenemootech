import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Validate password against enterprise complexity rules
export const validatePasswordStrength = (password) => {
  if (!password || password.length < 16) {
    return { valid: false, message: 'Password must be at least 16 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*...).' };
  }
  return { valid: true, message: 'Strong Password' };
};

// Hash password with bcrypt (12 rounds)
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

// Compare password
export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Hash generic string (for OTP & tokens)
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Generate 6-digit Email OTP
export const generateEmailOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate TOTP Secret for Google Authenticator
export const generateTOTPSecret = (email) => {
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `Zenemoo Security:${email}`,
    issuer: 'Zenemoo',
  });
  return secret;
};

// Generate Data URL for QR Code
export const generateQRCodeDataUrl = async (otpauthUrl) => {
  return await QRCode.toDataURL(otpauthUrl);
};

// Verify TOTP Code
export const verifyTOTPCode = (secret, token) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2, // Allow 1-step clock skew
  });
};

// Generate 10 Backup Recovery Codes
export const generateRecoveryCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    const rawCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${rawCode.slice(0, 4)}-${rawCode.slice(4)}`;
    codes.push(formatted);
  }
  return codes;
};

// Cloudflare Turnstile Verification Helper
export const verifyTurnstileToken = async (turnstileToken, clientIp) => {
  const turnstileSecret = process.env.TURNSTILE_SECRET;
  // If not configured in dev, pass gracefully
  if (!turnstileSecret || turnstileSecret === 'development_dummy_key') {
    return true;
  }
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: turnstileToken,
        remoteip: clientIp,
      }),
    });
    const data = await response.json();
    return data.success === true;
  } catch (err) {
    console.warn('Turnstile verification warning:', err.message);
    return true; // Fallback for network issues in dev
  }
};

// Simple User-Agent Parser for Device Tracking
export const parseUserAgent = (userAgentString = '') => {
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let deviceName = 'Desktop';

  if (userAgentString.includes('Firefox')) browser = 'Firefox';
  else if (userAgentString.includes('Chrome')) browser = 'Chrome';
  else if (userAgentString.includes('Safari')) browser = 'Safari';
  else if (userAgentString.includes('Edge')) browser = 'Edge';

  if (userAgentString.includes('Windows')) os = 'Windows';
  else if (userAgentString.includes('Mac')) os = 'macOS';
  else if (userAgentString.includes('Android')) { os = 'Android'; deviceName = 'Mobile'; }
  else if (userAgentString.includes('iPhone') || userAgentString.includes('iPad')) { os = 'iOS'; deviceName = 'Mobile'; }
  else if (userAgentString.includes('Linux')) os = 'Linux';

  return { browser, os, deviceName };
};
