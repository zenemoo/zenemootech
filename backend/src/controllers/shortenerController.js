import { kvShortenerService } from '../services/kvShortenerService.js';

/**
 * URL Shortener Controller
 * Handles administrative management operations for short links.
 * All write and read methods require valid Admin authentication.
 */

export const getShortenerStats = async (req, res, next) => {
  try {
    const stats = await kvShortenerService.getStats();
    return res.json({
      success: true,
      stats,
    });
  } catch (err) {
    next(err);
  }
};

export const getShortenerLinks = async (req, res, next) => {
  try {
    const { search, status, page, limit } = req.query;
    const result = await kvShortenerService.getLinks({
      search: search ? String(search) : '',
      status: status ? String(status) : 'all',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export const recordShortenerClickTelemetry = async (req, res, next) => {
  try {
    const { code, visitorHash, clicks, unique_clicks } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Missing short code.' });
    }
    const clientIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';
    const updated = await kvShortenerService.recordClick(
      code,
      clientIp,
      userAgent,
      visitorHash,
      clicks,
      unique_clicks
    );
    return res.json({ success: true, link: updated });
  } catch (err) {
    next(err);
  }
};

export const getShortenerLinkByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const link = await kvShortenerService.getLink(code);
    if (!link) {
      return res.status(404).json({
        success: false,
        message: `Short link '${code}' not found.`,
      });
    }

    // Only record click when specifically requested via ?track=true (e.g. from frontend redirect gateway)
    if (req.query.track === 'true') {
      const clientIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || '';
      kvShortenerService.recordClick(code, clientIp, userAgent).catch((trackErr) => {
        console.warn('[Shortener Controller] Telemetry error:', trackErr.message);
      });
    }

    return res.json({
      success: true,
      link,
    });
  } catch (err) {
    next(err);
  }
};

export const createShortenerLink = async (req, res, next) => {
  try {
    const { destination_url, custom_code, title, notes, expires_at } = req.body;

    if (!destination_url || typeof destination_url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Destination URL is required.',
      });
    }

    const created_by = req.user?.email || 'admin';
    const newLink = await kvShortenerService.createLink({
      destination_url,
      custom_code,
      title,
      notes,
      expires_at,
      created_by,
    });

    return res.status(201).json({
      success: true,
      message: 'Short link created successfully.',
      link: newLink,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to create short link.',
    });
  }
};

export const updateShortenerLink = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { destination_url, title, notes, expires_at, status } = req.body;
    const updated_by = req.user?.email || 'admin';

    const updatedLink = await kvShortenerService.updateLink(
      code,
      { destination_url, title, notes, expires_at, status },
      updated_by
    );

    return res.json({
      success: true,
      message: 'Short link updated successfully.',
      link: updatedLink,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update short link.',
    });
  }
};

export const toggleShortenerLinkStatus = async (req, res, next) => {
  try {
    const { code } = req.params;
    const updated_by = req.user?.email || 'admin';

    const updatedLink = await kvShortenerService.toggleStatus(code, updated_by);

    return res.json({
      success: true,
      message: `Short link '${code}' is now ${updatedLink.status}.`,
      link: updatedLink,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update link status.',
    });
  }
};

export const deleteShortenerLink = async (req, res, next) => {
  try {
    const { code } = req.params;
    await kvShortenerService.deleteLink(code);

    return res.json({
      success: true,
      message: `Short link '${code}' permanently deleted.`,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to delete short link.',
    });
  }
};

export const exportShortenerLinksCsv = async (req, res, next) => {
  try {
    const { links } = await kvShortenerService.getLinks({ limit: 5000 });
    const baseDomain = process.env.SHORTENER_BASE_DOMAIN || 'https://zenemoo.in';

    const headers = ['Code', 'Short URL', 'Title', 'Destination URL', 'Status', 'Expires At', 'Total Clicks', 'Unique Clicks', 'Created At', 'Created By', 'Notes'];
    const rows = links.map((l) => [
      `"${(l.code || '').replace(/"/g, '""')}"`,
      `"${baseDomain}/l/${l.code}"`,
      `"${(l.title || '').replace(/"/g, '""')}"`,
      `"${(l.destination_url || '').replace(/"/g, '""')}"`,
      `"${l.status || 'active'}"`,
      `"${l.expires_at || 'Never'}"`,
      l.clicks || 0,
      l.unique_clicks || (l.unique_visitors ? l.unique_visitors.length : (l.clicks ? Math.min(l.clicks, 1) : 0)),
      `"${l.created_at || ''}"`,
      `"${(l.created_by || '').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="zenemoo_short_links_${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
};
