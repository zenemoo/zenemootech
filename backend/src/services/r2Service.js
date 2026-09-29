import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cloudflare R2 S3-Compatible Storage Service
 * Designed strictly for Zenemoo Company Portfolio storage with zero egress fees.
 */

class R2Service {
  constructor() {
    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'zenemoo-portfolio-storage';
    this.publicBaseUrl = (process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';

    this._client = null;
  }

  /**
   * Lazily initializes and returns the S3Client configured for Cloudflare R2
   */
  getClient() {
    if (this._client) return this._client;

    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = this.accessKeyId || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = this.secretAccessKey || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn('[R2Service] Missing Cloudflare R2 environment variables (ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_KEY).');
    }

    this._client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });

    return this._client;
  }

  /**
   * Generates public CDN URL for a given R2 object key
   * @param {string} r2Key - e.g. company/portfolio/zenemoo-company-portfolio-1790750400000.pdf
   * @returns {string}
   */
  getPublicUrl(r2Key) {
    const cleanKey = (r2Key || '').replace(/^\/+/, '');
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${cleanKey}`;
    }
    // Fallback: Use account-level R2 public domain or Cloudflare custom domain
    return `https://${this.bucketName}.r2.cloudflarestorage.com/${cleanKey}`;
  }

  /**
   * Uploads a Buffer (or Stream) to Cloudflare R2
   * @param {Object} params
   * @param {Buffer} params.buffer - File buffer
   * @param {string} params.key - R2 object key
   * @param {string} params.contentType - MIME type (defaults to application/pdf)
   * @returns {Promise<{ key: string, publicUrl: string, byteSize: number, etag: string }>}
   */
  async uploadObject({ buffer, key, contentType = 'application/pdf' }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('[R2Service] uploadObject requires a valid binary Buffer.');
    }
    if (!key || typeof key !== 'string') {
      throw new Error('[R2Service] uploadObject requires a valid object key.');
    }

    const client = this.getClient();
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    const response = await client.send(command);

    return {
      key,
      publicUrl: this.getPublicUrl(key),
      byteSize: buffer.length,
      etag: (response.ETag || '').replace(/"/g, ''),
    };
  }

  /**
   * Verifies that an object exists in Cloudflare R2 and returns its metadata
   * @param {string} key - R2 object key
   * @returns {Promise<{ exists: boolean, contentLength: number, etag: string, contentType: string }>}
   */
  async verifyObjectExists(key) {
    if (!key) return { exists: false, contentLength: 0, etag: '', contentType: '' };

    try {
      const client = this.getClient();
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await client.send(command);

      return {
        exists: true,
        contentLength: Number(response.ContentLength) || 0,
        etag: (response.ETag || '').replace(/"/g, ''),
        contentType: response.ContentType || 'application/pdf',
      };
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return { exists: false, contentLength: 0, etag: '', contentType: '' };
      }
      console.warn(`[R2Service] verifyObjectExists error for key "${key}":`, err.message);
      return { exists: false, contentLength: 0, etag: '', contentType: '' };
    }
  }

  /**
   * Deletes an object from Cloudflare R2 safely
   * @param {string} key - R2 object key
   * @returns {Promise<boolean>}
   */
  async deleteObject(key) {
    if (!key || typeof key !== 'string') return true;

    try {
      const client = this.getClient();
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await client.send(command);
      return true;
    } catch (err) {
      console.warn(`[R2Service] deleteObject warning for key "${key}":`, err.message);
      return false;
    }
  }
}

export const r2Service = new R2Service();
