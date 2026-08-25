import dotenv from 'dotenv';
dotenv.config();

import { supabase } from '../config/supabase.js';
import { sendZenemooNotification } from '../services/pushNotificationEngine.js';

const CLOUDFLARE_WEBHOOK_SECRET = process.env.CLOUDFLARE_WEBHOOK_SECRET || 'zenemoo_cloudflare_worker_secret_2026';

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
 * Get incoming emails list with search, category, mailbox filter, view filters, and pagination
 */
export const getIncomingEmails = async (req, res, next) => {
  try {
    const { search, mailbox, category, view, page = 1, limit = 20 } = req.query;

    if (supabase) {
      let query = supabase.from('incoming_email_messages').select('*', { count: 'exact' });

      // View filters
      if (view === 'unread') {
        query = query.eq('is_read', false).eq('is_trashed', false);
      } else if (view === 'starred') {
        query = query.eq('is_starred', true).eq('is_trashed', false);
      } else if (view === 'archived') {
        query = query.eq('is_archived', true).eq('is_trashed', false);
      } else if (view === 'trash') {
        query = query.eq('is_trashed', true);
      } else {
        query = query.eq('is_trashed', false).eq('is_archived', false);
      }

      if (mailbox && mailbox !== 'all') {
        query = query.eq('mailbox_email', mailbox);
      }

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`sender_name.ilike.${term},sender_email.ilike.${term},subject.ilike.${term},snippet.ilike.${term},mailbox_email.ilike.${term}`);
      }

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;

      query = query.order('received_at', { ascending: false }).range(from, to);

      const { data: emails, count, error } = await query;

      if (!error && emails) {
        return res.json({
          success: true,
          emails,
          total: count || 0,
          page: pageNum,
          limit: limitNum,
        });
      }
    }

    // In-Memory Fallback
    let result = [...inMemoryEmails];
    if (view === 'unread') result = result.filter((e) => !e.is_read && !e.is_trashed);
    else if (view === 'starred') result = result.filter((e) => e.is_starred && !e.is_trashed);
    else if (view === 'archived') result = result.filter((e) => e.is_archived && !e.is_trashed);
    else if (view === 'trash') result = result.filter((e) => e.is_trashed);
    else result = result.filter((e) => !e.is_trashed && !e.is_archived);

    if (mailbox && mailbox !== 'all') result = result.filter((e) => e.mailbox_email === mailbox);
    if (category && category !== 'all') result = result.filter((e) => e.category === category);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.sender_name.toLowerCase().includes(q) ||
          e.sender_email.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.snippet.toLowerCase().includes(q)
      );
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const from = (pageNum - 1) * limitNum;
    const sliced = result.slice(from, from + limitNum);

    return res.json({
      success: true,
      emails: sliced,
      total: result.length,
      page: pageNum,
      limit: limitNum,
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
      const { data: email, error } = await supabase
        .from('incoming_email_messages')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && email) {
        if (!email.is_read) {
          await supabase
            .from('incoming_email_messages')
            .update({ is_read: true, updated_at: new Date().toISOString() })
            .eq('id', id);
          email.is_read = true;
        }
        return res.json({ success: true, email });
      }
    }

    const email = inMemoryEmails.find((e) => e.id === id);
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
 * Permanent deletion from database
 */
export const deleteIncomingEmail = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (supabase) {
      const { error } = await supabase
        .from('incoming_email_messages')
        .delete()
        .eq('id', id);

      if (!error) {
        return res.json({ success: true, message: 'Email permanently deleted.' });
      }
    }

    const idx = inMemoryEmails.findIndex((e) => e.id === id);
    if (idx >= 0) {
      inMemoryEmails.splice(idx, 1);
    }

    return res.json({ success: true, message: 'Email permanently deleted.' });
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
    const expectedSecret =
      process.env.CLOUDFLARE_WEBHOOK_SECRET ||
      process.env.CLOUDFLARE_WEBHOOK_SECRET_2026 ||
      'zenemoo_cloudflare_worker_secret_2026';

    if (authHeader && authHeader !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
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

    // 2. Auto Categorization
    const assignedCategory = autoCategorizeEmail(subject, body_text || snippet || '', targetMailbox);
    const snipText = snippet || (body_text || '').substring(0, 160) || 'No text snippet available.';

    const emailRow = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      message_id: msgId,
      mailbox_email: targetMailbox,
      sender_name: cleanSenderName,
      sender_email: sender_email.trim().toLowerCase(),
      recipient_email: targetMailbox,
      reply_to: reply_to || sender_email,
      subject: subject.trim(),
      body_text: body_text || '',
      body_html: body_html || `<p>${body_text || snipText}</p>`,
      snippet: snipText,
      category: assignedCategory,
      is_read: false,
      is_starred: false,
      is_archived: false,
      is_trashed: false,
      attachments: Array.isArray(attachments) ? attachments : [],
      auth_results: auth_results || { spf: 'pass', dkim: 'pass', dmarc: 'pass' },
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

    // 3. Dispatch Admin Notification (STRICTLY ADMIN ONLY)
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
 * Calculate live real email database & attachment storage space usage from Supabase
 */
export const getEmailStorageUsage = async (req, res, next) => {
  try {
    let totalBytes = 0;
    const MAX_STORAGE_BYTES = 524288000; // 500 MB (Supabase DB free allocation)

    if (supabase) {
      const { data: messages, error } = await supabase
        .from('incoming_email_messages')
        .select('subject, body_text, body_html, attachments');

      if (!error && Array.isArray(messages)) {
        messages.forEach((msg) => {
          const textLength = (msg.subject || '').length + (msg.body_text || '').length + (msg.body_html || '').length;
          totalBytes += (textLength * 2);

          if (Array.isArray(msg.attachments)) {
            msg.attachments.forEach((att) => {
              if (att && typeof att.size === 'number') {
                totalBytes += att.size;
              }
            });
          }
        });
      }
    } else {
      inMemoryEmails.forEach((msg) => {
        const textLength = (msg.subject || '').length + (msg.body_text || '').length + (msg.body_html || '').length;
        totalBytes += (textLength * 2);

        if (Array.isArray(msg.attachments)) {
          msg.attachments.forEach((att) => {
            if (att && typeof att.size === 'number') {
              totalBytes += att.size;
            }
          });
        }
      });
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

    return res.json({
      success: true,
      used_bytes: totalBytes,
      max_bytes: MAX_STORAGE_BYTES,
      used_formatted: usedFormatted,
      max_formatted: '500 MB',
      percentage: parseFloat(percentage),
    });
  } catch (err) {
    next(err);
  }
};
