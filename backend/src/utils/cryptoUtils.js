import crypto from 'crypto';

const SECRET = process.env.ZENEMOO_PII_ENCRYPTION_KEY || 'zenemoo_enterprise_pii_secret_key_2026_super_secure';
// Derive 32-byte key using SHA-256 digest
const KEY = crypto.createHash('sha256').update(SECRET).digest();

export const SENSITIVE_PROFILE_FIELDS = [
  'personal_email',
  'personal_mobile',
  'account_number',
  'ifsc_code',
  'upi_id',
  'pan_number',
  'aadhaar_number',
  'passport_number',
  'emergency_contact_number',
];

/**
 * Encrypt a single plain-text string using AES-256-GCM
 */
export function encryptField(plainText) {
  if (!plainText || typeof plainText !== 'string' || plainText.trim() === '') {
    return plainText;
  }
  // Avoid double-encrypting
  if (plainText.startsWith('ENC:')) {
    return plainText;
  }

  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    let encrypted = cipher.update(plainText.trim(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `ENC:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Field encryption failed:', err);
    return plainText;
  }
}

/**
 * Decrypt a single AES-256-GCM encrypted string
 */
export function decryptField(cipherText) {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.startsWith('ENC:')) {
    return cipherText;
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 4) return cipherText;

    const [, ivHex, tagHex, contentHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn('Field decryption failed (invalid key or corrupted cipher text):', err.message);
    return '[Protected Field]';
  }
}

/**
 * Helper to encrypt an object's specified sensitive fields in-place
 */
export function encryptSensitiveFields(data = {}, fields = SENSITIVE_PROFILE_FIELDS) {
  const result = { ...data };
  for (const field of fields) {
    if (field in result && result[field]) {
      result[field] = encryptField(String(result[field]));
    }
  }
  return result;
}

/**
 * Helper to decrypt an object's specified sensitive fields in-place
 */
export function decryptSensitiveFields(data = {}, fields = SENSITIVE_PROFILE_FIELDS) {
  const result = { ...data };
  for (const field of fields) {
    if (field in result && result[field]) {
      result[field] = decryptField(String(result[field]));
    }
  }
  return result;
}
