import { supabaseService } from '../services/supabaseService.js';
import {
  sendMailViaBrevo,
  parseRecipients,
  validateEmail,
  sanitizeHtml,
} from '../services/emailService.js';
import { encrypt, decrypt } from '../services/encryptionService.js';
import { runScheduledEmailProcessorTick } from '../services/scheduledEmailWorker.js';

// In-memory fallback cache for high-resiliency background processing
export const memoryScheduledEmails = [];

/**
 * POST /api/emails/scheduled/process — Cloudflare Cron Webhook Endpoint
 * Secret Header: x-zenemoo-scheduler-secret
 */
export const processScheduledEmailsEndpoint = async (req, res, next) => {
  try {
    const providedSecret =
      req.headers['x-zenemoo-scheduler-secret'] ||
      req.headers['x-scheduler-secret'] ||
      req.headers['authorization'];

    const expectedSecret =
      process.env.ZENEMOO_SCHEDULER_SECRET ||
      process.env.CLOUDFLARE_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error('❌ [Scheduled Email Endpoint] ZENEMOO_SCHEDULER_SECRET environment variable is not configured on server.');
      return res.status(500).json({
        success: false,
        message: 'Server Configuration Error: ZENEMOO_SCHEDULER_SECRET environment variable is not configured on backend server.',
      });
    }

    const cleanProvided = providedSecret ? String(providedSecret).replace(/^Bearer\s+/i, '').trim() : '';
    const cleanExpected = String(expectedSecret).trim();

    if (!cleanProvided || cleanProvided !== cleanExpected) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing x-zenemoo-scheduler-secret header.',
      });
    }

    console.log(`⚡ [Scheduled Email Endpoint] Triggered by Cloudflare Cron at ${new Date().toISOString()}`);
    const stats = await runScheduledEmailProcessorTick();

    return res.json({
      success: true,
      message: 'Cloudflare cron scheduled email processor execution completed.',
      source: req.body?.source || 'cloudflare-cron',
      timestamp: new Date().toISOString(),
      ...stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to normalize scheduled email record for response
 */
const normalizeScheduledRecord = (rec) => {
  if (!rec) return null;
  
  let decryptedTo = rec.to_emails || rec.recipients || [];
  if (typeof decryptedTo === 'string' && (decryptedTo.startsWith('enc_') || decryptedTo.length > 30)) {
    try { decryptedTo = decrypt(decryptedTo); } catch (_) {}
  }
  if (typeof decryptedTo === 'string') {
    decryptedTo = parseRecipients(decryptedTo);
  }

  let decryptedCc = rec.cc_emails || rec.cc || [];
  if (typeof decryptedCc === 'string' && (decryptedCc.startsWith('enc_') || decryptedCc.length > 30)) {
    try { decryptedCc = decrypt(decryptedCc); } catch (_) {}
  }
  if (typeof decryptedCc === 'string') {
    decryptedCc = parseRecipients(decryptedCc);
  }

  let decryptedBcc = rec.bcc_emails || rec.bcc || [];
  if (typeof decryptedBcc === 'string' && (decryptedBcc.startsWith('enc_') || decryptedBcc.length > 30)) {
    try { decryptedBcc = decrypt(decryptedBcc); } catch (_) {}
  }
  if (typeof decryptedBcc === 'string') {
    decryptedBcc = parseRecipients(decryptedBcc);
  }

  let decryptedSubject = rec.subject || '';
  if (typeof decryptedSubject === 'string' && (decryptedSubject.startsWith('enc_') || decryptedSubject.length > 30)) {
    try { decryptedSubject = decrypt(decryptedSubject); } catch (_) {}
  }

  let decryptedHtml = rec.body_html || rec.html || '';
  if (typeof decryptedHtml === 'string' && (decryptedHtml.startsWith('enc_') || decryptedHtml.length > 30)) {
    try { decryptedHtml = decrypt(decryptedHtml); } catch (_) {}
  }

  return {
    id: String(rec.id),
    from_email: rec.from_email || rec.sender || 'contact@zenemoo.in',
    to_emails: Array.isArray(decryptedTo) ? decryptedTo : parseRecipients(decryptedTo),
    cc_emails: Array.isArray(decryptedCc) ? decryptedCc : parseRecipients(decryptedCc),
    bcc_emails: Array.isArray(decryptedBcc) ? decryptedBcc : parseRecipients(decryptedBcc),
    subject: decryptedSubject,
    body_html: decryptedHtml,
    body_text: rec.body_text || '',
    attachments: rec.attachments || [],
    scheduled_at: rec.scheduled_at,
    timezone: rec.timezone || 'Asia/Kolkata',
    status: rec.status || 'scheduled',
    created_at: rec.created_at || new Date().toISOString(),
    updated_at: rec.updated_at || new Date().toISOString(),
    sent_at: rec.sent_at || null,
    provider_message_id: rec.provider_message_id || rec.message_id || null,
    failure_reason: rec.failure_reason || null,
  };
};

/**
 * POST /api/emails/scheduled — Schedule a new email
 */
export const createScheduledEmail = async (req, res, next) => {
  try {
    const {
      sender,
      from,
      recipients,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments = [],
      scheduled_at,
      timezone = 'Asia/Kolkata',
    } = req.body;

    const fromEmail = sender || from || 'contact@zenemoo.in';
    const targetRecipients = recipients || to;

    if (!targetRecipients || !subject || (!html && !text)) {
      return res.status(400).json({
        success: false,
        message: 'Recipients, subject, and email message content are required to schedule an email.',
      });
    }

    const parsedTo = parseRecipients(targetRecipients);
    if (parsedTo.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please specify at least one valid recipient email address.',
      });
    }

    if (!scheduled_at) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid scheduled date and time.',
      });
    }

    const scheduledDate = new Date(scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduled date format.',
      });
    }

    const now = new Date();
    // 5 seconds buffer threshold
    if (scheduledDate.getTime() <= now.getTime() - 5000) {
      return res.status(400).json({
        success: false,
        message: 'Please choose a future date and time.',
      });
    }

    let safeHtml = html ? sanitizeHtml(html) : '';
    if (!safeHtml && text) {
      const escapedText = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      safeHtml = `<div style="font-family: system-ui, -apple-system, sans-serif; white-space: pre-wrap; line-height: 1.6; color: #1e293b;">${escapedText}</div>`;
    }

    const currentUserId = req.user?.id || req.user?.team_member_id || null;
    const currentUserEmail = (req.user?.email || fromEmail).toLowerCase();

    const recordId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newRecord = {
      id: recordId,
      user_id: currentUserId,
      user_email: currentUserEmail,
      from_email: fromEmail,
      to_emails: parsedTo,
      cc_emails: parseRecipients(cc),
      bcc_emails: parseRecipients(bcc),
      subject,
      body_html: safeHtml,
      body_text: text || '',
      attachments: attachments || [],
      scheduled_at: scheduledDate.toISOString(),
      timezone,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Try saving into Supabase scheduled_emails table
    try {
      const dbPayload = {
        ...newRecord,
        to_emails: encrypt(parsedTo),
        cc_emails: encrypt(parseRecipients(cc)),
        bcc_emails: encrypt(parseRecipients(bcc)),
        subject: encrypt(subject),
        body_html: encrypt(safeHtml),
      };
      await supabaseService.insert('scheduled_emails', dbPayload);
    } catch (dbErr) {
      console.warn('Supabase scheduled_emails insert fallback to memory:', dbErr.message);
    }

    memoryScheduledEmails.unshift(newRecord);

    return res.status(201).json({
      success: true,
      message: 'Email scheduled successfully.',
      entry: normalizeScheduledRecord(newRecord),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/emails/scheduled — List scheduled emails
 */
export const getScheduledEmails = async (req, res, next) => {
  try {
    const { status = 'scheduled' } = req.query;

    let items = [];
    try {
      const dbItems = await supabaseService.selectAll('scheduled_emails', 'scheduled_at', true);
      items = (dbItems || []).map(normalizeScheduledRecord);
    } catch (_) {
      items = memoryScheduledEmails.map(normalizeScheduledRecord);
    }

    // Merge memory items with DB items avoiding duplicates
    const dbIds = new Set(items.map((i) => i.id));
    memoryScheduledEmails.forEach((memItem) => {
      if (!dbIds.has(memItem.id)) {
        items.push(normalizeScheduledRecord(memItem));
      }
    });

    if (status && status !== 'all') {
      items = items.filter((i) => i.status === status);
    }

    // Sort soonest scheduled first
    items.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    return res.json({
      success: true,
      count: items.length,
      scheduled: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/emails/scheduled/:id — Get single scheduled email
 */
export const getScheduledEmailById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let record = memoryScheduledEmails.find((item) => item.id === id);

    if (!record) {
      try {
        record = await supabaseService.selectById('scheduled_emails', id);
      } catch (_) {}
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Scheduled email record not found.' });
    }

    return res.json({
      success: true,
      entry: normalizeScheduledRecord(record),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/emails/scheduled/:id — Edit a scheduled email
 */
export const updateScheduledEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      sender,
      from,
      recipients,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments,
      scheduled_at,
      timezone,
    } = req.body;

    let target = memoryScheduledEmails.find((i) => i.id === id);

    if (!target) {
      try {
        const dbRec = await supabaseService.selectById('scheduled_emails', id);
        if (dbRec) target = normalizeScheduledRecord(dbRec);
      } catch (_) {}
    }

    if (!target) {
      return res.status(404).json({ success: false, message: 'Scheduled email not found.' });
    }

    if (target.status === 'sent') {
      return res.status(400).json({ success: false, message: 'Cannot edit an email that has already been sent.' });
    }

    if (scheduled_at) {
      const scheduledDate = new Date(scheduled_at);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid scheduled date format.' });
      }
      if (scheduledDate.getTime() <= Date.now() - 5000) {
        return res.status(400).json({ success: false, message: 'Please choose a future date and time.' });
      }
      target.scheduled_at = scheduledDate.toISOString();
    }

    if (sender || from) target.from_email = sender || from;
    if (recipients || to) target.to_emails = parseRecipients(recipients || to);
    if (cc !== undefined) target.cc_emails = parseRecipients(cc);
    if (bcc !== undefined) target.bcc_emails = parseRecipients(bcc);
    if (subject !== undefined) target.subject = subject;
    if (html !== undefined) target.body_html = sanitizeHtml(html);
    if (text !== undefined) target.body_text = text;
    if (attachments !== undefined) target.attachments = attachments;
    if (timezone) target.timezone = timezone;

    target.status = 'scheduled'; // Reset status to scheduled if it was failed/cancelled
    target.failure_reason = null;
    target.updated_at = new Date().toISOString();

    // Update DB
    try {
      const dbUpdatePayload = {
        from_email: target.from_email,
        to_emails: encrypt(target.to_emails),
        cc_emails: encrypt(target.cc_emails),
        bcc_emails: encrypt(target.bcc_emails),
        subject: encrypt(target.subject),
        body_html: encrypt(target.body_html),
        body_text: target.body_text,
        attachments: target.attachments,
        scheduled_at: target.scheduled_at,
        timezone: target.timezone,
        status: 'scheduled',
        failure_reason: null,
        updated_at: target.updated_at,
      };
      await supabaseService.update('scheduled_emails', id, dbUpdatePayload);
    } catch (dbErr) {
      console.warn('Supabase scheduled_emails update fallback to memory:', dbErr.message);
    }

    return res.json({
      success: true,
      message: 'Scheduled email updated successfully.',
      entry: normalizeScheduledRecord(target),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/emails/scheduled/:id/cancel — Cancel a scheduled email
 */
export const cancelScheduledEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    let target = memoryScheduledEmails.find((i) => i.id === id);

    if (!target) {
      try {
        const dbRec = await supabaseService.selectById('scheduled_emails', id);
        if (dbRec) target = normalizeScheduledRecord(dbRec);
      } catch (_) {}
    }

    if (!target) {
      return res.status(404).json({ success: false, message: 'Scheduled email not found.' });
    }

    if (target.status === 'sent') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an email that has already been sent.' });
    }

    target.status = 'cancelled';
    target.updated_at = new Date().toISOString();

    try {
      await supabaseService.update('scheduled_emails', id, { status: 'cancelled', updated_at: target.updated_at });
    } catch (_) {}

    return res.json({
      success: true,
      message: 'Scheduled email cancelled successfully.',
      entry: normalizeScheduledRecord(target),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/emails/scheduled/:id/retry — Retry a failed scheduled email
 */
export const retryScheduledEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scheduled_at } = req.body;

    let target = memoryScheduledEmails.find((i) => i.id === id);

    if (!target) {
      try {
        const dbRec = await supabaseService.selectById('scheduled_emails', id);
        if (dbRec) target = normalizeScheduledRecord(dbRec);
      } catch (_) {}
    }

    if (!target) {
      return res.status(404).json({ success: false, message: 'Scheduled email not found.' });
    }

    if (scheduled_at) {
      const scheduledDate = new Date(scheduled_at);
      if (!isNaN(scheduledDate.getTime())) {
        target.scheduled_at = scheduledDate.toISOString();
      }
    } else {
      // Default retry set to 1 minute from now
      target.scheduled_at = new Date(Date.now() + 60000).toISOString();
    }

    target.status = 'scheduled';
    target.failure_reason = null;
    target.updated_at = new Date().toISOString();

    try {
      await supabaseService.update('scheduled_emails', id, {
        status: 'scheduled',
        scheduled_at: target.scheduled_at,
        failure_reason: null,
        updated_at: target.updated_at,
      });
    } catch (_) {}

    return res.json({
      success: true,
      message: 'Scheduled email queued for retry.',
      entry: normalizeScheduledRecord(target),
    });
  } catch (error) {
    next(error);
  }
};
