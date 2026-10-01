import crypto from 'crypto';
import { decrypt as decryptCbc } from '../services/encryptionService.js';

let cachedPiiKey = null;

function getCandidateKeys() {
  const secrets = [
    process.env.ZENEMOO_PII_ENCRYPTION_KEY,
    process.env.ENCRYPTION_SECRET,
    process.env.JWT_SECRET,
    'zenemoo_production_pii_secure_salt_2025',
    'zenemoo_default_secure_pii_key_2026',
    'zenemoo_salt',
    'zenemoo_secure_encryption_key_2025',
    'zenemoo_secret_key_2024',
  ].filter((s) => s && typeof s === 'string' && s.trim().length > 0);

  const keys = [];
  for (const s of secrets) {
    const trimmed = s.trim();
    // 1. SHA-256 derived 32-byte key
    keys.push(crypto.createHash('sha256').update(trimmed).digest());
    // 2. scrypt derived key
    try {
      keys.push(crypto.scryptSync(trimmed, 'zenemoo_salt', 32));
    } catch (_) {}
  }
  return keys;
}

function getPiiKey() {
  if (cachedPiiKey) return cachedPiiKey;
  const secret =
    process.env.ZENEMOO_PII_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_SECRET ||
    'zenemoo_production_pii_secure_salt_2025';
  cachedPiiKey = crypto.createHash('sha256').update(secret.trim()).digest();
  return cachedPiiKey;
}

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
    const key = getPiiKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
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
 * Decrypt a single AES-256-GCM encrypted string or legacy CBC string
 */
export function decryptField(cipherText) {
  if (!cipherText || typeof cipherText !== 'string') {
    return cipherText || '';
  }

  const trimmed = cipherText.trim();
  if (trimmed === '' || trimmed === '[Protected Field]') {
    return '';
  }

  // Handle AES-256-GCM format: ENC:ivHex:tagHex:contentHex
  if (trimmed.startsWith('ENC:')) {
    const parts = trimmed.split(':');
    if (parts.length === 4) {
      const [, ivHex, tagHex, contentHex] = parts;
      try {
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(tagHex, 'hex');
        const candidateKeys = getCandidateKeys();

        for (const key of candidateKeys) {
          try {
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(contentHex, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            if (decrypted && decrypted.trim()) {
              return decrypted.trim();
            }
          } catch (_) {}
        }
      } catch (err) {
        console.warn('Field GCM decryption error:', err.message);
      }
    }
  }

  // Handle AES-256-CBC format: ivHex:cipherHex (from encryptionService)
  if (trimmed.includes(':') && !trimmed.startsWith('ENC:')) {
    try {
      const cbcResult = decryptCbc(trimmed);
      if (cbcResult && typeof cbcResult === 'string' && cbcResult.trim() && cbcResult !== trimmed) {
        return cbcResult.trim();
      }
    } catch (_) {}
  }

  // If not encrypted format, or plain text, return directly
  if (!trimmed.startsWith('ENC:') && !/^[0-9a-fA-F]{32}:[0-9a-fA-F]{16,}/.test(trimmed)) {
    return trimmed;
  }

  return '';
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
