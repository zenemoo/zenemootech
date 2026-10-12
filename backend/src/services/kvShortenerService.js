import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cloudflare KV URL Shortener Service
 * 
 * Interacts with Cloudflare Workers KV via the Cloudflare Client v4 REST API.
 * Provides resilient fallback to local persistent cache when Cloudflare KV credentials
 * are unconfigured in development.
 */

const FALLBACK_DATA_DIR = path.resolve(process.cwd(), 'scratch');
const FALLBACK_DATA_FILE = path.resolve(FALLBACK_DATA_DIR, 'shortener_links.json');

// Base62 characters for collision-resistant code generation
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class KvShortenerService {
  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.namespaceId = process.env.CLOUDFLARE_SHORTENER_KV_ID || process.env.CLOUDFLARE_KV_NAMESPACE_ID || '';
    this.memoryLinks = new Map();
    this.loadFallbackFromDisk();
  }

  isKvConfigured() {
    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = this.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    const namespaceId = this.namespaceId || process.env.CLOUDFLARE_SHORTENER_KV_ID || process.env.CLOUDFLARE_KV_NAMESPACE_ID;
    return Boolean(accountId && apiToken && namespaceId && !namespaceId.includes('placeholder'));
  }

  getKvBaseUrl() {
    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const namespaceId = this.namespaceId || process.env.CLOUDFLARE_SHORTENER_KV_ID || process.env.CLOUDFLARE_KV_NAMESPACE_ID;
    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
  }

  getHeaders() {
    const apiToken = this.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    return {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  async syncToWorkerKv(linkRecord) {
    try {
      const workerUrl = process.env.SHORTENER_WORKER_URL || 'https://zenemoo-url-shortener.zenemootech.workers.dev/api/sync';
      await axios.post(workerUrl, linkRecord, { timeout: 8000 });
    } catch (_) {}
  }

  async deleteFromWorkerKv(code) {
    try {
      const workerUrl = process.env.SHORTENER_WORKER_URL || 'https://zenemoo-url-shortener.zenemootech.workers.dev/api/sync';
      await axios.delete(`${workerUrl}?code=${encodeURIComponent(code)}`, { timeout: 8000 });
    } catch (_) {}
  }

  loadFallbackFromDisk() {
    try {
      if (fs.existsSync(FALLBACK_DATA_FILE)) {
        const raw = fs.readFileSync(FALLBACK_DATA_FILE, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.memoryLinks.clear();
          for (const item of list) {
            if (item && item.code) {
              this.memoryLinks.set(item.code, item);
            }
          }
        }
      }
    } catch (_) {}
  }

  saveFallbackToDisk() {
    try {
      if (!fs.existsSync(FALLBACK_DATA_DIR)) {
        fs.mkdirSync(FALLBACK_DATA_DIR, { recursive: true });
      }
      const list = Array.from(this.memoryLinks.values());
      fs.writeFileSync(FALLBACK_DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (_) {}
  }

  /**
   * Generates a cryptographically secure random 6-character code (approx. 56.8 billion combinations)
   */
  generateRandomCode(length = 6) {
    const bytes = crypto.randomBytes(length);
    let code = '';
    for (let i = 0; i < length; i++) {
      code += BASE62_CHARS[bytes[i] % BASE62_CHARS.length];
    }
    return code;
  }

  /**
   * Validates code format: 3 to 32 alphanumeric, hyphen, underscore
   */
  isValidCode(code) {
    if (!code || typeof code !== 'string') return false;
    return /^[a-zA-Z0-9_-]{3,32}$/.test(code);
  }

  /**
   * Validates destination URL format: http or https only
   */
  isValidDestinationUrl(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return false;
    try {
      const parsed = new URL(urlStr);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  /**
   * Checks if code exists in Cloudflare KV or fallback
   */
  async codeExists(code) {
    if (this.memoryLinks.has(code)) {
      return true;
    }
    if (this.isKvConfigured()) {
      try {
        const res = await axios.get(`${this.getKvBaseUrl()}/values/link:${encodeURIComponent(code)}`, {
          headers: this.getHeaders(),
          timeout: 8000,
          validateStatus: (status) => status === 200 || status === 404,
        });
        return res.status === 200;
      } catch (_) {
        return false;
      }
    }
    return false;
  }

  /**
   * Creates a new short link
   */
  async createLink({ destination_url, custom_code, title, notes, expires_at, created_by }) {
    if (!this.isValidDestinationUrl(destination_url)) {
      throw new Error('Invalid destination URL. Only HTTP and HTTPS destinations are permitted.');
    }

    let code = '';
    if (custom_code && custom_code.trim()) {
      const cleanCode = custom_code.trim();
      if (!this.isValidCode(cleanCode)) {
        throw new Error('Custom short code must be 3-32 alphanumeric characters, hyphens, or underscores.');
      }
      const reservedCodes = ['api', 'admin', 'portal', 'health', 'login', 'auth', 'null', 'undefined'];
      if (reservedCodes.includes(cleanCode.toLowerCase())) {
        throw new Error(`The code '${cleanCode}' is reserved and cannot be used.`);
      }
      if (await this.codeExists(cleanCode)) {
        throw new Error(`The short code '${cleanCode}' is already in use. Please choose a different code.`);
      }
      code = cleanCode;
    } else {
      // Generate with collision resistance retry loop
      let attempts = 0;
      let generated = '';
      while (attempts < 10) {
        generated = this.generateRandomCode(6);
        if (!(await this.codeExists(generated))) {
          code = generated;
          break;
        }
        attempts++;
      }
      if (!code) {
        throw new Error('Failed to generate a unique short code after multiple attempts. Please try again.');
      }
    }

    const now = new Date().toISOString();
    const linkRecord = {
      code,
      destination_url: destination_url.trim(),
      title: (title || '').trim() || destination_url.trim(),
      notes: (notes || '').trim(),
      status: 'active',
      is_active: true,
      created_at: now,
      updated_at: now,
      created_by: created_by || 'admin',
      expires_at: expires_at ? new Date(expires_at).toISOString() : null,
      clicks: 0,
      history: [
        {
          action: 'created',
          timestamp: now,
          user: created_by || 'admin',
          initial_destination: destination_url.trim(),
        },
      ],
    };

    // 1. Write to Cloudflare KV if configured
    if (this.isKvConfigured()) {
      try {
        await axios.put(
          `${this.getKvBaseUrl()}/values/link:${encodeURIComponent(code)}`,
          JSON.stringify(linkRecord),
          {
            headers: this.getHeaders(),
            timeout: 10000,
          }
        );
      } catch (err) {
        console.error('[KvShortenerService KV Put Error]:', err.response?.data || err.message);
        // We still persist in fallback to prevent data loss
      }
    }

    // 2. Direct Worker KV Sync
    await this.syncToWorkerKv(linkRecord);

    // 3. Persist in resilient local store
    this.memoryLinks.set(code, linkRecord);
    this.saveFallbackToDisk();

    return linkRecord;
  }

  /**
   * Retrieves all links with optional search, status filtering, and sorting
   */
  async getLinks({ search = '', status = 'all', page = 1, limit = 50 } = {}) {
    let allLinks = [];

    // If Cloudflare KV is configured, fetch keys list
    if (this.isKvConfigured()) {
      try {
        const res = await axios.get(`${this.getKvBaseUrl()}/keys?prefix=link:&limit=1000`, {
          headers: this.getHeaders(),
          timeout: 10000,
        });
        if (res.data?.success && Array.isArray(res.data.result)) {
          // Sync any missing items or use memory store
          // To preserve free tier quota (1,000 list ops/day), we merge with memory cache
        }
      } catch (err) {
        console.warn('[KvShortenerService KV List Warning]:', err.message);
      }
    }

    allLinks = Array.from(this.memoryLinks.values());

    // Filter by search query
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      allLinks = allLinks.filter(
        (l) =>
          l.code.toLowerCase().includes(q) ||
          (l.title && l.title.toLowerCase().includes(q)) ||
          l.destination_url.toLowerCase().includes(q) ||
          (l.created_by && l.created_by.toLowerCase().includes(q)) ||
          (l.notes && l.notes.toLowerCase().includes(q))
      );
    }

    // Filter by status
    const nowMs = Date.now();
    if (status === 'active') {
      allLinks = allLinks.filter((l) => {
        const isNotExpired = !l.expires_at || new Date(l.expires_at).getTime() > nowMs;
        return (l.status === 'active' || l.is_active === true) && isNotExpired;
      });
    } else if (status === 'disabled') {
      allLinks = allLinks.filter((l) => l.status === 'disabled' || l.is_active === false);
    } else if (status === 'expired') {
      allLinks = allLinks.filter((l) => l.expires_at && new Date(l.expires_at).getTime() <= nowMs);
    }

    // Sort by created_at descending
    allLinks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = allLinks.length;
    const startIndex = (page - 1) * limit;
    const paginated = allLinks.slice(startIndex, startIndex + limit);

    return {
      links: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      is_kv_live: this.isKvConfigured(),
    };
  }

  /**
   * Retrieves single link by code
   */
  async getLink(code) {
    if (!code) return null;
    if (this.memoryLinks.has(code)) {
      return this.memoryLinks.get(code);
    }
    if (this.isKvConfigured()) {
      try {
        const res = await axios.get(`${this.getKvBaseUrl()}/values/link:${encodeURIComponent(code)}`, {
          headers: this.getHeaders(),
          timeout: 8000,
        });
        if (res.data) {
          const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          this.memoryLinks.set(code, parsed);
          this.saveFallbackToDisk();
          return parsed;
        }
      } catch (_) {}
    }
    return null;
  }

  /**
   * Updates existing link metadata and destination (with audit record)
   */
  async updateLink(code, { destination_url, title, notes, expires_at, status }, updated_by) {
    const existing = await this.getLink(code);
    if (!existing) {
      throw new Error(`Short link with code '${code}' not found.`);
    }

    const now = new Date().toISOString();
    const history = Array.isArray(existing.history) ? [...existing.history] : [];

    // Audit destination change
    if (destination_url && destination_url.trim() !== existing.destination_url) {
      if (!this.isValidDestinationUrl(destination_url)) {
        throw new Error('Invalid destination URL. Only HTTP and HTTPS destinations are permitted.');
      }
      history.push({
        action: 'destination_changed',
        timestamp: now,
        user: updated_by || 'admin',
        previous_destination: existing.destination_url,
        new_destination: destination_url.trim(),
      });
      existing.destination_url = destination_url.trim();
    }

    if (title !== undefined) existing.title = title.trim();
    if (notes !== undefined) existing.notes = notes.trim();
    if (expires_at !== undefined) {
      existing.expires_at = expires_at ? new Date(expires_at).toISOString() : null;
    }
    if (status !== undefined) {
      existing.status = status;
      existing.is_active = status === 'active';
      history.push({
        action: `status_${status}`,
        timestamp: now,
        user: updated_by || 'admin',
      });
    }

    existing.updated_at = now;
    existing.history = history;

    // Update KV
    if (this.isKvConfigured()) {
      try {
        await axios.put(
          `${this.getKvBaseUrl()}/values/link:${encodeURIComponent(code)}`,
          JSON.stringify(existing),
          {
            headers: this.getHeaders(),
            timeout: 10000,
          }
        );
      } catch (err) {
        console.error('[KvShortenerService KV Update Error]:', err.response?.data || err.message);
      }
    }

    this.memoryLinks.set(code, existing);
    this.saveFallbackToDisk();

    // Direct Worker KV Sync
    await this.syncToWorkerKv(existing);

    return existing;
  }

  /**
   * Toggles link status between active and disabled
   */
  async toggleStatus(code, updated_by) {
    const existing = await this.getLink(code);
    if (!existing) {
      throw new Error(`Short link with code '${code}' not found.`);
    }

    const newStatus = existing.status === 'active' ? 'disabled' : 'active';
    return this.updateLink(code, { status: newStatus }, updated_by);
  }

  /**
   * Deletes a link from KV and local storage
   */
  async deleteLink(code) {
    const existing = await this.getLink(code);
    if (!existing) {
      throw new Error(`Short link with code '${code}' not found.`);
    }

    if (this.isKvConfigured()) {
      try {
        await axios.delete(`${this.getKvBaseUrl()}/values/link:${encodeURIComponent(code)}`, {
          headers: this.getHeaders(),
          timeout: 10000,
        });
      } catch (err) {
        console.error('[KvShortenerService KV Delete Error]:', err.response?.data || err.message);
      }
    }

    this.memoryLinks.delete(code);
    this.saveFallbackToDisk();

    // Direct Worker KV Sync
    await this.deleteFromWorkerKv(code);

    return { success: true, code };
  }

  /**
   * Retrieves summary statistics for the admin dashboard
   */
  async getStats() {
    const links = Array.from(this.memoryLinks.values());
    const now = new Date();
    const nowMs = now.getTime();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let activeCount = 0;
    let disabledCount = 0;
    let expiredCount = 0;
    let createdThisMonth = 0;
    let totalClicks = 0;

    for (const l of links) {
      const isExpired = l.expires_at && new Date(l.expires_at).getTime() <= nowMs;
      const isDisabled = l.status === 'disabled' || l.is_active === false;

      if (isDisabled) {
        disabledCount++;
      } else if (isExpired) {
        expiredCount++;
      } else {
        activeCount++;
      }

      if (l.created_at) {
        const cDate = new Date(l.created_at);
        if (cDate.getFullYear() === currentYear && cDate.getMonth() === currentMonth) {
          createdThisMonth++;
        }
      }

      totalClicks += l.clicks || 0;
    }

    return {
      total_links: links.length,
      active_links: activeCount,
      disabled_links: disabledCount,
      expired_links: expiredCount,
      created_this_month: createdThisMonth,
      total_clicks: totalClicks,
      is_kv_live: this.isKvConfigured(),
      production_domain: process.env.SHORTENER_BASE_DOMAIN || 'https://zenemoo.in',
    };
  }
}

export const kvShortenerService = new KvShortenerService();
