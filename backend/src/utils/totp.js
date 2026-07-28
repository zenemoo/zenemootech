import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';

/**
 * Encrypt a plain string (e.g. Base32 secret)
 */
export function encryptText(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt an encrypted string
 */
export function decryptText(encryptedText) {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const [ivHex, encryptedHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    return encryptedText;
  }
}

/**
 * Generate cryptographically secure Base32 TOTP secret for user
 */
export function generateTotpSecret(userEmail) {
  const email = userEmail || 'admin@zenemoo.in';
  const secret = speakeasy.generateSecret({
    length: 20, // 32 Base32 characters
    name: `Zenemoo (${email})`,
    issuer: 'Zenemoo',
  });

  return {
    base32Secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  };
}

/**
 * Generate PNG QR Code Data URL from otpauth URL
 */
export async function generateQrCodeDataUrl(otpauthUrl) {
  try {
    return await QRCode.toDataURL(otpauthUrl, {
      margin: 2,
      width: 240,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}

/**
 * Verify 6-digit TOTP token against Base32 secret (SHA-1, 30s interval, drift window = 1)
 */
export function verifyTotpToken(base32Secret, token) {
  if (!base32Secret || !token) return false;
  const cleanToken = String(token).trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const decryptedSecret = decryptText(base32Secret);

  return speakeasy.totp.verify({
    secret: decryptedSecret,
    encoding: 'base32',
    token: cleanToken,
    window: 1, // Allows +-30s time drift
  });
}

/**
 * Generate 10 single-use high-entropy backup recovery codes
 */
export function generateBackupRecoveryCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part1}-${part2}-${part3}`);
  }
  return codes;
}

/**
 * Hash a backup recovery code for secure database storage
 */
export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}
