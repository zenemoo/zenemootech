import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

let cachedKey = null;
const getKey = () => {
  if (cachedKey) return cachedKey;
  const secretKey = process.env.ENCRYPTION_SECRET;
  if (!secretKey || secretKey.trim() === '') {
    throw new Error('Server configuration error: ENCRYPTION_SECRET environment variable is missing.');
  }
  cachedKey = crypto.scryptSync(secretKey.trim(), 'zenemoo_salt', 32);
  return cachedKey;
};

/**
 * Encrypt a text string or object into iv:encryptedHex format
 */
export const encrypt = (text) => {
  if (text === null || text === undefined) return '';
  const stringValue = typeof text === 'object' ? JSON.stringify(text) : String(text);
  if (!stringValue) return '';

  try {
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(stringValue, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return stringValue; // Fallback to raw string if encryption fails
  }
};

/**
 * Decrypt an iv:encryptedHex formatted string
 */
export const decrypt = (encryptedData, isJson = false) => {
  if (!encryptedData || typeof encryptedData !== 'string') return isJson ? [] : '';
  if (!encryptedData.includes(':')) {
    // If not encrypted format, return string/JSON fallback directly
    if (isJson) {
      try {
        return JSON.parse(encryptedData);
      } catch (e) {
        return [];
      }
    }
    return encryptedData;
  }

  try {
    const [ivHex, cipherHex] = encryptedData.split(':');
    if (!ivHex || !cipherHex) return isJson ? [] : encryptedData;

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    if (isJson) {
      try {
        return JSON.parse(decrypted);
      } catch (e) {
        return [];
      }
    }

    return decrypted;
  } catch (err) {
    console.warn('Decryption warning (returning raw text):', err.message);
    if (isJson) {
      try {
        return JSON.parse(encryptedData);
      } catch (e) {
        return [];
      }
    }
    return encryptedData;
  }
};
