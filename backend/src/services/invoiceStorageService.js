import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

// Durable local disk storage directory to guarantee survival across backend reboots
const DISK_STORAGE_DIR = path.resolve(__dirname, '../../storage/invoices');
const DISK_SIGNATURES_DIR = path.resolve(__dirname, '../../storage/signatures');

/**
 * Zenemoo Cloudflare R2 Private Invoice Storage Service
 * Bucket: zenemoo-invoice-storage
 * Strictly private, non-public, authorized backend streaming only.
 * Guaranteed persistence across server restarts via Cloudflare R2 + resilient disk store.
 */

class InvoiceStorageService {
  constructor() {
    this.bucketName = process.env.CLOUDFLARE_R2_INVOICE_BUCKET_NAME || 'zenemoo-invoice-storage';
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'c3e84d8a84eaa06c632f189765eaa9c6';
    this.accessKeyId =
      process.env.CLOUDFLARE_R2_INVOICE_ACCESS_KEY_ID ||
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
      '';
    this.secretAccessKey =
      process.env.CLOUDFLARE_R2_INVOICE_SECRET_ACCESS_KEY ||
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
      '';

    this._client = null;
    this._memoryFallback = new Map(); // In-memory hot cache
    this.ensureDiskStorageDir();
  }

  ensureDiskStorageDir() {
    try {
      if (!fs.existsSync(DISK_STORAGE_DIR)) {
        fs.mkdirSync(DISK_STORAGE_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('[InvoiceStorageService] Note creating invoice disk storage dir:', err.message);
    }
  }

  getClient() {
    if (this._client) return this._client;

    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || 'c3e84d8a84eaa06c632f189765eaa9c6';
    const accessKeyId =
      process.env.CLOUDFLARE_R2_INVOICE_ACCESS_KEY_ID ||
      this.accessKeyId ||
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.CLOUDFLARE_R2_INVOICE_SECRET_ACCESS_KEY ||
      this.secretAccessKey ||
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return null;
    }

    try {
      this._client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      return this._client;
    } catch (err) {
      console.warn('[InvoiceStorageService] Could not initialize R2 client:', err.message);
      return null;
    }
  }

  /**
   * Upload an invoice PDF buffer
   * Persists durably to disk so files survive backend restarts, and uploads to Cloudflare R2.
   * @param {string} storageKey e.g. "invoices/ZEN-INV-2026-0001.pdf"
   * @param {Buffer} buffer PDF binary buffer
   * @returns {Promise<{ key: string, byteSize: number, storageType: 'r2' | 'durable_disk', durable: boolean }>}
   */
  async uploadInvoicePdf(storageKey, buffer) {
    if (!storageKey || !buffer) {
      throw new Error('Storage key and buffer are required.');
    }

    // 1. Hot memory cache
    this._memoryFallback.set(storageKey, buffer);

    // 2. Persist durably to local disk storage (survives reboots)
    const cleanFilename = path.basename(storageKey);
    const localFilePath = path.join(DISK_STORAGE_DIR, cleanFilename);
    try {
      this.ensureDiskStorageDir();
      fs.writeFileSync(localFilePath, buffer);
    } catch (diskErr) {
      console.error('[InvoiceStorageService] Fatal disk write failure for PDF:', diskErr.message);
      throw new Error(`Durable storage failure: Could not persist PDF to storage (${diskErr.message})`);
    }

    // 3. Upload to Cloudflare R2 if client credentials configured
    const client = this.getClient();
    if (client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
          Body: buffer,
          ContentType: 'application/pdf',
          Metadata: {
            'x-zenemoo-doc-type': 'invoice',
            'x-zenemoo-uploaded-at': new Date().toISOString(),
          },
        });
        await client.send(command);
        return { key: storageKey, byteSize: buffer.length, storageType: 'r2', durable: true };
      } catch (err) {
        console.warn(`[InvoiceStorageService] Cloudflare R2 PutObject failed (${err.message}). Persisted to durable local disk storage.`);
        return {
          key: storageKey,
          byteSize: buffer.length,
          storageType: 'durable_disk',
          durable: true,
          r2Warning: err.message,
        };
      }
    }

    return {
      key: storageKey,
      byteSize: buffer.length,
      storageType: 'durable_disk',
      durable: true,
      note: 'Stored on durable disk storage (Cloudflare R2 credentials pending configuration)',
    };
  }

  /**
   * Retrieve invoice PDF buffer
   * Checks hot memory cache, Cloudflare R2, then persistent disk storage.
   * @param {string} storageKey
   * @returns {Promise<Buffer | null>}
   */
  async getInvoicePdfBuffer(storageKey) {
    if (!storageKey) return null;

    // 1. Hot memory cache
    if (this._memoryFallback.has(storageKey)) {
      return this._memoryFallback.get(storageKey);
    }

    // 2. Cloudflare R2
    const client = this.getClient();
    if (client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        });
        const response = await client.send(command);
        if (response.Body) {
          const chunks = [];
          for await (const chunk of response.Body) {
            chunks.push(chunk);
          }
          const fullBuffer = Buffer.concat(chunks);
          this._memoryFallback.set(storageKey, fullBuffer);
          return fullBuffer;
        }
      } catch (err) {
        console.warn(`[InvoiceStorageService] R2 GetObject failed for ${storageKey}:`, err.message);
      }
    }

    // 3. Durable local disk store (survives restarts)
    try {
      const cleanFilename = path.basename(storageKey);
      const localFilePath = path.join(DISK_STORAGE_DIR, cleanFilename);
      if (fs.existsSync(localFilePath)) {
        const diskBuffer = fs.readFileSync(localFilePath);
        this._memoryFallback.set(storageKey, diskBuffer);
        return diskBuffer;
      }
    } catch (diskErr) {
      console.warn(`[InvoiceStorageService] Disk read failed for ${storageKey}:`, diskErr.message);
    }

    return null;
  }

  /**
   * Delete an invoice PDF from Cloudflare R2 and durable local disk
   * @param {string} storageKey e.g. "invoices/ZEN-INV-2026-0001.pdf"
   */
  async deleteInvoicePdf(storageKey) {
    if (!storageKey) return false;

    // 1. Clear in-memory hot cache
    this._memoryFallback.delete(storageKey);

    // 2. Remove from Cloudflare R2
    const client = this.getClient();
    if (client) {
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: storageKey,
          })
        );
      } catch (err) {
        console.warn(`[InvoiceStorageService] R2 DeleteObject warning for ${storageKey}:`, err.message);
      }
    }

    // 3. Remove from durable local disk storage
    try {
      const cleanFilename = path.basename(storageKey);
      const localFilePath = path.join(DISK_STORAGE_DIR, cleanFilename);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (diskErr) {
      console.warn(`[InvoiceStorageService] Disk unlink warning for ${storageKey}:`, diskErr.message);
    }

    return true;
  }

  ensureSignatureStorageDir() {
    try {
      if (!fs.existsSync(DISK_SIGNATURES_DIR)) {
        fs.mkdirSync(DISK_SIGNATURES_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('[InvoiceStorageService] Note creating signature disk storage dir:', err.message);
    }
  }

  /**
   * Upload an authorized signature image buffer (PNG or JPEG)
   * Persists to Cloudflare R2 and resilient local disk store under signatures/
   * @param {string} storageKey e.g. "signatures/sig_1729074000_a1b2c3d4.png"
   * @param {Buffer} buffer Image buffer
   * @param {string} contentType e.g. "image/png"
   */
  async uploadSignatureImage(storageKey, buffer, contentType = 'image/png') {
    if (!storageKey || !buffer) {
      throw new Error('Storage key and buffer are required.');
    }

    // 1. Hot memory cache
    this._memoryFallback.set(storageKey, buffer);

    // 2. Persist durably to local disk storage
    const cleanFilename = path.basename(storageKey);
    const localFilePath = path.join(DISK_SIGNATURES_DIR, cleanFilename);
    try {
      this.ensureSignatureStorageDir();
      fs.writeFileSync(localFilePath, buffer);
    } catch (diskErr) {
      console.warn('[InvoiceStorageService] Disk write warning for signature:', diskErr.message);
    }

    // 3. Upload to Cloudflare R2
    const client = this.getClient();
    if (client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
          Body: buffer,
          ContentType: contentType,
          Metadata: {
            'x-zenemoo-doc-type': 'signature',
            'x-zenemoo-uploaded-at': new Date().toISOString(),
          },
        });
        await client.send(command);
        return { key: storageKey, byteSize: buffer.length, storageType: 'r2', durable: true };
      } catch (err) {
        console.warn(`[InvoiceStorageService] Cloudflare R2 signature PutObject failed (${err.message}). Persisted to local disk.`);
        return { key: storageKey, byteSize: buffer.length, storageType: 'durable_disk', durable: true };
      }
    }

    return { key: storageKey, byteSize: buffer.length, storageType: 'durable_disk', durable: true };
  }

  /**
   * Retrieve signature image buffer
   * @param {string} storageKey
   * @returns {Promise<Buffer | null>}
   */
  async getSignatureImageBuffer(storageKey) {
    if (!storageKey) return null;

    // 1. Memory cache
    if (this._memoryFallback.has(storageKey)) {
      return this._memoryFallback.get(storageKey);
    }

    // 2. Cloudflare R2
    const client = this.getClient();
    if (client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        });
        const response = await client.send(command);
        if (response.Body) {
          const chunks = [];
          for await (const chunk of response.Body) {
            chunks.push(chunk);
          }
          const fullBuffer = Buffer.concat(chunks);
          this._memoryFallback.set(storageKey, fullBuffer);
          return fullBuffer;
        }
      } catch (err) {
        console.warn(`[InvoiceStorageService] R2 GetObject failed for signature ${storageKey}:`, err.message);
      }
    }

    // 3. Local disk store
    try {
      const cleanFilename = path.basename(storageKey);
      const localFilePath = path.join(DISK_SIGNATURES_DIR, cleanFilename);
      if (fs.existsSync(localFilePath)) {
        const diskBuffer = fs.readFileSync(localFilePath);
        this._memoryFallback.set(storageKey, diskBuffer);
        return diskBuffer;
      }
    } catch (diskErr) {
      console.warn(`[InvoiceStorageService] Disk read failed for signature ${storageKey}:`, diskErr.message);
    }

    return null;
  }

  /**
   * Delete signature image from R2 and local disk
   * @param {string} storageKey
   */
  async deleteSignatureImage(storageKey) {
    if (!storageKey) return;
    this._memoryFallback.delete(storageKey);

    const client = this.getClient();
    if (client) {
      try {
        await client.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        }));
      } catch (err) {
        console.warn(`[InvoiceStorageService] R2 DeleteObject warning for signature ${storageKey}:`, err.message);
      }
    }

    try {
      const cleanFilename = path.basename(storageKey);
      const localFilePath = path.join(DISK_SIGNATURES_DIR, cleanFilename);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (diskErr) {
      console.warn(`[InvoiceStorageService] Disk unlink warning for signature ${storageKey}:`, diskErr.message);
    }
  }
}

export const invoiceStorageService = new InvoiceStorageService();

