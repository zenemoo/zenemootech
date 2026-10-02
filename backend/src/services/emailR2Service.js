import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

dotenv.config();

/**
 * Zenemoo Cloudflare R2 Private Email Storage Service
 * Bucket: zenemoo-email-storage
 * 
 * STRICT SECURITY PRINCIPLES:
 * 1. 100% PRIVATE bucket. No public access, no custom domain, no public dev URLs.
 * 2. Deterministic object structure:
 *    - incoming/<email-id>/body.html
 *    - incoming/<email-id>/body.txt
 *    - incoming/<email-id>/raw.eml
 *    - incoming/<email-id>/attachments/<safe-file-name>
 *    - sent/<email-id>/body.html
 *    - sent/<email-id>/body.txt
 *    - sent/<email-id>/attachments/<safe-file-name>
 * 3. Path traversal prevention on all keys and attachment names.
 * 4. Zero frontend exposure of credentials or raw bucket endpoints.
 * 5. Resilient fallback if R2 is unavailable.
 */

export class EmailR2Service {
  constructor() {
    this.bucketName = process.env.CLOUDFLARE_R2_EMAIL_BUCKET_NAME || process.env.R2_EMAIL_BUCKET_NAME || 'zenemoo-email-storage';
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || 'c3e84d8a84eaa06c632f189765eaa9c6';
    this.accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';

    this._client = null;
  }

  /**
   * Sanitizes user-controlled filenames to prevent path traversal and unsafe characters
   */
  sanitizeFilename(rawFilename, fallback = 'attachment') {
    if (!rawFilename || typeof rawFilename !== 'string') return fallback;
    // Strip directory traversal, path separators, and null bytes
    const base = rawFilename
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\\/g, '/')
      .split('/')
      .pop() || fallback;

    const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_');
    return safe || fallback;
  }

  /**
   * Sanitizes ID parameter to prevent path traversal
   */
  sanitizeId(id) {
    if (!id || typeof id !== 'string') return 'unknown_id';
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Helper to check if R2 credentials are configured
   */
  isConfigured() {
    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
    const accessKeyId = this.accessKeyId || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = this.secretAccessKey || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    return Boolean(accountId && accessKeyId && secretAccessKey);
  }

  /**
   * Lazily initializes and returns the S3Client configured for Cloudflare R2
   */
  getClient() {
    if (this._client) return this._client;

    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || 'c3e84d8a84eaa06c632f189765eaa9c6';
    const accessKeyId = this.accessKeyId || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = this.secretAccessKey || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      // In development or when credentials not yet loaded, return null
      return null;
    }

    this._client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId.trim()}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
    });

    return this._client;
  }

  _getWorkerDir() {
    const candidate1 = 'd:/Zenemoo website/cloudflare-workers/zenemoo-portfolio-api';
    const candidate2 = path.resolve(process.cwd(), 'cloudflare-workers/zenemoo-portfolio-api');
    const candidate3 = path.resolve(process.cwd(), '../cloudflare-workers/zenemoo-portfolio-api');
    if (fs.existsSync(candidate1)) return candidate1;
    if (fs.existsSync(candidate2)) return candidate2;
    if (fs.existsSync(candidate3)) return candidate3;
    return process.cwd();
  }

  /**
   * Uploads raw buffer or string to Cloudflare R2
   */
  async putObject({ key, body, contentType = 'application/octet-stream', contentDisposition = null }) {
    if (!key || typeof key !== 'string') {
      throw new Error('[EmailR2Service] putObject requires a valid object key.');
    }

    let bufferBody;
    if (Buffer.isBuffer(body)) {
      bufferBody = body;
    } else if (typeof body === 'string') {
      bufferBody = Buffer.from(body, 'utf8');
    } else {
      throw new Error('[EmailR2Service] putObject body must be Buffer or string.');
    }

    const client = this.getClient();
    if (!client) {
      const workerDir = this._getWorkerDir();
      const tempId = `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const tempFile = path.join(workerDir, tempId);
      fs.writeFileSync(tempFile, bufferBody);
      try {
        execSync(`npx wrangler r2 object put "${this.bucketName}/${key}" --remote --file "${tempId}" --ct "${contentType}" -y`, {
          cwd: workerDir,
          shell: 'cmd.exe',
          stdio: 'pipe',
          maxBuffer: 50 * 1024 * 1024,
        });
        return {
          key,
          byteSize: bufferBody.length,
          etag: 'r2-migrated',
        };
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: bufferBody,
      ContentType: contentType,
      ContentDisposition: contentDisposition || undefined,
      CacheControl: 'private, no-cache, no-store',
    });

    const response = await client.send(command);
    return {
      key,
      byteSize: bufferBody.length,
      etag: (response.ETag || '').replace(/"/g, ''),
    };
  }

  /**
   * Retrieves an object from Cloudflare R2 as a Buffer
   */
  async getObjectBuffer(key) {
    if (!key) return null;
    const client = this.getClient();
    if (!client) {
      const workerDir = this._getWorkerDir();
      const tempId = `get_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const tempFile = path.join(workerDir, tempId);
      try {
        execSync(`npx wrangler r2 object get "${this.bucketName}/${key}" --remote --file "${tempId}"`, {
          cwd: workerDir,
          shell: 'cmd.exe',
          stdio: 'pipe',
          maxBuffer: 50 * 1024 * 1024,
        });
        if (!fs.existsSync(tempFile)) return null;
        const buffer = fs.readFileSync(tempFile);
        return {
          buffer,
          contentType: 'application/octet-stream',
          contentLength: buffer.length,
          etag: 'r2-fetched',
        };
      } catch (err) {
        return null;
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await client.send(command);
      if (!response.Body) return null;

      let buffer;
      if (typeof response.Body.transformToByteArray === 'function') {
        const uint8Array = await response.Body.transformToByteArray();
        buffer = Buffer.from(uint8Array);
      } else {
        const streamToBuffer = async (stream) => {
          return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
          });
        };
        buffer = await streamToBuffer(response.Body);
      }

      return {
        buffer,
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: Number(response.ContentLength) || buffer.length,
        etag: (response.ETag || '').replace(/"/g, ''),
      };
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404 || err.name === 'NoSuchKey') {
        return null;
      }
      console.warn(`[EmailR2Service] getObjectBuffer error for "${key}":`, err.message);
      return null;
    }
  }

  /**
   * Retrieves a text object from Cloudflare R2 as a string
   */
  async getObjectText(key) {
    const result = await this.getObjectBuffer(key);
    if (!result || !result.buffer) return null;
    return result.buffer.toString('utf8');
  }

  /**
   * Verifies that an object exists in Cloudflare R2 and returns its metadata
   */
  async verifyObjectExists(key) {
    if (!key) return { exists: false, contentLength: 0, etag: '', contentType: '' };
    const client = this.getClient();
    if (!client) {
      const buf = await this.getObjectBuffer(key);
      if (!buf) return { exists: false, contentLength: 0, etag: '', contentType: '' };
      return { exists: true, contentLength: buf.contentLength, etag: buf.etag, contentType: buf.contentType };
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await client.send(command);
      return {
        exists: true,
        contentLength: Number(response.ContentLength) || 0,
        etag: (response.ETag || '').replace(/"/g, ''),
        contentType: response.ContentType || 'application/octet-stream',
      };
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return { exists: false, contentLength: 0, etag: '', contentType: '' };
      }
      console.warn(`[EmailR2Service] verifyObjectExists error for "${key}":`, err.message);
      return { exists: false, contentLength: 0, etag: '', contentType: '' };
    }
  }

  /**
   * Deletes an object from Cloudflare R2 safely
   */
  async deleteObject(key) {
    if (!key || typeof key !== 'string') return true;
    const client = this.getClient();
    if (!client) {
      try {
        const workerDir = this._getWorkerDir();
        execSync(`npx wrangler r2 object delete "${this.bucketName}/${key}" --remote`, {
          cwd: workerDir,
          shell: 'cmd.exe',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        return true;
      } catch (err) {
        return false;
      }
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await client.send(command);
      return true;
    } catch (err) {
      console.warn(`[EmailR2Service] deleteObject warning for "${key}":`, err.message);
      return false;
    }
  }

  /**
   * Lists all objects under a given prefix in Cloudflare R2
   */
  async listObjectsByPrefix(prefix) {
    if (!prefix) return [];
    const client = this.getClient();
    if (!client) return [];

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });
      const response = await client.send(command);
      return response.Contents || [];
    } catch (err) {
      console.warn(`[EmailR2Service] listObjectsByPrefix error for "${prefix}":`, err.message);
      return [];
    }
  }

  /**
   * High-Level: Stores complete email body content into R2
   * @param {Object} params
   * @param {string} params.emailId - Unique email identifier (e.g. UUID or msg_id)
   * @param {string} params.html - HTML body
   * @param {string} params.text - Plain text body
   * @param {string} [params.raw] - Raw RFC822 email string
   * @param {'incoming'|'sent'} [params.type='incoming']
   * @returns {Promise<{ htmlKey: string|null, textKey: string|null, rawKey: string|null, totalBytes: number }>}
   */
  async uploadEmailBody({ emailId, html, text, raw = null, type = 'incoming' }) {
    const cleanId = this.sanitizeId(emailId);
    const prefix = `${type}/${cleanId}`;
    let totalBytes = 0;
    let htmlKey = null;
    let textKey = null;
    let rawKey = null;

    if (html && typeof html === 'string') {
      htmlKey = `${prefix}/body.html`;
      const res = await this.putObject({
        key: htmlKey,
        body: html,
        contentType: 'text/html; charset=utf-8',
      });
      totalBytes += res.byteSize;
    }

    if (text && typeof text === 'string') {
      textKey = `${prefix}/body.txt`;
      const res = await this.putObject({
        key: textKey,
        body: text,
        contentType: 'text/plain; charset=utf-8',
      });
      totalBytes += res.byteSize;
    }

    if (raw && typeof raw === 'string') {
      rawKey = `${prefix}/raw.eml`;
      const res = await this.putObject({
        key: rawKey,
        body: raw,
        contentType: 'message/rfc822; charset=utf-8',
      });
      totalBytes += res.byteSize;
    }

    return {
      htmlKey,
      textKey,
      rawKey,
      totalBytes,
    };
  }

  /**
   * High-Level: Uploads an email attachment to R2
   * @param {Object} params
   * @param {string} params.emailId
   * @param {string} params.filename
   * @param {Buffer|string} params.content - Buffer or base64 string
   * @param {string} [params.contentType]
   * @param {'incoming'|'sent'} [params.type='incoming']
   * @returns {Promise<{ r2_key: string, filename: string, size: number, contentType: string }>}
   */
  async uploadAttachment({ emailId, filename, content, contentType = 'application/octet-stream', type = 'incoming' }) {
    const cleanId = this.sanitizeId(emailId);
    const safeFilename = this.sanitizeFilename(filename);
    const r2Key = `${type}/${cleanId}/attachments/${safeFilename}`;

    let buffer;
    if (Buffer.isBuffer(content)) {
      buffer = content;
    } else if (typeof content === 'string') {
      const cleanBase64 = content.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
      buffer = Buffer.from(cleanBase64, 'base64');
    } else {
      throw new Error('[EmailR2Service] Invalid attachment content type.');
    }

    const res = await this.putObject({
      key: r2Key,
      body: buffer,
      contentType,
      contentDisposition: `attachment; filename="${encodeURIComponent(safeFilename)}"`,
    });

    return {
      r2_key: r2Key,
      filename: safeFilename,
      size: res.byteSize,
      contentType,
    };
  }

  /**
   * High-Level: Retrieves email body with dual-fallback support
   * @param {Object} params
   * @param {string} [params.htmlKey]
   * @param {string} [params.textKey]
   * @param {string} [params.fallbackHtml]
   * @param {string} [params.fallbackText]
   */
  async getEmailBodyWithFallback({ htmlKey, textKey, fallbackHtml = '', fallbackText = '' }) {
    let bodyHtml = fallbackHtml;
    let bodyText = fallbackText;

    if (htmlKey) {
      try {
        const r2Html = await this.getObjectText(htmlKey);
        if (r2Html) bodyHtml = r2Html;
      } catch (e) {
        console.warn(`[EmailR2Service] Dual-read fallback to Supabase HTML for key "${htmlKey}":`, e.message);
      }
    }

    if (textKey) {
      try {
        const r2Text = await this.getObjectText(textKey);
        if (r2Text) bodyText = r2Text;
      } catch (e) {
        console.warn(`[EmailR2Service] Dual-read fallback to Supabase text for key "${textKey}":`, e.message);
      }
    }

    return { body_html: bodyHtml, body_text: bodyText };
  }

  /**
   * Deletes all R2 objects for a given email and verifies complete cleanup
   * @param {Object} params
   * @param {string} params.emailId
   * @param {'incoming'|'sent'|'scheduled'} [params.type='incoming']
   * @param {string[]} [params.extraPrefixes]
   * @param {string[]} [params.extraKeys]
   * @returns {Promise<boolean>}
   */
  async deleteEmailObjects({ emailId, type = 'incoming', extraPrefixes = [], extraKeys = [] }) {
    const cleanId = this.sanitizeId(emailId);
    const prefixes = [`${type}/${cleanId}/`, ...extraPrefixes];
    const keysToDelete = new Set([...extraKeys]);

    for (const prefix of prefixes) {
      const objects = await this.listObjectsByPrefix(prefix);
      for (const obj of objects) {
        if (obj.Key) {
          keysToDelete.add(obj.Key);
        }
      }
    }

    let allSuccess = true;
    for (const key of keysToDelete) {
      try {
        await this.deleteObject(key);
      } catch (err) {
        console.error(`[EmailR2Service] Failed to delete R2 object "${key}":`, err.message);
        allSuccess = false;
      }
    }

    // Verify complete cleanup
    for (const prefix of prefixes) {
      const remaining = await this.listObjectsByPrefix(prefix);
      if (remaining.length > 0) {
        console.error(`[EmailR2Service] Orphaned objects remaining under prefix "${prefix}":`, remaining.map(r => r.Key));
        return false;
      }
    }

    return allSuccess;
  }
}

export const emailR2Service = new EmailR2Service();
export default emailR2Service;

