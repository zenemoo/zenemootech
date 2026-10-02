import { announcementD1Service } from '../services/announcementD1Service.js';

/**
 * Validates that a link URL is safe:
 * Accepts:
 * - Relative paths: '/opportunities', '/talent-registration', '/30min'
 * - Secure Absolute URLs: 'https://...', 'http://...'
 * Rejects:
 * - 'javascript:', 'data:', 'vbscript:', or malicious payloads
 */
export const isValidAnnouncementUrl = (url) => {
  if (!url || typeof url !== 'string') return true; // Link is optional
  const clean = url.trim();
  if (clean === '') return true;

  const lower = clean.toLowerCase();
  const dangerousPrefixes = ['javascript:', 'data:', 'vbscript:', 'file:', 'blob:'];
  if (dangerousPrefixes.some((p) => lower.startsWith(p))) {
    return false;
  }

  // Allow root-relative paths
  if (clean.startsWith('/')) {
    return true;
  }

  // Allow standard http/https
  try {
    const parsed = new URL(clean);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch (e) {
    return false;
  }
};

/**
 * Strips potential HTML tags and controls from text input
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

/**
 * Public: Get active announcements for the public marquee ticker
 * GET /api/announcements/active
 */
export const getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await announcementD1Service.getActiveAnnouncements();
    return res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (err) {
    console.error('[Announcement Public API Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve active announcements.',
    });
  }
};

/**
 * Admin: Get all announcements with optional status filter
 * GET /api/admin/announcements?status=all|active|scheduled|disabled|expired
 */
export const getAdminAnnouncements = async (req, res) => {
  try {
    const statusFilter = req.query.status || 'all';
    const announcements = await announcementD1Service.getAdminAnnouncements(statusFilter);
    return res.status(200).json({
      success: true,
      count: announcements.length,
      filter: statusFilter,
      data: announcements,
    });
  } catch (err) {
    console.error('[Admin Announcements Fetch Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin announcements.',
    });
  }
};

/**
 * Admin: Create a new announcement
 * POST /api/admin/announcements
 */
export const createAnnouncement = async (req, res) => {
  try {
    const { title, message, linkUrl, linkText, icon, priority, sortOrder, active, startAt, endAt } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Announcement message is required.',
      });
    }

    if (linkUrl && !isValidAnnouncementUrl(linkUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid link URL. JavaScript, data URIs, and dangerous protocols are strictly forbidden.',
      });
    }

    // Validate dates if provided
    if (startAt && isNaN(new Date(startAt).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date/time format.',
      });
    }

    if (endAt && isNaN(new Date(endAt).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end date/time format.',
      });
    }

    if (startAt && endAt && new Date(startAt).getTime() >= new Date(endAt).getTime()) {
      return res.status(400).json({
        success: false,
        message: 'End date/time must be strictly after start date/time.',
      });
    }

    const adminEmail = req.user?.email || 'admin@zenemoo.in';

    const created = await announcementD1Service.createAnnouncement({
      title: sanitizeText(title),
      message: sanitizeText(message),
      linkUrl: linkUrl ? linkUrl.trim() : '',
      linkText: sanitizeText(linkText),
      icon: icon ? String(icon).trim() : '✦',
      priority: priority !== undefined ? Number(priority) : 0,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      active: active !== undefined ? Boolean(active) : true,
      startAt: startAt || null,
      endAt: endAt || null,
      adminEmail,
    });

    return res.status(201).json({
      success: true,
      message: 'Announcement created successfully.',
      data: created,
    });
  } catch (err) {
    console.error('[Admin Announcement Create Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to create announcement.',
    });
  }
};

/**
 * Admin: Update an existing announcement
 * PATCH /api/admin/announcements/:id
 */
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Announcement ID is required.' });
    }

    const { title, message, linkUrl, linkText, icon, priority, sortOrder, active, startAt, endAt } = req.body;

    if (message !== undefined && (typeof message !== 'string' || message.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Announcement message cannot be empty.',
      });
    }

    if (linkUrl !== undefined && linkUrl !== '' && !isValidAnnouncementUrl(linkUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid link URL. JavaScript, data URIs, and dangerous protocols are forbidden.',
      });
    }

    if (startAt && isNaN(new Date(startAt).getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start date/time format.' });
    }

    if (endAt && isNaN(new Date(endAt).getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid end date/time format.' });
    }

    const updates = {};
    if (title !== undefined) updates.title = sanitizeText(title);
    if (message !== undefined) updates.message = sanitizeText(message);
    if (linkUrl !== undefined) updates.linkUrl = linkUrl ? linkUrl.trim() : '';
    if (linkText !== undefined) updates.linkText = sanitizeText(linkText);
    if (icon !== undefined) updates.icon = String(icon).trim();
    if (priority !== undefined) updates.priority = Number(priority);
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);
    if (active !== undefined) updates.active = Boolean(active);
    if (startAt !== undefined) updates.startAt = startAt ? new Date(startAt).toISOString() : null;
    if (endAt !== undefined) updates.endAt = endAt ? new Date(endAt).toISOString() : null;

    const updated = await announcementD1Service.updateAnnouncement(id, updates);

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully.',
      data: updated,
    });
  } catch (err) {
    console.error('[Admin Announcement Update Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update announcement.',
    });
  }
};

/**
 * Admin: Toggle announcement active status
 * PATCH /api/admin/announcements/:id/status
 */
export const toggleAnnouncementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Announcement ID is required.' });
    }

    const updated = await announcementD1Service.toggleStatus(id, Boolean(active));
    return res.status(200).json({
      success: true,
      message: `Announcement ${updated.active ? 'enabled' : 'disabled'} successfully.`,
      data: updated,
    });
  } catch (err) {
    console.error('[Admin Announcement Toggle Status Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to toggle announcement status.',
    });
  }
};

/**
 * Admin: Batch reorder announcements
 * PATCH /api/admin/announcements/reorder
 */
export const reorderAnnouncements = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderedIds must be a non-empty array of announcement IDs.',
      });
    }

    await announcementD1Service.reorderAnnouncements(orderedIds);
    const refreshed = await announcementD1Service.getAdminAnnouncements('all');

    return res.status(200).json({
      success: true,
      message: 'Announcements reordered successfully.',
      data: refreshed,
    });
  } catch (err) {
    console.error('[Admin Announcement Reorder Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to reorder announcements.',
    });
  }
};

/**
 * Admin: Delete announcement
 * DELETE /api/admin/announcements/:id
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Announcement ID is required.' });
    }

    await announcementD1Service.deleteAnnouncement(id);
    return res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully.',
    });
  } catch (err) {
    console.error('[Admin Announcement Delete Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete announcement.',
    });
  }
};
