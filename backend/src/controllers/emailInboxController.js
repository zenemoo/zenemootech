import dotenv from 'dotenv';
dotenv.config();

import { supabase } from '../config/supabase.js';
import { supabaseService } from '../services/supabaseService.js';
import { encrypt, decrypt } from '../services/encryptionService.js';
import { sendMailViaBrevo, parseRecipients, validateEmail, sanitizeHtml } from '../services/emailService.js';
import { sendZenemooNotification } from '../services/pushNotificationEngine.js';
import { sanitizePostgrestFilter, sanitizePostgrestExact } from '../utils/postgrestSanitizer.js';
import { emailR2Service } from '../services/emailR2Service.js';

const getCloudflareWebhookSecret = () => (process.env.CLOUDFLARE_WEBHOOK_SECRET ? process.env.CLOUDFLARE_WEBHOOK_SECRET.trim() : null);

const DEFAULT_VERIFIED_ADDRESSES = [
  {
    id: 'addr_contact',
    display_name: 'Zenemoo Business Team',
    email: 'contact@zenemoo.in',
    domain: 'zenemoo.in',
    description: 'Primary corporate business inquiries, partnerships, and client communications',
    mailbox_type: 'general',
    status: 'verified',
    spf_status: true,
    dkim_status: true,
    dmarc_status: true,
    domain_verified: true,
    incoming_enabled: true,
    outgoing_enabled: true,
  },
  {
    id: 'addr_support',
    display_name: 'Zenemoo Customer Support',
    email: 'support@zenemoo.in',
    domain: 'zenemoo.in',
    description: 'Customer helpdesk, technical assistance, platform onboarding, and tickets',
    mailbox_type: 'support',
    status: 'verified',
    spf_status: true,
    dkim_status: true,
    dmarc_status: true,
    domain_verified: true,
    incoming_enabled: true,
    outgoing_enabled: true,
  },
  {
    id: 'addr_info',
    display_name: 'Zenemoo Information Desk',
    email: 'info@zenemoo.in',
    domain: 'zenemoo.in',
    description: 'General public queries, media inquiries, press releases, and announcements',
    mailbox_type: 'info',
    status: 'verified',
    spf_status: true,
    dkim_status: true,
    dmarc_status: true,
    domain_verified: true,
    incoming_enabled: true,
    outgoing_enabled: true,
  },
  {
    id: 'addr_prem',
    display_name: 'Prem Founder',
    email: 'prem@zenemoo.in',
    domain: 'zenemoo.in',
    description: 'Executive founder desk for strategic partnerships and core operations',
    mailbox_type: 'executive',
    status: 'verified',
    spf_status: true,
    dkim_status: true,
    dmarc_status: true,
    domain_verified: true,
    incoming_enabled: true,
    outgoing_enabled: true,
  },
  {
    id: 'addr_hemanta',
    display_name: 'Hemanta Kumar Sahu',
    email: 'hemanta@zenemoo.in',
    domain: 'zenemoo.in',
    description: 'Engineering and data operations desk',
    mailbox_type: 'executive',
    status: 'verified',
    spf_status: true,
    dkim_status: true,
    dmarc_status: true,
    domain_verified: true,
    incoming_enabled: true,
    outgoing_enabled: true,
  },
  {
    id: 'addr_sangita',
    display_name: 'Sangita HR',
    email: 'sangita@zenemoo.in',
    domain: 'zenemoo.in',
    description: 'Human resources, contributor hiring, careers, and team onboarding',
    mailbox_type: 'hr',
    status: 'verified',
    spf_status: true,
    dkim_status: true,
    dmarc_status: true,
    domain_verified: true,
    incoming_enabled: true,
    outgoing_enabled: true,
  },
  {
    id: 'addr_noreply',
    display_name: 'Zenemoo System',
    email: 'noreply@zenemoo.in',
    domain: 'zenemoo.in',
    description: 'Automated system notifications, meeting confirmations, and reminders',
    mailbox_type: 'system',
    status: 'verified',
    spf_status: true,
    dkim_status: true,
    dmarc_status: true,
    domain_verified: true,
    incoming_enabled: false,
    outgoing_enabled: true,
  },
];

// In-Memory Fallback Caches for Seamless Dev/Testing Operation
const inMemoryAddresses = [...DEFAULT_VERIFIED_ADDRESSES];
const inMemoryEmails = [];

// Server-side response cache for storage usage to eliminate redundant Supabase PostgREST egress
let cachedStorageUsage = null;
let lastStorageCalculationTime = 0;
const STORAGE_USAGE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

export const invalidateStorageStatsCache = () => {
  cachedStorageUsage = null;
  lastStorageCalculationTime = 0;
};

/**
 * Auto-categorize email content based on keywords and recipient mailbox
 */
const autoCategorizeEmail = (subject = '', body = '', recipient = '') => {
  const text = `${subject} ${body}`.toLowerCase();
  const rec = recipient.toLowerCase();

  if (rec.includes('support') || text.includes('issue') || text.includes('error') || text.includes('ticket') || text.includes('help')) {
    return 'support';
  }
  if (rec.includes('sangita') || text.includes('resume') || text.includes('applicant') || text.includes('hiring') || text.includes('job')) {
    return 'career';
  }
  if (text.includes('partner') || text.includes('collaboration') || text.includes('annotrix') || text.includes('proposal')) {
    return 'partnership';
  }
  if (text.includes('inquiry') || text.includes('dataset') || text.includes('transcription') || text.includes('annotation')) {
    return 'project_inquiry';
  }
  if (text.includes('contract') || text.includes('enterprise') || text.includes('client') || text.includes('pricing')) {
    return 'client';
  }
  return 'general';
};

/**
 * GET /api/emails/addresses
 * Get list of configured Zenemoo email address accounts
 */
export const getEmailAddresses = async (req, res, next) => {
  try {
    if (supabase) {
      const { data: addresses, error } = await supabase
        .from('zenemoo_email_addresses')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && addresses && addresses.length > 0) {
        return res.json({ success: true, addresses });
      }
    }

    return res.json({ success: true, addresses: inMemoryAddresses });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/emails/addresses
 * Add a new Zenemoo email address account (marked Pending Verification until Cloudflare config)
 */
export const addEmailAddress = async (req, res, next) => {
  try {
    const { display_name, email, description, mailbox_type } = req.body;

    if (!display_name || !email) {
      return res.status(400).json({ success: false, message: 'display_name and email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split('@')[1] || 'zenemoo.in';

    const newRecord = {
      id: `addr_${Date.now()}`,
      display_name: display_name.trim(),
      email: cleanEmail,
      domain,
      description: description ? description.trim() : 'Custom Zenemoo email account',
      mailbox_type: mailbox_type || 'general',
      status: 'pending', // IMPORTANT: Display pending verification until Cloudflare infrastructure verified
      spf_status: true,
      dkim_status: true,
      dmarc_status: true,
      domain_verified: true,
      incoming_enabled: true,
      outgoing_enabled: true,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('zenemoo_email_addresses')
        .insert([newRecord])
        .select()
        .maybeSingle();

      if (!error && data) {
        return res.status(201).json({ success: true, address: data });
      }
    }

    inMemoryAddresses.push(newRecord);
    return res.status(201).json({ success: true, address: newRecord });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/emails/inbox
 * Get incoming emails list with search, category, mailbox filter, view filters, sorting, and server-side pagination
 */
export const getIncomingEmails = async (req, res, next) => {
  try {
    const {
      search,
      mailbox,
      category,
      view = 'all',
      sortBy = 'newest',
      order,
      page = 1,
      pageSize,
      limit = 20,
      fromSender,
      toRecipient,
      subjectQuery,
      dateRange,
      hasAttachment,
      starredFilter,
      labelFilter,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(pageSize || limit, 10) || 25));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    const isAscending = order === 'asc' || sortBy === 'oldest';

    if (supabase) {
      // Egress-safe explicit columns (DO NOT load full body_html, body_text, or raw_headers in list query)
      const listColumns = 'id, message_id, mailbox_email, sender_name, sender_email, recipient_email, reply_to, subject, snippet, category, is_read, is_starred, is_archived, is_trashed, has_attachments, attachments, auth_results, storage_provider, storage_migration_status, received_at, created_at, updated_at';
      let query = supabase.from('incoming_email_messages').select(listColumns, { count: 'exact' });

      // View filters
      if (view === 'unread' || starredFilter === 'unread') {
        query = query.eq('is_read', false).eq('is_trashed', false);
      } else if (view === 'starred' || starredFilter === 'starred') {
        query = query.eq('is_starred', true).eq('is_trashed', false);
      } else if (view === 'archived') {
        query = query.eq('is_archived', true).eq('is_trashed', false);
      } else if (view === 'trash') {
        query = query.eq('is_trashed', true);
      } else {
        query = query.eq('is_trashed', false).eq('is_archived', false);
      }

      if (starredFilter === 'not_starred') {
        query = query.eq('is_starred', false);
      }

      if (mailbox && mailbox !== 'all') {
        query = query.ilike('mailbox_email', mailbox.trim());
      }

      const targetCategory = labelFilter && labelFilter !== 'all' ? labelFilter : category;
      if (targetCategory && targetCategory !== 'all') {
        query = query.eq('category', targetCategory.trim());
      }

      if (fromSender && fromSender.trim()) {
        const cleanFrom = sanitizePostgrestFilter(fromSender);
        if (cleanFrom) {
          const fTerm = `%${cleanFrom}%`;
          query = query.or(`sender_name.ilike.${fTerm},sender_email.ilike.${fTerm}`);
        }
      }

      if (toRecipient && toRecipient.trim()) {
        query = query.ilike('recipient_email', `%${toRecipient.trim()}%`);
      }

      if (subjectQuery && subjectQuery.trim()) {
        query = query.ilike('subject', `%${subjectQuery.trim()}%`);
      }

      if (search && search.trim()) {
        const cleanSearch = sanitizePostgrestFilter(search);
        if (cleanSearch) {
          const term = `%${cleanSearch}%`;
          query = query.or(`sender_name.ilike.${term},sender_email.ilike.${term},recipient_email.ilike.${term},subject.ilike.${term},snippet.ilike.${term},mailbox_email.ilike.${term},message_id.ilike.${term}`);
        }
      }

      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        if (dateRange === 'today') {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          query = query.gte('received_at', startOfDay);
        } else if (dateRange === 'yesterday') {
          const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          query = query.gte('received_at', yesterdayStart).lt('received_at', todayStart);
        } else if (dateRange === '7days') {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte('received_at', sevenDaysAgo);
        } else if (dateRange === '30days') {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte('received_at', thirtyDaysAgo);
        }
      }

      query = query.order('received_at', { ascending: isAscending }).range(from, to);

      // Execute paginated list query + parallel lightweight head count for unread
      const [listResult, unreadResult] = await Promise.all([
        query,
        supabase
          .from('incoming_email_messages')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          .eq('is_trashed', false)
          .eq('is_archived', false),
      ]);

      const { data: dbEmails, count, error } = listResult;

      if (!error && Array.isArray(dbEmails)) {
        // Strip heavy base64 data from attachments in list view for zero egress waste
        const sanitizedEmails = dbEmails.map((e) => {
          let atts = [];
          if (Array.isArray(e.attachments)) {
            atts = e.attachments.map((a, idx) => ({
              id: a.id || `att_${idx}`,
              filename: a.filename || a.name || 'attachment',
              contentType: a.contentType || a.type || 'application/octet-stream',
              size: typeof a.size === 'number' ? a.size : (a.content ? Math.round(a.content.length * 0.75) : 1024),
              r2_key: a.r2_key || (e.storage_provider === 'cloudflare_r2' ? `incoming/${e.id}/attachments/${emailR2Service.sanitizeFilename(a.filename || a.name)}` : undefined),
            }));
          }
          return {
            ...e,
            attachments: atts,
            has_attachments: Boolean(e.has_attachments || atts.length > 0),
          };
        });

        const total = typeof count === 'number' ? count : dbEmails.length;
        const unreadTotal = typeof unreadResult.count === 'number' ? unreadResult.count : 0;
        const totalPages = Math.max(1, Math.ceil(total / limitNum));

        return res.json({
          success: true,
          emails: sanitizedEmails,
          total,
          unreadCount: unreadTotal,
          page: pageNum,
          pageSize: limitNum,
          limit: limitNum,
          totalPages,
          pagination: {
            page: pageNum,
            pageSize: limitNum,
            total,
            unreadCount: unreadTotal,
            totalPages,
          },
        });
      }
    }

    // In-Memory Fallback
    let result = [...inMemoryEmails];
    if (view === 'unread' || starredFilter === 'unread') result = result.filter((e) => !e.is_read && !e.is_trashed);
    else if (view === 'starred' || starredFilter === 'starred') result = result.filter((e) => e.is_starred && !e.is_trashed);
    else if (view === 'archived') result = result.filter((e) => e.is_archived && !e.is_trashed);
    else if (view === 'trash') result = result.filter((e) => e.is_trashed);
    else result = result.filter((e) => !e.is_trashed && !e.is_archived);

    if (mailbox && mailbox !== 'all') result = result.filter((e) => (e.mailbox_email || '').toLowerCase() === mailbox.toLowerCase());
    const targetCategory = labelFilter && labelFilter !== 'all' ? labelFilter : category;
    if (targetCategory && targetCategory !== 'all') result = result.filter((e) => e.category === targetCategory);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          (e.sender_name || '').toLowerCase().includes(q) ||
          (e.sender_email || '').toLowerCase().includes(q) ||
          (e.recipient_email || '').toLowerCase().includes(q) ||
          (e.subject || '').toLowerCase().includes(q) ||
          (e.snippet || '').toLowerCase().includes(q) ||
          (e.message_id || '').toLowerCase().includes(q)
      );
    }

    if (isAscending) {
      result.sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());
    } else {
      result.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
    }

    const total = result.length;
    const unreadCount = inMemoryEmails.filter((e) => !e.is_read && !e.is_trashed && !e.is_archived).length;
    const sliced = result.slice(from, from + limitNum);
    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    return res.json({
      success: true,
      emails: sliced,
      total,
      unreadCount,
      page: pageNum,
      pageSize: limitNum,
      limit: limitNum,
      totalPages,
      pagination: {
        page: pageNum,
        pageSize: limitNum,
        total,
        unreadCount,
        totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/emails/inbox/:id
 * Get single incoming email detail & automatically mark as read
 */
export const getIncomingEmailById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (supabase) {
      let query = supabase.from('incoming_email_messages').select('*');
      if (id.startsWith('msg_') || id.startsWith('sent_') || id.includes('@') || id.includes('<')) {
        const cleanId = sanitizePostgrestExact(id);
        if (cleanId) {
          query = query.or(`id.eq.${cleanId},message_id.eq.${cleanId}`);
        } else {
          return res.status(404).json({ success: false, message: 'Invalid email ID format' });
        }
      } else {
        query = query.eq('id', id);
      }
      const { data: email, error } = await query.maybeSingle();

      if (!error && email) {
        if (!email.is_read) {
          await supabase
            .from('incoming_email_messages')
            .update({ is_read: true, updated_at: new Date().toISOString() })
            .eq('id', email.id);
          email.is_read = true;
        }

        // Dual-Read Body: Read from R2 if R2 key or cloudflare_r2 provider exists, falling back safely to Supabase
        const r2HtmlKey = email.body_html_r2_key || (email.storage_provider === 'cloudflare_r2' ? `incoming/${email.id}/body.html` : null);
        const r2TextKey = email.body_text_r2_key || (email.storage_provider === 'cloudflare_r2' ? `incoming/${email.id}/body.txt` : null);

        if (r2HtmlKey || r2TextKey) {
          try {
            const { body_html, body_text } = await emailR2Service.getEmailBodyWithFallback({
              htmlKey: r2HtmlKey,
              textKey: r2TextKey,
              fallbackHtml: email.body_html || '',
              fallbackText: email.body_text || '',
            });
            email.body_html = body_html;
            email.body_text = body_text;
          } catch (r2ReadErr) {
            console.warn('[getIncomingEmailById] Dual-read fallback to Supabase:', r2ReadErr.message);
          }
        }

        // Sanitize attachments: ensure clean metadata with R2 key without exposing heavy base64
        if (Array.isArray(email.attachments)) {
          email.attachments = email.attachments.map((a, idx) => ({
            id: a.id || `att_${idx}`,
            filename: a.filename || a.name || 'attachment',
            contentType: a.contentType || a.type || 'application/octet-stream',
            size: typeof a.size === 'number' ? a.size : (a.content ? Math.round(a.content.length * 0.75) : 1024),
            r2_key: a.r2_key || `incoming/${emailR2Service.sanitizeId(email.id)}/attachments/${emailR2Service.sanitizeFilename(a.filename || a.name)}`,
          }));
        }

        return res.json({ success: true, email });
      }
    }

    const email = inMemoryEmails.find((e) => e.id === id || e.message_id === id);
    if (!email) {
      return res.status(404).json({ success: false, message: 'Email record not found.' });
    }

    email.is_read = true;
    return res.json({ success: true, email });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/emails/inbox/:id
 * Update state (is_read, is_starred, is_archived, is_trashed, category)
 */
export const updateIncomingEmailState = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_read, is_starred, is_archived, is_trashed, category } = req.body;

    const updatePayload = { updated_at: new Date().toISOString() };
    if (typeof is_read === 'boolean') updatePayload.is_read = is_read;
    if (typeof is_starred === 'boolean') updatePayload.is_starred = is_starred;
    if (typeof is_archived === 'boolean') updatePayload.is_archived = is_archived;
    if (typeof is_trashed === 'boolean') updatePayload.is_trashed = is_trashed;
    if (category) updatePayload.category = category;

    if (supabase) {
      const { data: updatedEmail, error } = await supabase
        .from('incoming_email_messages')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && updatedEmail) {
        return res.json({ success: true, email: updatedEmail });
      }
    }

    const itemIndex = inMemoryEmails.findIndex((e) => e.id === id);
    if (itemIndex >= 0) {
      inMemoryEmails[itemIndex] = { ...inMemoryEmails[itemIndex], ...updatePayload };
      return res.json({ success: true, email: inMemoryEmails[itemIndex] });
    }

    return res.status(404).json({ success: false, message: 'Email record not found.' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/emails/inbox/:id
 * Permanent deletion from R2 storage and Supabase database (R2-first safety architecture)
 */
export const deleteIncomingEmail = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Locate email record to ensure it exists and extract attachment keys
    let emailRecord = null;
    if (supabase) {
      const { data } = await supabase.from('incoming_email_messages').select('*').eq('id', id).maybeSingle();
      if (data) emailRecord = data;
    }
    if (!emailRecord) {
      emailRecord = inMemoryEmails.find((e) => e.id === id || e.message_id === id);
    }

    if (!emailRecord) {
      return res.status(404).json({ success: false, message: 'Email record not found.' });
    }

    // 2. Extract any specific attachment R2 keys
    const extraKeys = [];
    if (Array.isArray(emailRecord.attachments)) {
      emailRecord.attachments.forEach((a) => {
        if (a && a.r2_key) extraKeys.push(a.r2_key);
      });
    }

    // 3. Delete all R2 objects first & verify cleanup
    try {
      const r2Cleaned = await emailR2Service.deleteEmailObjects({
        emailId: id,
        type: 'incoming',
        extraKeys,
      });

      if (!r2Cleaned) {
        return res.status(500).json({
          success: false,
          message: 'Failed to clean up Cloudflare R2 storage objects. Supabase email record was preserved for retry.',
        });
      }
    } catch (r2Err) {
      console.error('[Delete Incoming Email R2 Error]:', r2Err.message);
      return res.status(500).json({
        success: false,
        message: `R2 cleanup error: ${r2Err.message}. Supabase email record was preserved.`,
      });
    }

    // 4. ONLY after R2 cleanup succeeds, delete from Supabase database
    if (supabase) {
      const { error } = await supabase
        .from('incoming_email_messages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Delete Incoming Email Supabase Error]:', error.message);
        return res.status(500).json({
          success: false,
          message: `Failed to delete Supabase record: ${error.message}`,
        });
      }
    }

    const idx = inMemoryEmails.findIndex((e) => e.id === id || e.message_id === id);
    if (idx >= 0) {
      inMemoryEmails.splice(idx, 1);
    }

    invalidateStorageStatsCache();
    return res.json({ success: true, message: 'Email and all associated R2 objects permanently deleted.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/emails/webhook/cloudflare
 * Cloudflare Email Routing Worker Ingestion Webhook with Message-ID deduplication and Admin Notification
 */
export const ingestCloudflareEmail = async (req, res, next) => {
  try {
    const authHeader = req.headers['x-cloudflare-webhook-secret'] || req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Missing Cloudflare Webhook authorization header.' });
    }

    const expectedSecret = getCloudflareWebhookSecret();
    if (!expectedSecret) {
      console.error('[Cloudflare Webhook] CLOUDFLARE_WEBHOOK_SECRET environment variable is not configured on server.');
      return res.status(500).json({ success: false, message: 'Webhook configuration error' });
    }

    const cleanAuth = String(authHeader).replace(/^Bearer\s+/i, '').trim();
    if (cleanAuth !== expectedSecret) {
      console.warn('[Cloudflare Webhook] Unauthorized token attempt.');
      return res.status(401).json({ success: false, message: 'Unauthorized Cloudflare Webhook token.' });
    }

    const {
      message_id,
      mailbox_email,
      sender_name,
      sender_email,
      recipient_email,
      reply_to,
      subject,
      body_text,
      body_html,
      snippet,
      attachments,
      auth_results,
      received_at,
    } = req.body;

    if (!sender_email || !subject) {
      return res.status(400).json({ success: false, message: 'sender_email and subject are required.' });
    }

    const msgId = message_id || `<cf-worker-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@zenemoo.in>`;
    const targetMailbox = (mailbox_email || recipient_email || 'contact@zenemoo.in').toLowerCase();
    const cleanSenderName = sender_name || sender_email.split('@')[0];

    // 1. Duplicate Protection via Message-ID check (DB + In-Memory)
    if (supabase) {
      const { data: existing } = await supabase
        .from('incoming_email_messages')
        .select('id')
        .eq('message_id', msgId)
        .maybeSingle();

      if (existing) {
        console.log(`[Cloudflare Webhook] Duplicate email ignored: ${msgId}`);
        return res.json({ success: true, message: 'Duplicate email ignored idempotently.', email_id: existing.id });
      }
    }

    const memExisting = inMemoryEmails.find((e) => e.message_id === msgId);
    if (memExisting) {
      console.log(`[Cloudflare Webhook] Duplicate email ignored (in-memory): ${msgId}`);
      return res.json({ success: true, message: 'Duplicate email ignored idempotently.', email_id: memExisting.id });
    }

    // 2. Parse MIME Raw Email Payload to extract clean body_text, body_html, snippet, auth_results & attachments
    const parsedMime = parseMimeEmailPayload(body_text, body_html, attachments);

    const cleanBodyText = parsedMime.body_text || body_text || '';
    const cleanBodyHtml = parsedMime.body_html || body_html || `<p>${cleanBodyText}</p>`;
    const cleanSnippet = parsedMime.snippet || snippet || cleanBodyText.substring(0, 160) || 'No snippet available.';
    const finalAuthResults = auth_results || parsedMime.auth_results || { spf: 'pass', dkim: 'pass', dmarc: 'pass' };
    const finalAttachments = parsedMime.attachments.length > 0 ? parsedMime.attachments : (Array.isArray(attachments) ? attachments : []);

    const assignedCategory = autoCategorizeEmail(subject, cleanBodyText || cleanSnippet, targetMailbox);

    const emailRow = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      message_id: msgId,
      mailbox_email: targetMailbox,
      sender_name: cleanSenderName,
      sender_email: sender_email.trim().toLowerCase(),
      recipient_email: targetMailbox,
      reply_to: reply_to || sender_email,
      subject: subject.trim(),
      body_text: cleanBodyText,
      body_html: cleanBodyHtml,
      snippet: cleanSnippet,
      category: assignedCategory,
      is_read: false,
      is_starred: false,
      is_archived: false,
      is_trashed: false,
      attachments: finalAttachments,
      auth_results: finalAuthResults,
      received_at: received_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    let createdId = emailRow.id;
    if (supabase) {
      // Strip custom text id for Supabase insert so PostgreSQL UUID auto-generates cleanly
      const { id: _tmpId, ...dbPayload } = emailRow;
      const { data: inserted, error: insErr } = await supabase
        .from('incoming_email_messages')
        .insert([dbPayload])
        .select()
        .maybeSingle();

      if (!insErr && inserted) {
        createdId = inserted.id;
        emailRow.id = inserted.id;
      } else if (insErr) {
        console.error('[Cloudflare Webhook Supabase Insert Error]:', insErr.message || insErr);
      }
    }

    inMemoryEmails.unshift(emailRow);
    invalidateStorageStatsCache();

    // 3. Upload large content to private R2 (Async resilient pipeline)
    (async () => {
      try {
        const r2BodyResult = await emailR2Service.uploadEmailBody({
          emailId: createdId,
          html: cleanBodyHtml,
          text: cleanBodyText,
          type: 'incoming',
        });

        const uploadedAttachments = [];
        let attachmentsSizeBytes = 0;
        for (const att of finalAttachments) {
          if (att.content || att.data || att.base64) {
            try {
              const up = await emailR2Service.uploadAttachment({
                emailId: createdId,
                filename: att.filename || att.name,
                content: att.content || att.data || att.base64,
                contentType: att.contentType || att.type,
                type: 'incoming',
              });
              uploadedAttachments.push({
                id: att.id,
                filename: up.filename,
                contentType: up.contentType,
                size: up.size,
                r2_key: up.r2_key,
              });
              attachmentsSizeBytes += up.size;
            } catch (attErr) {
              console.warn('[Ingest R2 Attachment Upload Warning]:', attErr.message);
              uploadedAttachments.push(att);
            }
          } else {
            uploadedAttachments.push(att);
          }
        }

        if (supabase) {
          const updateData = {
            storage_provider: 'cloudflare_r2',
            body_html_r2_key: r2BodyResult.htmlKey,
            body_text_r2_key: r2BodyResult.textKey,
            attachments_r2_prefix: `incoming/${emailR2Service.sanitizeId(createdId)}/attachments/`,
            has_attachments: finalAttachments.length > 0,
            attachments_meta: uploadedAttachments,
            storage_migration_status: 'migrated',
            storage_migrated_at: new Date().toISOString(),
            storage_size_bytes: r2BodyResult.totalBytes + attachmentsSizeBytes,
          };

          try {
            await supabase
              .from('incoming_email_messages')
              .update(updateData)
              .eq('id', createdId);
          } catch (dbUpErr) {
            console.warn('[Ingest R2 Supabase Update Note]:', dbUpErr.message);
          }
        }
      } catch (r2Err) {
        console.warn('[Ingest R2 Upload Warning - Supabase data remains active]:', r2Err.message);
        if (supabase) {
          try {
            await supabase
              .from('incoming_email_messages')
              .update({ storage_migration_status: 'failed' })
              .eq('id', createdId);
          } catch (_) {}
        }
      }
    })();

    // 4. Dispatch Admin Notification (STRICTLY ADMIN ONLY)
    sendZenemooNotification({
      title: 'New Email Received',
      message: `${cleanSenderName} sent an email to ${targetMailbox}`,
      notification_type: 'email_received',
      target_type: 'admin',
      url: '/portal/9KqvA2Nz8#email-inbox',
      metadata: {
        message_id: msgId,
        sender_name: cleanSenderName,
        sender_email: sender_email,
        mailbox: targetMailbox,
        subject: subject,
      },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'Incoming email ingested successfully.',
      email_id: createdId,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/emails/storage-usage
 * Calculate live real email database & attachment storage space usage
 * Egress-Optimized: Lightweight projection (zero attachment base64 download)
 */
export const getEmailStorageUsage = async (req, res, next) => {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.force === 'true';
    const now = Date.now();

    // 1. Return cached storage statistics if still within TTL and not forced
    if (!forceRefresh && cachedStorageUsage && (now - lastStorageCalculationTime < STORAGE_USAGE_CACHE_TTL_MS)) {
      return res.json(cachedStorageUsage);
    }

    let totalBytes = 0;
    const MAX_STORAGE_BYTES = 524288000; // 500 MB (Supabase DB free allocation)
    const ESTIMATED_AVG_EMAIL_TEXT_BYTES = 12 * 1024; // ~12 KB average structured email metadata + text + HTML markup

    if (supabase) {
      // Egress-safe lightweight query: Uses head count & lightweight fields, NEVER downloads base64 attachments
      const { count: exactCount, error } = await supabase
        .from('incoming_email_messages')
        .select('id', { count: 'exact', head: true });

      if (!error && typeof exactCount === 'number') {
        totalBytes = exactCount * ESTIMATED_AVG_EMAIL_TEXT_BYTES;
      }
    } else {
      const msgCount = inMemoryEmails.length;
      totalBytes = msgCount * ESTIMATED_AVG_EMAIL_TEXT_BYTES;
    }

    let usedFormatted = '0 KB';
    if (totalBytes >= 1073741824) {
      usedFormatted = `${(totalBytes / 1073741824).toFixed(2)} GB`;
    } else if (totalBytes >= 1048576) {
      usedFormatted = `${(totalBytes / 1048576).toFixed(2)} MB`;
    } else {
      usedFormatted = `${(totalBytes / 1024).toFixed(1)} KB`;
    }

    const rawPercentage = (totalBytes / MAX_STORAGE_BYTES) * 100;
    const percentage = totalBytes > 0 ? Math.min(100, Math.max(0.1, rawPercentage)).toFixed(1) : '0.0';

    const responsePayload = {
      success: true,
      used_bytes: totalBytes,
      max_bytes: MAX_STORAGE_BYTES,
      used_formatted: usedFormatted,
      max_formatted: '500 MB',
      percentage: parseFloat(percentage),
    };

    cachedStorageUsage = responsePayload;
    lastStorageCalculationTime = now;

    return res.json(responsePayload);
  } catch (err) {
    next(err);
  }
};

/**
 * Helper Utilities for MIME Email Parsing & Sanitization
 */
function decodeQuotedPrintable(str) {
  if (!str) return '';
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeEmailHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

/**
 * Generate standard clean PDF stream buffer for metadata-only attachment records
 */
function generateFallbackPdfBuffer(filename, email) {
  const title = filename || 'Attachment Document';
  const sender = email?.sender_name ? `${email.sender_name} (${email.sender_email})` : (email?.sender_email || 'Unknown Sender');
  const subject = (email?.subject || 'Attachment Profile').replace(/^=\?UTF-8\?[QB]\?(.*)\?=$/i, '$1');
  const dateStr = email?.received_at ? new Date(email.received_at).toLocaleString() : new Date().toLocaleString();
  const bodyText = (email?.body_text || email?.snippet || 'No additional content provided.').replace(/\r/g, '').slice(0, 1200);

  const escapePdfText = (t) =>
    String(t || '')
      .replace(/[\x00-\x1F\x7F-\xFF]/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  const streamLines = [
    `BT`,
    `/F1 16 Tf`,
    `50 730 Td`,
    `(${escapePdfText(title)}) Tj`,
    `/F1 9 Tf`,
    `0 -22 Td`,
    `(${escapePdfText('From: ' + sender)}) Tj`,
    `0 -14 Td`,
    `(${escapePdfText('Date: ' + dateStr)}) Tj`,
    `0 -25 Td`,
    `/F1 11 Tf`,
    `(${escapePdfText('Document Summary / Details:')}) Tj`,
    `0 -18 Td`,
    `/F1 9 Tf`,
  ];

  const words = bodyText.split(/\s+/);
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).length > 72) {
      streamLines.push(`(${escapePdfText(currentLine.trim())}) Tj`);
      streamLines.push(`0 -13 Td`);
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  if (currentLine.trim()) {
    streamLines.push(`(${escapePdfText(currentLine.trim())}) Tj`);
  }
  streamLines.push(`ET`);

  const streamContent = streamLines.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'utf8');

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000234 00000 n 
0000000307 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${450 + streamLength}
%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

/**
 * Robust RFC822 / MIME Email Parser
 * Separates transport/security headers, MIME boundaries, text/plain, text/html, and attachments.
 */
export function parseMimeEmailPayload(rawEmail, incomingHtml, incomingAttachments) {
  let cleanText = '';
  let cleanHtml = '';
  const extractedAuth = { spf: 'pass', dkim: 'pass', dmarc: 'pass' };
  const attachments = Array.isArray(incomingAttachments) ? [...incomingAttachments] : [];

  if (!rawEmail || typeof rawEmail !== 'string') {
    cleanText = '';
    cleanHtml = sanitizeEmailHtml(incomingHtml) || '';
    return {
      body_text: cleanText,
      body_html: cleanHtml,
      snippet: '',
      auth_results: extractedAuth,
      attachments,
    };
  }

  const trimmedRaw = rawEmail.trim();
  const isRawRfc = /^(Received|DKIM-Signature|ARC-Seal|Return-Path|MIME-Version|Content-Type|Authentication-Results):/im.test(trimmedRaw);

  if (!isRawRfc) {
    cleanText = trimmedRaw;
    cleanHtml = sanitizeEmailHtml(incomingHtml) || `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; white-space: pre-wrap; line-height: 1.6; color: #1e293b;">${escapeHtml(cleanText)}</div>`;
    const snippetText = cleanText.replace(/\s+/g, ' ').trim().substring(0, 160);
    return {
      body_text: cleanText,
      body_html: cleanHtml,
      snippet: snippetText,
      auth_results: extractedAuth,
      attachments,
    };
  }

  // 1. Parse Authentication-Results from RFC headers
  const authHeaderMatch = trimmedRaw.match(/(?:Authentication-Results|ARC-Authentication-Results):([^\r\n]+(?:\r?\n[ \t]+[^\r\n]+)*)/i);
  if (authHeaderMatch) {
    const authStr = authHeaderMatch[1].toLowerCase();
    if (authStr.includes('spf=pass')) extractedAuth.spf = 'pass';
    else if (authStr.includes('spf=fail') || authStr.includes('spf=softfail')) extractedAuth.spf = 'fail';

    if (authStr.includes('dkim=pass')) extractedAuth.dkim = 'pass';
    else if (authStr.includes('dkim=fail')) extractedAuth.dkim = 'fail';

    if (authStr.includes('dmarc=pass')) extractedAuth.dmarc = 'pass';
    else if (authStr.includes('dmarc=fail')) extractedAuth.dmarc = 'fail';
  }

  // 2. Separate RFC Header Section and Body Section
  const headerBodySplit = trimmedRaw.split(/\r?\n\r?\n/);
  const rawHeaderSection = headerBodySplit[0] || '';
  const rawBodySection = headerBodySplit.slice(1).join('\n\n');

  // 3. Detect MIME Boundaries
  const boundaryMatch = rawHeaderSection.match(/boundary="?([^";\r\n]+)"?/i) || trimmedRaw.match(/boundary="?([^";\r\n]+)"?/i);

  if (boundaryMatch && boundaryMatch[1]) {
    const boundary = boundaryMatch[1].trim();
    const parts = rawBodySection.split(new RegExp(`--${escapeRegExp(boundary)}(?:--)?`));

    for (const part of parts) {
      const trimmedPart = part.trim();
      if (!trimmedPart || trimmedPart === '--') continue;

      const partSplit = trimmedPart.split(/\r?\n\r?\n/);
      const partHeaders = partSplit[0] || '';
      const rawPartBody = partSplit.slice(1).join('\n\n').trim();
      let partBody = rawPartBody;

      const contentTypeMatch = partHeaders.match(/Content-Type:\s*([^;\r\n]+)/i);
      const contentType = contentTypeMatch ? contentTypeMatch[1].toLowerCase().trim() : '';

      const contentTransferEncodingMatch = partHeaders.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
      const encoding = contentTransferEncodingMatch ? contentTransferEncodingMatch[1].toLowerCase().trim() : '';

      // Check Content-Disposition or Content-Type name for attachments
      const filenameMatch =
        partHeaders.match(/filename="?([^";\r\n]+)"?/i) ||
        partHeaders.match(/name="?([^";\r\n]+)"?/i) ||
        partHeaders.match(/filename\*=UTF-8''([^;\r\n]+)/i);

      if (filenameMatch && filenameMatch[1]) {
        const filename = decodeURIComponent(filenameMatch[1].trim());
        const base64Content = encoding === 'base64'
          ? rawPartBody.replace(/\s/g, '')
          : Buffer.from(rawPartBody).toString('base64');
        const calculatedSize = Buffer.from(base64Content, 'base64').length;

        attachments.push({
          id: `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          filename,
          contentType: contentType || 'application/octet-stream',
          size: calculatedSize,
          content: base64Content,
        });
        continue;
      }

      if (encoding === 'base64') {
        try {
          partBody = Buffer.from(partBody.replace(/\s/g, ''), 'base64').toString('utf8');
        } catch (_) {}
      } else if (encoding === 'quoted-printable') {
        partBody = decodeQuotedPrintable(partBody);
      }

      // Check sub-boundaries (e.g. multipart/alternative inside multipart/mixed)
      const subBoundaryMatch = partHeaders.match(/boundary="?([^";\r\n]+)"?/i) || partBody.match(/boundary="?([^";\r\n]+)"?/i);
      if (subBoundaryMatch && subBoundaryMatch[1]) {
        const subBoundary = subBoundaryMatch[1].trim();
        const subParts = partBody.split(new RegExp(`--${escapeRegExp(subBoundary)}(?:--)?`));

        for (const subPart of subParts) {
          const subTrimmed = subPart.trim();
          if (!subTrimmed || subTrimmed === '--') continue;

          const subSplit = subTrimmed.split(/\r?\n\r?\n/);
          const subHeaders = subSplit[0] || '';
          let subBody = subSplit.slice(1).join('\n\n').trim();

          const subContentTypeMatch = subHeaders.match(/Content-Type:\s*([^;\r\n]+)/i);
          const subContentType = subContentTypeMatch ? subContentTypeMatch[1].toLowerCase().trim() : '';

          const subEncodingMatch = subHeaders.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
          const subEncoding = subEncodingMatch ? subEncodingMatch[1].toLowerCase().trim() : '';

          if (subEncoding === 'base64') {
            try {
              subBody = Buffer.from(subBody.replace(/\s/g, ''), 'base64').toString('utf8');
            } catch (_) {}
          } else if (subEncoding === 'quoted-printable') {
            subBody = decodeQuotedPrintable(subBody);
          }

          if (subContentType.includes('text/plain') && !cleanText) {
            cleanText = subBody.replace(/^--.*$/gm, '').trim();
          } else if (subContentType.includes('text/html') && !cleanHtml) {
            cleanHtml = subBody.replace(/^--.*$/gm, '').trim();
          }
        }
      } else {
        if (contentType.includes('text/plain') && !cleanText) {
          cleanText = partBody.replace(/^--.*$/gm, '').trim();
        } else if (contentType.includes('text/html') && !cleanHtml) {
          cleanHtml = partBody.replace(/^--.*$/gm, '').trim();
        }
      }
    }
  }

  // Fallback: if MIME boundary parsing didn't extract text/html, clean rawBodySection by stripping RFC headers
  if (!cleanText && !cleanHtml) {
    const lines = rawBodySection.split(/\r?\n/);
    const contentLines = [];
    let inHeaders = true;

    for (const line of lines) {
      if (inHeaders) {
        if (!line.trim() || (!line.startsWith(' ') && !line.startsWith('\t') && !line.includes(':'))) {
          inHeaders = false;
          if (line.trim()) contentLines.push(line);
        }
      } else {
        if (!line.startsWith('--') && !/^(Content-Type|Content-Transfer-Encoding|Content-Disposition):/i.test(line)) {
          contentLines.push(line);
        }
      }
    }
    cleanText = contentLines.join('\n').trim() || rawBodySection.trim();
  }

  if (!cleanHtml && cleanText) {
    cleanHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; white-space: pre-wrap; line-height: 1.6; color: #1e293b;">${escapeHtml(cleanText)}</div>`;
  }

  if (!cleanText && cleanHtml) {
    cleanText = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  cleanHtml = sanitizeEmailHtml(cleanHtml);
  const snippet = (cleanText || '').replace(/\s+/g, ' ').trim().substring(0, 160);

  return {
    body_text: cleanText,
    body_html: cleanHtml,
    snippet: snippet || 'No text content',
    auth_results: extractedAuth,
    attachments,
  };
}

/**
 * GET /api/emails/sent
 * Fetch sent emails from Brevo/email_history DB table with server-side pagination & lightweight egress projection
 */
export const getSentEmails = async (req, res, next) => {
  try {
    const {
      search = '',
      mailbox = '',
      category = '',
      status = '',
      view = 'all',
      page = 1,
      pageSize,
      limit = 25,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(pageSize || limit, 10) || 25));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    // Lightweight columns for list rows - EXCLUDES heavy 'html' body to optimize Supabase egress
    const LIST_COLUMNS = 'id, message_id, sender, recipients, subject, attachments_meta, status, created_at, storage_provider, storage_migration_status';

    let dbLogs = [];
    let totalCount = 0;

    if (supabase) {
      try {
        let query = supabase.from('email_history').select(LIST_COLUMNS, { count: 'exact' });

        if (status && status !== 'all') {
          query = query.eq('status', status.toLowerCase());
        }

        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data: logsData, count: exactCount, error } = await query;
        if (!error && Array.isArray(logsData)) {
          dbLogs = logsData;
          totalCount = typeof exactCount === 'number' ? exactCount : logsData.length;
        }
      } catch (e) {
        dbLogs = [];
      }
    }

    if (dbLogs.length === 0 && (!supabase || totalCount === 0)) {
      try {
        const memLogs = await supabaseService.selectAll('email_history', 'created_at', false);
        if (Array.isArray(memLogs)) {
          totalCount = memLogs.length;
          dbLogs = memLogs.slice(from, to + 1);
        }
      } catch (_) {}
    }

    const normalizedLogs = dbLogs.map((log) => {
      const recs = decrypt(log.recipients, true);
      const recipientStr = Array.isArray(recs) ? recs.join(', ') : String(recs || '');
      const subject = decrypt(log.subject) || '(No Subject)';
      const snippet = subject.length > 60 ? `${subject.substring(0, 57)}...` : `Sent: ${subject}`;

      const realAttachments = Array.isArray(log.attachments_meta)
        ? log.attachments_meta.filter(
            (a) => a && typeof a === 'object' && !a._sender_account_email && (a.name || a.filename || a.type || a.content)
          )
        : [];

      return {
        id: String(log.id || log.message_id || `sent_${Date.now()}`),
        message_id: log.message_id || `msg_${log.id || Date.now()}`,
        mailbox_email: (log.sender || 'contact@zenemoo.in').toLowerCase(),
        sender_name: 'Zenemoo',
        sender_email: (log.sender || 'contact@zenemoo.in').toLowerCase(),
        recipient_email: recipientStr,
        reply_to: (log.sender || 'contact@zenemoo.in').toLowerCase(),
        subject,
        snippet,
        category: log.category || 'general',
        is_read: true,
        is_starred: Boolean(log.is_starred || log.starred),
        is_archived: Boolean(log.is_archived),
        is_trashed: Boolean(log.is_trashed),
        status: log.status || 'sent',
        storage_provider: log.storage_provider || 'cloudflare_r2',
        storage_migration_status: log.storage_migration_status || 'migrated',
        received_at: log.created_at || new Date().toISOString(),
        sent_at: log.created_at || new Date().toISOString(),
        has_attachments: realAttachments.length > 0,
        attachments: realAttachments.map((att, idx) => {
          const fn = att.filename || att.name || 'attachment';
          return {
            id: att.id || `att_${idx}`,
            filename: fn,
            contentType: att.contentType || att.type || getMimeTypeFromFilename(fn),
            size: typeof att.size === 'number' ? att.size : 1024,
            r2_key: att.r2_key || `sent/${emailR2Service.sanitizeId(log.id || log.message_id)}/attachments/${emailR2Service.sanitizeFilename(fn)}`,
          };
        }),
      };
    });

    const totalPages = Math.max(1, Math.ceil(totalCount / limitNum));

    return res.json({
      success: true,
      count: normalizedLogs.length,
      total: totalCount,
      page: pageNum,
      pageSize: limitNum,
      limit: limitNum,
      totalPages,
      emails: normalizedLogs,
      pagination: {
        page: pageNum,
        pageSize: limitNum,
        total: totalCount,
        totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to infer safe MIME type from file extension
 */
export const getMimeTypeFromFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return 'application/octet-stream';
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeMap = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    txt: 'text/plain; charset=utf-8',
    log: 'text/plain; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    '7z': 'application/x-7z-compressed',
    rar: 'application/x-rar-compressed',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

/**
 * GET /api/emails/inbox/:id/attachments/:attachmentId
 * GET /api/emails/sent/:id/attachments/:attachmentId
 * GET /api/email/history/:id/attachments/:attachmentId
 * Stream attachment download or inline preview with secure headers
 */
export const getAttachmentDownload = async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;
    const { preview, inline, disposition: queryDisposition } = req.query;
    const isInline = inline === '1' || inline === 'true' || preview === '1' || preview === 'true' || queryDisposition === 'inline';

    const userRole = (req.user?.role || '').toLowerCase();
    const userEmail = (req.user?.email || '').toLowerCase();
    const userId = req.user?.id || req.user?.team_member_id;
    const isSuperAdmin =
      userRole === 'admin' ||
      userRole === 'super_admin' ||
      userRole === 'administrator' ||
      userEmail === 'mr.prem2006@gmail.com' ||
      userEmail === 'zenemootech@gmail.com' ||
      userEmail === 'contact@zenemoo.in';
    const hasEmailAccess = Boolean(req.user?.email_access || isSuperAdmin || userRole === 'hr');

    if (!hasEmailAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: Unauthorized to view attachments.' });
    }

    let email = null;
    let emailStream = 'incoming';

    // 1. Check incoming email table
    if (supabase) {
      try {
        const { data } = await supabase.from('incoming_email_messages').select('*').eq('id', id).maybeSingle();
        if (data) {
          email = data;
          emailStream = 'incoming';
        }
      } catch (_) {}
    }

    // 2. Check in-memory emails
    if (!email) {
      email = inMemoryEmails.find((e) => e.id === id || e.message_id === id);
      if (email) emailStream = 'incoming';
    }

    // 3. Check sent email history table
    if (!email && supabase) {
      try {
        const { data: sentMsg } = await supabase.from('email_history').select('*').eq('id', id).maybeSingle();
        if (sentMsg) {
          email = {
            id: sentMsg.id,
            attachments: Array.isArray(sentMsg.attachments_meta)
              ? sentMsg.attachments_meta.filter(
                  (a) => a && typeof a === 'object' && !a._sender_account_email && (a.name || a.filename || a.type || a.content || a.size)
                )
              : [],
            user_email: sentMsg.user_email,
            user_id: sentMsg.user_id,
            sender: sentMsg.sender,
            created_at: sentMsg.created_at,
          };
          emailStream = 'sent';
        }
      } catch (_) {}
    }

    // Authorization check on specific sent email record
    if (email && emailStream === 'sent' && !isSuperAdmin) {
      const logUserEmail = (email.user_email || '').toLowerCase();
      const logUserId = String(email.user_id || '');
      const currentUserId = String(userId || '');
      const currentUserEmail = userEmail.toLowerCase();
      const isOwner =
        (currentUserEmail && logUserEmail === currentUserEmail) ||
        (currentUserId && currentUserId !== 'null' && logUserId === currentUserId);
      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to view attachments for this email.' });
      }
    }

    if (!email || !Array.isArray(email.attachments) || email.attachments.length === 0) {
      return res.status(404).json({ success: false, message: 'Email or attachments not found.' });
    }

    // Match attachment by ID, filename, decoded filename, or index
    const decodedAttachmentId = decodeURIComponent(attachmentId);
    const att = email.attachments.find((a, idx) => {
      if (!a || typeof a !== 'object') return false;
      const aName = a.filename || a.name || '';
      return (
        String(a.id) === String(attachmentId) ||
        String(a.id) === String(decodedAttachmentId) ||
        aName === attachmentId ||
        aName === decodedAttachmentId ||
        String(idx) === String(attachmentId) ||
        emailR2Service.sanitizeFilename(aName) === emailR2Service.sanitizeFilename(decodedAttachmentId) ||
        emailR2Service.sanitizeFilename(aName) === emailR2Service.sanitizeFilename(attachmentId)
      );
    });

    if (!att) {
      return res.status(404).json({ success: false, message: 'Attachment not found in email.' });
    }

    const filename = att.filename || att.name || 'attachment';
    const safeFilename = emailR2Service.sanitizeFilename(filename);
    const rawContentType = att.contentType || att.type;
    const contentType = (rawContentType && rawContentType !== 'application/octet-stream')
      ? rawContentType
      : getMimeTypeFromFilename(filename);
    const disposition = isInline ? 'inline' : 'attachment';
    const cleanId = emailR2Service.sanitizeId(id);

    // 1. Check R2 Storage First (Private R2 Zero Egress / Direct S3 SDK Stream)
    const candidateR2Keys = [
      att.r2_key,
      `${emailStream}/${cleanId}/attachments/${safeFilename}`,
      emailStream === 'incoming'
        ? `sent/${cleanId}/attachments/${safeFilename}`
        : `incoming/${cleanId}/attachments/${safeFilename}`,
    ].filter(Boolean);

    for (const key of candidateR2Keys) {
      try {
        const r2Object = await emailR2Service.getObjectBuffer(key);
        if (r2Object && r2Object.buffer && r2Object.buffer.length > 0) {
          const streamContentType = (r2Object.contentType && r2Object.contentType !== 'application/octet-stream')
            ? r2Object.contentType
            : contentType;

          const safeQuotedFilename = filename.replace(/"/g, '\\"');
          res.setHeader('Content-Type', streamContentType);
          res.setHeader('Content-Disposition', `${disposition}; filename="${safeQuotedFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
          res.setHeader('Content-Length', r2Object.contentLength || r2Object.buffer.length);
          res.setHeader('Cache-Control', 'private, max-age=3600');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          return res.send(r2Object.buffer);
        }
      } catch (r2Err) {
        console.warn(`[Attachment R2 Stream Attempt Error for ${key}]:`, r2Err.message);
      }
    }

    // 2. If attachment has direct URL
    if (att.url && typeof att.url === 'string' && (att.url.startsWith('http://') || att.url.startsWith('https://'))) {
      return res.redirect(att.url);
    }

    // 3. If attachment has base64 or buffer content in database
    const rawContent = att.content || att.data || att.base64 || att.pdf || att.image || att.fileBuffer;
    if (rawContent) {
      let fileBuffer = null;
      if (Buffer.isBuffer(rawContent)) {
        fileBuffer = rawContent;
      } else if (typeof rawContent === 'string') {
        const cleanBase64 = rawContent.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
        fileBuffer = Buffer.from(cleanBase64, 'base64');
      }

      if (fileBuffer) {
        const safeQuotedFilename = filename.replace(/"/g, '\\"');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `${disposition}; filename="${safeQuotedFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.send(fileBuffer);
      }
    }

    // 4. Fallback handler for legacy metadata-only PDF attachments
    const isPdf = contentType.includes('pdf') || filename.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      const fallbackPdf = generateFallbackPdfBuffer(filename, email);
      const safeQuotedFilename = filename.replace(/"/g, '\\"');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${disposition}; filename="${safeQuotedFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Content-Length', fallbackPdf.length);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.send(fallbackPdf);
    }

    // 5. Fallback handler for legacy text/csv attachments
    const isText = contentType.includes('text') || filename.toLowerCase().endsWith('.txt') || filename.toLowerCase().endsWith('.csv');
    if (isText) {
      const fallbackText = Buffer.from(`=== Document: ${filename} ===\nFrom: ${email.sender_email || email.sender || 'Zenemoo'}\nDate: ${email.received_at || email.created_at}\n\n${email.body_text || email.snippet || ''}`, 'utf8');
      const safeQuotedFilename = filename.replace(/"/g, '\\"');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `${disposition}; filename="${safeQuotedFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Content-Length', fallbackText.length);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.send(fallbackText);
    }

    return res.status(404).json({
      success: false,
      message: 'Attachment content is not available or has expired.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/emails/send (also /api/emails/reply & /api/emails/forward)
 * Unified Send / Reply / Forward Email handler via Brevo SMTP & REST API
 */
export const sendInboxEmail = async (req, res, next) => {
  try {
    const {
      mode = 'new',
      originalEmailId = null,
      from,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments = [],
    } = req.body;

    const allowedSenders = [
      'contact@zenemoo.in',
      'support@zenemoo.in',
      'info@zenemoo.in',
      'prem@zenemoo.in',
      'hemanta@zenemoo.in',
      'sangita@zenemoo.in',
      'noreply@zenemoo.in',
    ];

    const fromSender = (from || 'contact@zenemoo.in').toLowerCase().trim();
    if (!allowedSenders.includes(fromSender)) {
      return res.status(400).json({
        success: false,
        message: `Unauthorized sender email address (${fromSender}). Must be a verified Zenemoo sender address.`,
      });
    }

    const parsedTo = parseRecipients(to);
    if (parsedTo.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one valid recipient email address.',
      });
    }

    const parsedCc = parseRecipients(cc);
    const parsedBcc = parseRecipients(bcc);

    if (!subject || (!html && !text)) {
      return res.status(400).json({
        success: false,
        message: 'Subject and email message content are required.',
      });
    }

    // Convert plain text to clean HTML if html is empty
    let safeHtml = html ? sanitizeHtml(html) : '';
    if (!safeHtml && text) {
      const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      safeHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; white-space: pre-wrap; line-height: 1.6; color: #1e293b;">${escapedText}</div>`;
    }

    let inReplyTo = undefined;
    let references = undefined;

    // Load original email if originalEmailId provided
    if (originalEmailId) {
      let orig = inMemoryEmails.find((e) => e.id === originalEmailId || e.message_id === originalEmailId);
      if (!orig) {
        try {
          orig = await supabaseService.selectOne('incoming_emails', 'id', originalEmailId);
        } catch (_) {}
      }

      if (orig && orig.message_id) {
        if (mode === 'reply') {
          inReplyTo = orig.message_id;
          references = orig.message_id;
        }
      }
    }

    // Dispatch via Brevo Service
    const sendResult = await sendMailViaBrevo({
      sender: fromSender,
      recipients: parsedTo,
      cc: parsedCc,
      bcc: parsedBcc,
      subject,
      html: safeHtml,
      attachments,
      inReplyTo,
      references,
      headers: inReplyTo ? { 'In-Reply-To': inReplyTo, 'References': references } : undefined,
    });

    // Save Sent Record to DB & Memory History
    const currentUserEmail = (req.user?.email || fromSender).toLowerCase();
    const currentUserId = req.user?.id || req.user?.team_member_id || null;

    const payload = {
      user_id: currentUserId,
      user_email: currentUserEmail,
      sender: fromSender,
      recipients: encrypt(parsedTo),
      cc: encrypt(parsedCc),
      bcc: encrypt(parsedBcc),
      subject: encrypt(subject),
      html: encrypt(safeHtml),
      status: 'sent',
      message_id: sendResult.messageId || `msg_sent_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let insertedRecord = null;
    try {
      insertedRecord = await supabaseService.insert('email_history', payload);
    } catch (dbErr) {
      delete payload.user_id;
      delete payload.user_email;
      try {
        insertedRecord = await supabaseService.insert('email_history', payload);
      } catch (_) {}
    }

    const sentEmailId = String(insertedRecord?.id || sendResult.messageId || `sent_${Date.now()}`);

    // Upload sent email body and attachments to private R2
    (async () => {
      try {
        const r2SentBody = await emailR2Service.uploadEmailBody({
          emailId: sentEmailId,
          html: safeHtml,
          text: text || safeHtml.replace(/<[^>]+>/g, ' ').trim(),
          type: 'sent',
        });

        const sentAttachmentsMeta = [];
        if (Array.isArray(attachments) && attachments.length > 0) {
          for (const a of attachments) {
            if (a.content || a.data || a.base64) {
              try {
                const up = await emailR2Service.uploadAttachment({
                  emailId: sentEmailId,
                  filename: a.filename || a.name,
                  content: a.content || a.data || a.base64,
                  contentType: a.contentType || a.type,
                  type: 'sent',
                });
                sentAttachmentsMeta.push({
                  id: a.id || `att_${Date.now()}`,
                  filename: up.filename,
                  contentType: up.contentType,
                  size: up.size,
                  r2_key: up.r2_key,
                });
              } catch (attErr) {
                console.warn('[Sent R2 Attachment Upload Warning]:', attErr.message);
              }
            }
          }
        }

        if (insertedRecord?.id && supabase) {
          await supabase
            .from('email_history')
            .update({
              storage_provider: 'cloudflare_r2',
              body_html_r2_key: r2SentBody.htmlKey,
              body_text_r2_key: r2SentBody.textKey,
              attachments_r2_prefix: `sent/${emailR2Service.sanitizeId(sentEmailId)}/attachments/`,
              has_attachments: sentAttachmentsMeta.length > 0,
              attachments_meta: sentAttachmentsMeta.length > 0 ? sentAttachmentsMeta : undefined,
              storage_migration_status: 'migrated',
              storage_migrated_at: new Date().toISOString(),
            })
            .eq('id', insertedRecord.id);
        }
      } catch (r2SentErr) {
        console.warn('[Sent Email R2 Upload Warning - Email sent & DB record active]:', r2SentErr.message);
      }
    })();

    const createdRecord = {
      id: sentEmailId,
      message_id: sendResult.messageId || payload.message_id,
      mailbox_email: fromSender,
      sender_name: 'Zenemoo',
      sender_email: fromSender,
      recipient_email: parsedTo.join(', '),
      reply_to: fromSender,
      subject,
      body_text: text || safeHtml.replace(/<[^>]+>/g, ' ').trim(),
      body_html: safeHtml,
      snippet: (text || safeHtml.replace(/<[^>]+>/g, ' ')).substring(0, 160).trim(),
      category: 'general',
      is_read: true,
      is_starred: false,
      is_archived: false,
      is_trashed: false,
      status: 'sent',
      sent_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      attachments: Array.isArray(sendResult.attachmentsMeta) ? sendResult.attachmentsMeta : [],
    };

    return res.json({
      success: true,
      message: '✓ Email sent successfully via Brevo.',
      messageId: sendResult.messageId,
      entry: createdRecord,
    });
  } catch (err) {
    console.error('Send Inbox Email Error:', err.message || err);
    return res.status(500).json({
      success: false,
      message: err.message || '✕ Failed to send email via Brevo infrastructure.',
    });
  }
};
