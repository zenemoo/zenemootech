import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { d1Service } from './d1Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_FILE_PATH = path.join(__dirname, '../database/announcements_store.json');

// Default initial seed records
const DEFAULT_ANNOUNCEMENTS = [
  {
    id: 'ann_default_01',
    title: 'New Opportunities',
    message: 'New opportunities are available',
    link_url: '/opportunities',
    link_text: 'Explore Now →',
    icon: '✦',
    active: 1,
    priority: 10,
    sort_order: 1,
    start_at: null,
    end_at: null,
    created_at: new Date('2026-10-01T00:00:00.000Z').toISOString(),
    updated_at: new Date('2026-10-01T00:00:00.000Z').toISOString(),
    created_by: 'system@zenemoo.in',
  },
  {
    id: 'ann_default_02',
    title: 'Join Zenemoo',
    message: 'Vendors & talent are welcome',
    link_url: 'https://www.zenemoo.in/talent-registration',
    link_text: 'Register with Zenemoo →',
    icon: '●',
    active: 1,
    priority: 8,
    sort_order: 2,
    start_at: null,
    end_at: null,
    created_at: new Date('2026-10-01T00:00:00.000Z').toISOString(),
    updated_at: new Date('2026-10-01T00:00:00.000Z').toISOString(),
    created_by: 'system@zenemoo.in',
  },
  {
    id: 'ann_default_03',
    title: 'Book a Meeting',
    message: 'Want to work with Zenemoo?',
    link_url: 'https://www.zenemoo.in/30min',
    link_text: 'Book a 30-minute meeting →',
    icon: '✦',
    active: 1,
    priority: 6,
    sort_order: 3,
    start_at: null,
    end_at: null,
    created_at: new Date('2026-10-01T00:00:00.000Z').toISOString(),
    updated_at: new Date('2026-10-01T00:00:00.000Z').toISOString(),
    created_by: 'system@zenemoo.in',
  },
];

// In-Memory Public Cache
let publicCache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export class AnnouncementD1Service {
  constructor() {
    this.ensureStoreInitialized();
  }

  // --- Local Disk Persistence Helpers ---

  ensureStoreInitialized() {
    try {
      const dir = path.dirname(STORE_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(STORE_FILE_PATH)) {
        fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(DEFAULT_ANNOUNCEMENTS, null, 2), 'utf-8');
      } else {
        const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(DEFAULT_ANNOUNCEMENTS, null, 2), 'utf-8');
        }
      }
    } catch (err) {
      console.warn('[AnnouncementD1Service] Local store initialization note:', err.message);
    }
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(STORE_FILE_PATH)) {
        const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('[AnnouncementD1Service] Error reading announcements_store.json:', e.message);
    }
    return [...DEFAULT_ANNOUNCEMENTS];
  }

  saveToDisk(announcements) {
    try {
      const dir = path.dirname(STORE_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(announcements, null, 2), 'utf-8');
    } catch (e) {
      console.error('[AnnouncementD1Service] Error saving to announcements_store.json:', e.message);
    }
  }

  invalidateCache() {
    publicCache = { data: null, timestamp: 0 };
  }

  // --- Cloudflare D1 Table Verification ---

  async initTable() {
    if (!d1Service.isConfigured()) {
      return;
    }

    const sql = `
      CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT,
        message TEXT NOT NULL,
        link_url TEXT,
        link_text TEXT,
        icon TEXT DEFAULT '✦',
        active INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        start_at TEXT,
        end_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(active);
      CREATE INDEX IF NOT EXISTS idx_announcements_start_at ON announcements(start_at);
      CREATE INDEX IF NOT EXISTS idx_announcements_end_at ON announcements(end_at);
      CREATE INDEX IF NOT EXISTS idx_announcements_sort_order ON announcements(sort_order);
      CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
    `;

    try {
      await d1Service.execute(sql);
      console.log('✅ [AnnouncementD1Service] Cloudflare D1 announcements table verified.');
    } catch (err) {
      console.warn('⚠️ [AnnouncementD1Service] D1 Table Init Note:', err.message);
    }
  }

  // --- Helper to Compute Status ---
  computeStatus(record, now = new Date()) {
    const isExplicitlyActive = Boolean(record.active === 1 || record.active === true);
    if (!isExplicitlyActive) return 'disabled';

    const nowIso = now.toISOString();
    if (record.start_at && record.start_at > nowIso) {
      return 'scheduled';
    }
    if (record.end_at && record.end_at <= nowIso) {
      return 'expired';
    }
    return 'active';
  }

  // --- Public Active Announcements ---
  async getActiveAnnouncements() {
    const nowEpoch = Date.now();
    if (publicCache.data && nowEpoch - publicCache.timestamp < CACHE_TTL_MS) {
      return publicCache.data;
    }

    const nowIso = new Date().toISOString();
    let records = [];

    // Attempt Cloudflare D1 first if configured
    if (d1Service.isConfigured()) {
      try {
        const sql = `
          SELECT id, message, link_url, link_text, icon, priority, sort_order
          FROM announcements
          WHERE active = 1
            AND (start_at IS NULL OR start_at <= ?)
            AND (end_at IS NULL OR end_at > ?)
          ORDER BY priority DESC, sort_order ASC, created_at DESC;
        `;
        const { results, success } = await d1Service.execute(sql, [nowIso, nowIso]);
        if (success && Array.isArray(results)) {
          records = results;
        }
      } catch (d1Err) {
        console.warn('[AnnouncementD1Service] D1 read error, falling back to local persistent store:', d1Err.message);
      }
    }

    // Fallback to local store if D1 returned no results or wasn't configured
    if (records.length === 0) {
      const localData = this.loadFromDisk();
      records = localData
        .filter((item) => {
          if (!item.active) return false;
          if (item.start_at && item.start_at > nowIso) return false;
          if (item.end_at && item.end_at <= nowIso) return false;
          return true;
        })
        .sort((a, b) => {
          if ((b.priority || 0) !== (a.priority || 0)) {
            return (b.priority || 0) - (a.priority || 0);
          }
          if ((a.sort_order || 0) !== (b.sort_order || 0)) {
            return (a.sort_order || 0) - (b.sort_order || 0);
          }
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
    }

    // Return lightweight, public-sanitized records only
    const sanitized = records.map((r) => ({
      id: String(r.id),
      message: String(r.message || ''),
      linkUrl: r.link_url || r.linkUrl || '',
      linkText: r.link_text || r.linkText || '',
      icon: r.icon || '✦',
    }));

    publicCache = { data: sanitized, timestamp: nowEpoch };
    return sanitized;
  }

  // --- Admin All Announcements (with filtering) ---
  async getAdminAnnouncements(statusFilter = 'all') {
    let allRecords = [];

    if (d1Service.isConfigured()) {
      try {
        const sql = `
          SELECT id, title, message, link_url, link_text, icon, active, priority, sort_order, start_at, end_at, created_at, updated_at, created_by
          FROM announcements
          ORDER BY priority DESC, sort_order ASC, created_at DESC;
        `;
        const { results, success } = await d1Service.execute(sql);
        if (success && Array.isArray(results) && results.length > 0) {
          allRecords = results;
        }
      } catch (err) {
        console.warn('[AnnouncementD1Service] D1 admin fetch note:', err.message);
      }
    }

    if (allRecords.length === 0) {
      allRecords = this.loadFromDisk();
    }

    const now = new Date();
    const enriched = allRecords.map((r) => {
      const status = this.computeStatus(r, now);
      return {
        id: r.id,
        title: r.title || '',
        message: r.message || '',
        linkUrl: r.link_url || r.linkUrl || '',
        linkText: r.link_text || r.linkText || '',
        icon: r.icon || '✦',
        active: Boolean(r.active === 1 || r.active === true),
        priority: Number(r.priority || 0),
        sortOrder: Number(r.sort_order !== undefined ? r.sort_order : r.sortOrder || 0),
        startAt: r.start_at || r.startAt || null,
        endAt: r.end_at || r.endAt || null,
        createdAt: r.created_at || r.createdAt,
        updatedAt: r.updated_at || r.updatedAt,
        createdBy: r.created_by || r.createdBy || 'admin',
        computedStatus: status,
      };
    });

    // Apply Filter
    const filter = String(statusFilter || 'all').toLowerCase().trim();
    if (filter === 'all') return enriched;
    return enriched.filter((item) => item.computedStatus === filter);
  }

  // --- Admin Create Announcement ---
  async createAnnouncement({ title, message, linkUrl, linkText, icon, priority = 0, sortOrder = 0, active = true, startAt = null, endAt = null, adminEmail = 'admin@zenemoo.in' }) {
    const id = `ann_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    const newRecord = {
      id,
      title: title ? String(title).trim() : '',
      message: String(message).trim(),
      link_url: linkUrl ? String(linkUrl).trim() : '',
      link_text: linkText ? String(linkText).trim() : '',
      icon: icon ? String(icon).trim() : '✦',
      active: active ? 1 : 0,
      priority: Number(priority || 0),
      sort_order: Number(sortOrder || 0),
      start_at: startAt ? new Date(startAt).toISOString() : null,
      end_at: endAt ? new Date(endAt).toISOString() : null,
      created_at: now,
      updated_at: now,
      created_by: adminEmail || 'admin@zenemoo.in',
    };

    // Save to D1
    if (d1Service.isConfigured()) {
      try {
        const sql = `
          INSERT INTO announcements (
            id, title, message, link_url, link_text, icon, active, priority, sort_order, start_at, end_at, created_at, updated_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
        await d1Service.execute(sql, [
          newRecord.id,
          newRecord.title,
          newRecord.message,
          newRecord.link_url,
          newRecord.link_text,
          newRecord.icon,
          newRecord.active,
          newRecord.priority,
          newRecord.sort_order,
          newRecord.start_at,
          newRecord.end_at,
          newRecord.created_at,
          newRecord.updated_at,
          newRecord.created_by,
        ]);
      } catch (err) {
        console.warn('[AnnouncementD1Service] D1 create note:', err.message);
      }
    }

    // Save to local store
    const list = this.loadFromDisk();
    list.unshift(newRecord);
    this.saveToDisk(list);

    this.invalidateCache();
    return this.getAdminAnnouncementById(id);
  }

  // --- Admin Update Announcement ---
  async updateAnnouncement(id, updates) {
    const now = new Date().toISOString();
    const existing = await this.getAdminAnnouncementById(id);
    if (!existing) {
      throw new Error(`Announcement with id '${id}' not found`);
    }

    const updated = {
      title: updates.title !== undefined ? String(updates.title).trim() : existing.title,
      message: updates.message !== undefined ? String(updates.message).trim() : existing.message,
      link_url: updates.linkUrl !== undefined ? String(updates.linkUrl).trim() : (updates.link_url !== undefined ? String(updates.link_url).trim() : existing.linkUrl),
      link_text: updates.linkText !== undefined ? String(updates.linkText).trim() : (updates.link_text !== undefined ? String(updates.link_text).trim() : existing.linkText),
      icon: updates.icon !== undefined ? String(updates.icon).trim() : existing.icon,
      active: updates.active !== undefined ? (updates.active ? 1 : 0) : (existing.active ? 1 : 0),
      priority: updates.priority !== undefined ? Number(updates.priority) : existing.priority,
      sort_order: updates.sortOrder !== undefined ? Number(updates.sortOrder) : (updates.sort_order !== undefined ? Number(updates.sort_order) : existing.sortOrder),
      start_at: updates.startAt !== undefined ? (updates.startAt ? new Date(updates.startAt).toISOString() : null) : (existing.startAt ? new Date(existing.startAt).toISOString() : null),
      end_at: updates.endAt !== undefined ? (updates.endAt ? new Date(updates.endAt).toISOString() : null) : (existing.endAt ? new Date(existing.endAt).toISOString() : null),
      updated_at: now,
    };

    // Update D1
    if (d1Service.isConfigured()) {
      try {
        const sql = `
          UPDATE announcements SET
            title = ?,
            message = ?,
            link_url = ?,
            link_text = ?,
            icon = ?,
            active = ?,
            priority = ?,
            sort_order = ?,
            start_at = ?,
            end_at = ?,
            updated_at = ?
          WHERE id = ?;
        `;
        await d1Service.execute(sql, [
          updated.title,
          updated.message,
          updated.link_url,
          updated.link_text,
          updated.icon,
          updated.active,
          updated.priority,
          updated.sort_order,
          updated.start_at,
          updated.end_at,
          updated.updated_at,
          id,
        ]);
      } catch (err) {
        console.warn('[AnnouncementD1Service] D1 update note:', err.message);
      }
    }

    // Update local store
    const list = this.loadFromDisk();
    const idx = list.findIndex((item) => item.id === id);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        ...updated,
      };
      this.saveToDisk(list);
    }

    this.invalidateCache();
    return this.getAdminAnnouncementById(id);
  }

  // --- Admin Toggle Status ---
  async toggleStatus(id, active) {
    return this.updateAnnouncement(id, { active: Boolean(active) });
  }

  // --- Admin Reorder ---
  async reorderAnnouncements(orderedIds = []) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return false;

    const list = this.loadFromDisk();
    const now = new Date().toISOString();

    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      const sortOrder = i + 1;

      // Update in D1
      if (d1Service.isConfigured()) {
        try {
          await d1Service.execute('UPDATE announcements SET sort_order = ?, updated_at = ? WHERE id = ?;', [sortOrder, now, id]);
        } catch (e) {
          // ignore individual note
        }
      }

      // Update in local store
      const item = list.find((x) => x.id === id);
      if (item) {
        item.sort_order = sortOrder;
        item.updated_at = now;
      }
    }

    this.saveToDisk(list);
    this.invalidateCache();
    return true;
  }

  // --- Admin Delete Announcement ---
  async deleteAnnouncement(id) {
    // Delete in D1
    if (d1Service.isConfigured()) {
      try {
        await d1Service.execute('DELETE FROM announcements WHERE id = ?;', [id]);
      } catch (err) {
        console.warn('[AnnouncementD1Service] D1 delete note:', err.message);
      }
    }

    // Delete in local store
    const list = this.loadFromDisk();
    const filtered = list.filter((item) => item.id !== id);
    this.saveToDisk(filtered);

    this.invalidateCache();
    return true;
  }

  async getAdminAnnouncementById(id) {
    const list = await this.getAdminAnnouncements('all');
    return list.find((item) => item.id === id) || null;
  }
}

export const announcementD1Service = new AnnouncementD1Service();
