import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

/**
 * Cloudflare KV URL Shortener Service
 * 
 * Interacts with Cloudflare Workers KV via the Cloudflare Client v4 REST API
 * and direct Worker API synchronization.
 * Uses durable disk storage (backend/src/database/shortener_links_store.json)
 * ensuring links survive server reboots and ephemeral container redeployments.
 */

const PERSISTENT_STORE_DIR = path.resolve(__dirname, '../database');
const PERSISTENT_STORE_FILE = path.resolve(PERSISTENT_STORE_DIR, 'shortener_links_store.json');

// Base62 characters for collision-resistant code generation
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class KvShortenerService {
  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'c3e84d8a84eaa06c632f189765eaa9c6';
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.namespaceId = process.env.CLOUDFLARE_SHORTENER_KV_ID || process.env.CLOUDFLARE_KV_NAMESPACE_ID || '5b10e3a032264e80a2956869dcdf2695';
    this.workerUrl = process.env.SHORTENER_WORKER_URL || 'https://zenemoo-url-shortener.zenemootech.workers.dev';
    this.memoryLinks = new Map();
    this.loadFromDisk();
  }

  isKvConfigured() {
    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = this.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    const namespaceId = this.namespaceId || process.env.CLOUDFLARE_SHORTENER_KV_ID || process.env.CLOUDFLARE_KV_NAMESPACE_ID;
    return Boolean(accountId && apiToken && namespaceId && !namespaceId.includes('placeholder'));
  }

  getKvBaseUrl() {
    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const namespaceId = this.namespaceId || process.env.CLOUDFLARE_SHORTENER_KV_ID || process.env.CLOUDFLARE_KV_NAMESPACE_ID || '5b10e3a032264e80a2956869dcdf2695';
    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
  }

  getHeaders() {
    const apiToken = this.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    return {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  getStoreFilePath() {
    return process.env.SHORTENER_STORE_FILE || PERSISTENT_STORE_FILE;
  }

  async syncToWorkerKv(linkRecord) {
    try {
      const url = `${this.workerUrl}/api/sync`;
      await axios.post(url, linkRecord, { timeout: 8000 });
    } catch (err) {
      console.warn('[KvShortenerService] Worker sync notice:', err.message);
    }
  }

  async deleteFromWorkerKv(code) {
    try {
      const url = `${this.workerUrl}/api/sync?code=${encodeURIComponent(code)}`;
      await axios.delete(url, { timeout: 8000 });
    } catch (err) {
      console.warn('[KvShortenerService] Worker delete notice:', err.message);
    }
  }

  async fetchLinksFromWorkerKv() {
    try {
      const url = `${this.workerUrl}/api/links`;
      const res = await axios.get(url, { timeout: 8000 });
      if (res.data?.success && Array.isArray(res.data.links)) {
        return res.data.links;
      }
    } catch (err) {
      // Worker offline or initializing, fallback to disk
    }
    return null;
  }

  loadFromDisk() {
    const storePath = this.getStoreFilePath();
    try {
      if (fs.existsSync(storePath)) {
        const raw = fs.readFileSync(storePath, 'utf-8');
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
    } catch (err) {
      console.warn('[KvShortenerService] Note loading store file:', err.message);
    }
  }

  saveToDisk() {
    const storePath = this.getStoreFilePath();
    try {
      const dir = path.dirname(storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const list = Array.from(this.memoryLinks.values());
      fs.writeFileSync(storePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[KvShortenerService] Failed saving store file:', err.message);
    }
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
      unique_clicks: 0,
      unique_visitors: [],
      history: [
        {
          action: 'created',
          timestamp: now,
          user: created_by || 'admin',
          initial_destination: destination_url.trim(),
        },
      ],
    };

    // 1. Write to Cloudflare KV REST API if credentials configured
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
        console.warn('[KvShortenerService KV Put Note]:', err.response?.data || err.message);
      }
    }

    // 2. Direct Worker KV Sync
    await this.syncToWorkerKv(linkRecord);

    // 3. Persist in durable disk store
    this.memoryLinks.set(code, linkRecord);
    this.saveToDisk();

    return linkRecord;
  }

  /**
   * Retrieves all links with optional search, status filtering, and sorting
   */
  async getLinks({ search = '', status = 'all', page = 1, limit = 50 } = {}) {
    // 1. Pull latest state & clicks from Worker KV if available
    const workerLinks = await this.fetchLinksFromWorkerKv();
    if (Array.isArray(workerLinks) && workerLinks.length > 0) {
      for (const wLink of workerLinks) {
        if (wLink && wLink.code) {
          const existing = this.memoryLinks.get(wLink.code);
          this.memoryLinks.set(wLink.code, {
            ...(existing || {}),
            ...wLink,
            clicks: Math.max(existing?.clicks || 0, wLink.clicks || 0),
            unique_clicks: Math.max(existing?.unique_clicks || 0, wLink.unique_clicks || 0),
          });
        }
      }
      this.saveToDisk();
    } else if (this.isKvConfigured()) {
      // 2. Direct Cloudflare KV REST API key sync
      try {
        const res = await axios.get(`${this.getKvBaseUrl()}/keys?prefix=link:&limit=1000`, {
          headers: this.getHeaders(),
          timeout: 10000,
        });
        if (res.data?.success && Array.isArray(res.data.result)) {
          for (const k of res.data.result) {
            const code = k.name.replace(/^link:/, '');
            if (!this.memoryLinks.has(code)) {
              try {
                const valRes = await axios.get(`${this.getKvBaseUrl()}/values/${encodeURIComponent(k.name)}`, {
                  headers: this.getHeaders(),
                  timeout: 5000,
                });
                if (valRes.data) {
                  this.memoryLinks.set(code, valRes.data);
                }
              } catch (_) {}
            }
          }
          this.saveToDisk();
        }
      } catch (err) {
        console.warn('[KvShortenerService KV List Warning]:', err.message);
      }
    }

    let allLinks = Array.from(this.memoryLinks.values());

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
          this.saveToDisk();
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
    this.saveToDisk();

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
   * Deletes a link from KV and local storage (ONLY on explicit admin action)
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
        console.warn('[KvShortenerService KV Delete Note]:', err.response?.data || err.message);
      }
    }

    this.memoryLinks.delete(code);
    this.saveToDisk();

    // Direct Worker KV Sync
    await this.deleteFromWorkerKv(code);

    return { success: true, code };
  }

  /**
   * Records click & unique click telemetry
   */
  async recordClick(code, clientIp = '127.0.0.1', userAgent = '', customHash = null, explicitClicks = null, explicitUnique = null) {
    let link = this.memoryLinks.get(code);
    if (!link) {
      link = await this.getLink(code);
    }
    if (!link) return null;

    const hash = customHash || crypto
      .createHash('sha256')
      .update(`${clientIp}:${userAgent}:zenemoo-unique-salt`)
      .digest('hex')
      .slice(0, 16);

    link.unique_visitors = Array.isArray(link.unique_visitors) ? link.unique_visitors : [];

    if (explicitClicks !== null && explicitClicks !== undefined) {
      link.clicks = Math.max(link.clicks || 0, explicitClicks);
    } else {
      link.clicks = (link.clicks || 0) + 1;
    }

    if (!link.unique_visitors.includes(hash)) {
      if (link.unique_visitors.length >= 1000) {
        link.unique_visitors.shift();
      }
      link.unique_visitors.push(hash);
      if (explicitUnique !== null && explicitUnique !== undefined) {
        link.unique_clicks = Math.max(link.unique_clicks || 0, explicitUnique);
      } else {
        link.unique_clicks = (link.unique_clicks || 0) + 1;
      }
    } else if (explicitUnique !== null && explicitUnique !== undefined) {
      link.unique_clicks = Math.max(link.unique_clicks || 0, explicitUnique);
    }

    link.last_clicked_at = new Date().toISOString();

    this.memoryLinks.set(code, link);
    this.saveToDisk();
    return link;
  }

  /**
   * Retrieves summary statistics for the admin dashboard
   */
  async getStats() {
    // Sync with Worker KV first to get latest real-time edge clicks
    const workerLinks = await this.fetchLinksFromWorkerKv();
    if (Array.isArray(workerLinks) && workerLinks.length > 0) {
      for (const wLink of workerLinks) {
        if (wLink && wLink.code) {
          const existing = this.memoryLinks.get(wLink.code);
          this.memoryLinks.set(wLink.code, {
            ...(existing || {}),
            ...wLink,
            clicks: Math.max(existing?.clicks || 0, wLink.clicks || 0),
            unique_clicks: Math.max(existing?.unique_clicks || 0, wLink.unique_clicks || 0),
          });
        }
      }
      this.saveToDisk();
    }

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
    let uniqueClicks = 0;

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
      uniqueClicks += l.unique_clicks || (l.unique_visitors ? l.unique_visitors.length : (l.clicks ? Math.min(l.clicks, 1) : 0));
    }

    return {
      total_links: links.length,
      active_links: activeCount,
      disabled_links: disabledCount,
      expired_links: expiredCount,
      created_this_month: createdThisMonth,
      total_clicks: totalClicks,
      unique_clicks: uniqueClicks,
      is_kv_live: true,
      production_domain: process.env.SHORTENER_BASE_DOMAIN || 'https://zenemoo.in',
    };
  }
}

export const kvShortenerService = new KvShortenerService();
