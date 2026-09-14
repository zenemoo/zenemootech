import { supabaseService } from '../services/supabaseService.js';
import { supabase } from '../config/supabase.js';
import {
  sendMailViaBrevo,
  parseRecipients,
  validateEmail,
  sanitizeHtml,
  extractAttachmentMetadata,
  runFullEmailDiagnostics,
} from '../services/emailService.js';
import { encrypt, decrypt } from '../services/encryptionService.js';

// Helper for non-hanging async queries with timeout
const withTimeout = (promise, ms = 8000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Query timed out')), ms)),
  ]);
};

// In-Memory Backup Caches (Fallback if Supabase table is pending creation)
const memoryHistory = [];
const memoryDrafts = [];

// POST /api/email/send - Send email via Brevo SMTP and store AES-256 encrypted log in Supabase
export const sendEmail = async (req, res, next) => {
  try {
    const { sender, from, recipients, to, cc, bcc, subject, html, text, attachments = [] } = req.body;

    const targetRecipients = recipients || to;
    const fromSender = sender || from || 'contact@zenemoo.in';

    let safeHtml = html ? sanitizeHtml(html) : '';
    if (!safeHtml && text) {
      const escapedText = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      safeHtml = `<div style="font-family: system-ui, -apple-system, sans-serif; white-space: pre-wrap; line-height: 1.6; color: #1e293b;">${escapedText}</div>`;
    }

    if (!targetRecipients || !subject || !safeHtml) {
      return res.status(400).json({
        success: false,
        message: 'Recipients, subject, and email message content are required.',
      });
    }

    const parsedTo = parseRecipients(targetRecipients);

    if (parsedTo.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please specify at least one valid recipient email address (e.g. user1@company.com, user2@org.io).',
      });
    }

    const attachmentsMeta = extractAttachmentMetadata(attachments);

    let sendResult;
    try {
      sendResult = await sendMailViaBrevo({
        sender: fromSender,
        recipients: parsedTo,
        cc,
        bcc,
        subject,
        html: safeHtml,
        attachments,
      });

      const currentUserEmail = (req.user?.email || fromSender).toLowerCase();
      const currentUserId = req.user?.id || req.user?.team_member_id || null;

      // Embed account identity inside attachments_meta so it is ALWAYS persisted in Supabase DB
      const safeMeta = Array.isArray(attachmentsMeta) ? [...attachmentsMeta] : [];
      safeMeta.push({
        _sender_account_email: currentUserEmail,
        _sender_account_id: currentUserId,
      });

      // Encrypt sensitive fields before saving to Supabase
      const payload = {
        user_id: currentUserId,
        user_email: currentUserEmail,
        sender: fromSender,
        recipients: encrypt(parsedTo),
        cc: encrypt(parseRecipients(cc)),
        bcc: encrypt(parseRecipients(bcc)),
        subject: encrypt(subject),
        html: encrypt(safeHtml),
        attachments_meta: safeMeta, // Metadata + embedded sender account info
        status: 'sent',
        message_id: sendResult.messageId || `msg_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let insertedRecord = null;
      try {
        insertedRecord = await supabaseService.insert('email_history', payload);
      } catch (dbErr) {
        console.warn('Supabase email_history insert warning:', dbErr.message);
        if (dbErr.message?.includes('PGRST204') || dbErr.message?.includes('column')) {
          delete payload.user_id;
          delete payload.user_email;
          try {
            insertedRecord = await supabaseService.insert('email_history', payload);
          } catch (_) {}
        }
        if (!insertedRecord) {
          payload.id = `temp_${Date.now()}`;
          insertedRecord = payload;
        }
      }
      memoryHistory.unshift(payload);

      // Return decrypted response to user UI
      return res.json({
        success: true,
        message: 'Email sent successfully via Brevo SMTP.',
        messageId: sendResult.messageId,
        entry: {
          id: insertedRecord?.id || Date.now(),
          sender: fromSender,
          recipients: parsedTo,
          cc: parseRecipients(cc),
          bcc: parseRecipients(bcc),
          subject,
          html: safeHtml,
          attachments_meta: attachmentsMeta,
          status: 'sent',
          createdAt: new Date().toISOString(),
        },
      });
    } catch (sendErr) {
      console.error('Brevo SMTP Send Error:', sendErr.message);

      const currentUserEmail = (req.user?.email || fromSender).toLowerCase();
      const currentUserId = req.user?.id || req.user?.team_member_id || null;

      const safeMeta = Array.isArray(attachmentsMeta) ? [...attachmentsMeta] : [];
      safeMeta.push({
        _sender_account_email: currentUserEmail,
        _sender_account_id: currentUserId,
      });

      const failedPayload = {
        user_id: currentUserId,
        user_email: currentUserEmail,
        sender: fromSender,
        recipients: encrypt(parsedTo),
        cc: encrypt(parseRecipients(cc)),
        bcc: encrypt(parseRecipients(bcc)),
        subject: encrypt(subject),
        html: encrypt(safeHtml),
        attachments_meta: safeMeta,
        status: 'failed',
        error_message: sendErr.message || 'SMTP Handshake Failed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await supabaseService.insert('email_history', failedPayload);
      } catch (e) {
        failedPayload.id = `temp_${Date.now()}`;
      }
      memoryHistory.unshift(failedPayload);

      return res.status(500).json({
        success: false,
        stage: sendErr.stage || 'SMTP Delivery',
        code: sendErr.code || 'ESMTPFAILED',
        error: sendErr.error || sendErr.message || 'Brevo SMTP delivery failed',
        response: sendErr.response,
        responseCode: sendErr.responseCode,
        command: sendErr.command,
        suggestion: sendErr.suggestion || 'Verify BREVO_SMTP_KEY in environment variables and sender authorization.',
      });
    }
  } catch (err) {
    next(err);
  }
};

// Helper to clean attachment metadata
const sanitizeAttachmentMeta = (attachmentsMeta) => {
  if (!Array.isArray(attachmentsMeta)) return [];
  return attachmentsMeta
    .filter((a) => a && typeof a === 'object' && !a._sender_account_email && (a.name || a.filename || a.type || a.content || a.size))
    .map((a) => ({
      name: a.name || a.filename || 'attachment',
      filename: a.filename || a.name || 'attachment',
      type: a.type || a.contentType || 'application/octet-stream',
      size: typeof a.size === 'number' ? a.size : 0,
      image: a.image || (a.type?.startsWith('image/') ? 'yes' : 'no'),
      pdf: a.pdf || (a.type === 'application/pdf' ? 'yes' : 'no'),
    }));
};

// GET /api/email/history - Server-side paginated & egress-optimized email history
export const getEmailHistory = async (req, res, next) => {
  try {
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

    // Users without email permission cannot view history
    if (!hasEmailAccess) {
      return res.json({
        success: true,
        count: 0,
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
        totalCount: 0,
        sentCount: 0,
        failedCount: 0,
        data: [],
      });
    }

    const {
      page = 1,
      pageSize = 20,
      limit = 20,
      status = 'all',
      search = '',
      dateRange = 'all',
      startDate,
      endDate,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(pageSize || limit, 10) || 20));

    // Lightweight columns for list rows - EXCLUDES heavy 'html' body to optimize Supabase egress
    const LIST_COLUMNS = 'id, user_id, user_email, sender, recipients, cc, bcc, subject, attachments_meta, status, message_id, error_message, created_at, updated_at';

    let dbLogs = [];
    let querySucceeded = false;
    if (supabase) {
      try {
        let query = supabase.from('email_history').select(LIST_COLUMNS);

        // Apply role isolation at database level if not super admin
        if (!isSuperAdmin) {
          if (userId && userEmail) {
            query = query.or(`user_email.ilike.${userEmail},user_id.eq.${userId}`);
          } else if (userEmail) {
            query = query.ilike('user_email', userEmail);
          } else if (userId) {
            query = query.eq('user_id', userId);
          }
        }

        // Apply status filter at DB level
        if (status && status !== 'all') {
          query = query.eq('status', status.toLowerCase());
        }

        // Apply date range filter at DB level
        if (dateRange === 'today') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          query = query.gte('created_at', startOfToday.toISOString());
        } else if (dateRange === '7days') {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          query = query.gte('created_at', sevenDaysAgo.toISOString());
        } else if (dateRange === '30days') {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          query = query.gte('created_at', thirtyDaysAgo.toISOString());
        } else if (dateRange === '90days') {
          const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          query = query.gte('created_at', ninetyDaysAgo.toISOString());
        } else if (startDate || endDate) {
          if (startDate) query = query.gte('created_at', new Date(startDate).toISOString());
          if (endDate) {
            const endD = new Date(endDate);
            endD.setHours(23, 59, 59, 999);
            query = query.lte('created_at', endD.toISOString());
          }
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await withTimeout(query, 6000);
        if (!error && Array.isArray(data)) {
          dbLogs = data;
          querySucceeded = true;
        }
      } catch (dbErr) {
        console.warn('Supabase email_history list query note:', dbErr.message);
      }
    }

    if (!querySucceeded) {
      try {
        dbLogs = await withTimeout(supabaseService.selectAll('email_history', 'created_at', false), 6000);
      } catch (e) {
        dbLogs = [];
      }
    }
    if (!Array.isArray(dbLogs)) dbLogs = [];

    // Merge with in-memory fallback logs deduplicated by message_id or id
    const combined = [...dbLogs, ...memoryHistory];
    const seenKeys = new Set();
    const uniqueLogs = [];
    for (const log of combined) {
      const key = log.message_id || (log.id ? String(log.id) : null) || `${log.sender}_${log.created_at}`;
      if (key && !seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueLogs.push(log);
      }
    }

    // Role-based access filtering
    const accessibleLogs = uniqueLogs.filter((log) => {
      if (isSuperAdmin) return true;
      const embeddedMeta = Array.isArray(log.attachments_meta)
        ? log.attachments_meta.find((m) => m && typeof m === 'object' && m._sender_account_email)
        : null;

      const logUserEmail = (log.user_email || embeddedMeta?._sender_account_email || '').toLowerCase();
      const logUserId = String(log.user_id || embeddedMeta?._sender_account_id || '');
      const currentUserId = String(userId || '');
      const currentUserEmail = userEmail.toLowerCase();

      return (
        (currentUserEmail && logUserEmail === currentUserEmail) ||
        (currentUserId && currentUserId !== 'null' && logUserId === currentUserId)
      );
    });

    // Compute overall summary counts for metrics cards
    const totalCount = accessibleLogs.length;
    const sentCount = accessibleLogs.filter((l) => (l.status || '').toLowerCase() === 'sent').length;
    const failedCount = accessibleLogs.filter((l) => (l.status || '').toLowerCase() === 'failed').length;

    // Decrypt lightweight fields only (recipients, subject)
    const decryptedList = accessibleLogs.map((log) => {
      const recipients = decrypt(log.recipients, true);
      const cc = decrypt(log.cc, true);
      const bcc = decrypt(log.bcc, true);
      const subject = decrypt(log.subject);
      const realAttachments = sanitizeAttachmentMeta(log.attachments_meta);

      return {
        id: log.id || log.message_id,
        sender: log.sender || 'contact@zenemoo.in',
        recipients: Array.isArray(recipients) ? recipients : [recipients].filter(Boolean),
        cc: Array.isArray(cc) ? cc : [],
        bcc: Array.isArray(bcc) ? bcc : [],
        subject: subject || '(No Subject)',
        attachments_meta: realAttachments,
        hasAttachments: realAttachments.length > 0,
        attachmentsCount: realAttachments.length,
        status: (log.status || 'sent').toLowerCase(),
        messageId: log.message_id || (log.id ? String(log.id) : ''),
        errorMessage: log.error_message || null,
        createdAt: log.created_at || new Date().toISOString(),
      };
    });

    // In-memory search & filter refinement (for decrypted fields like recipient & subject)
    let filteredLogs = decryptedList;

    if (status && status !== 'all') {
      filteredLogs = filteredLogs.filter((l) => l.status === status.toLowerCase());
    }

    if (dateRange && dateRange !== 'all') {
      const nowMs = Date.now();
      if (dateRange === 'today') {
        const startOfTodayMs = new Date().setHours(0, 0, 0, 0);
        filteredLogs = filteredLogs.filter((l) => new Date(l.createdAt).getTime() >= startOfTodayMs);
      } else if (dateRange === '7days') {
        const cutoff = nowMs - 7 * 24 * 60 * 60 * 1000;
        filteredLogs = filteredLogs.filter((l) => new Date(l.createdAt).getTime() >= cutoff);
      } else if (dateRange === '30days') {
        const cutoff = nowMs - 30 * 24 * 60 * 60 * 1000;
        filteredLogs = filteredLogs.filter((l) => new Date(l.createdAt).getTime() >= cutoff);
      } else if (dateRange === '90days') {
        const cutoff = nowMs - 90 * 24 * 60 * 60 * 1000;
        filteredLogs = filteredLogs.filter((l) => new Date(l.createdAt).getTime() >= cutoff);
      }
    }

    if (startDate || endDate) {
      if (startDate) {
        const startMs = new Date(startDate).getTime();
        filteredLogs = filteredLogs.filter((l) => new Date(l.createdAt).getTime() >= startMs);
      }
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        const endMs = endD.getTime();
        filteredLogs = filteredLogs.filter((l) => new Date(l.createdAt).getTime() <= endMs);
      }
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filteredLogs = filteredLogs.filter((l) => {
        const recsStr = Array.isArray(l.recipients) ? l.recipients.join(' ').toLowerCase() : String(l.recipients || '').toLowerCase();
        const ccStr = Array.isArray(l.cc) ? l.cc.join(' ').toLowerCase() : '';
        const bccStr = Array.isArray(l.bcc) ? l.bcc.join(' ').toLowerCase() : '';
        const subjStr = String(l.subject || '').toLowerCase();
        const senderStr = String(l.sender || '').toLowerCase();
        const msgIdStr = String(l.messageId || '').toLowerCase();
        return (
          recsStr.includes(q) ||
          ccStr.includes(q) ||
          bccStr.includes(q) ||
          subjStr.includes(q) ||
          senderStr.includes(q) ||
          msgIdStr.includes(q)
        );
      });
    }

    // Server-side pagination calculation
    const total = filteredLogs.length;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const safePageNum = Math.min(pageNum, totalPages);
    const fromIndex = (safePageNum - 1) * limitNum;
    const toIndex = fromIndex + limitNum;
    const paginatedData = filteredLogs.slice(fromIndex, toIndex);

    return res.json({
      success: true,
      count: paginatedData.length,
      total,
      page: safePageNum,
      pageSize: limitNum,
      totalPages,
      hasNext: safePageNum < totalPages,
      hasPrevious: safePageNum > 1,
      totalCount,
      sentCount,
      failedCount,
      data: paginatedData,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/email/history/:id - Fetch single decrypted email details with HTML body on demand
export const getEmailHistoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
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
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view email logs.',
      });
    }

    let record = null;

    if (supabase) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('email_history')
            .select('*')
            .or(`id.eq.${id},message_id.eq.${id}`)
            .maybeSingle(),
          6000
        );

        if (!error && data) {
          record = data;
        }
      } catch (dbErr) {
        console.warn('Supabase fetch email detail note:', dbErr.message);
      }
    }

    if (!record) {
      try {
        record = await withTimeout(supabaseService.selectById('email_history', id), 6000);
      } catch (e) {
        record = null;
      }
    }

    if (!record) {
      record = memoryHistory.find((m) => String(m.id) === String(id) || String(m.message_id) === String(id));
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Email history record not found.',
      });
    }

    // Role & Ownership Access Isolation check
    if (!isSuperAdmin) {
      const embeddedMeta = Array.isArray(record.attachments_meta)
        ? record.attachments_meta.find((m) => m && typeof m === 'object' && m._sender_account_email)
        : null;

      const logUserEmail = (record.user_email || embeddedMeta?._sender_account_email || '').toLowerCase();
      const logUserId = String(record.user_id || embeddedMeta?._sender_account_id || '');
      const currentUserId = String(userId || '');
      const currentUserEmail = userEmail.toLowerCase();

      const isOwner =
        (currentUserEmail && logUserEmail === currentUserEmail) ||
        (currentUserId && currentUserId !== 'null' && logUserId === currentUserId);

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to view this email log.',
        });
      }
    }

    const recipients = decrypt(record.recipients, true);
    const cc = decrypt(record.cc, true);
    const bcc = decrypt(record.bcc, true);
    const subject = decrypt(record.subject);
    const html = decrypt(record.html);
    const realAttachments = sanitizeAttachmentMeta(record.attachments_meta);

    const decryptedRecord = {
      id: record.id || record.message_id,
      sender: record.sender || 'contact@zenemoo.in',
      recipients: Array.isArray(recipients) ? recipients : [recipients].filter(Boolean),
      cc: Array.isArray(cc) ? cc : [],
      bcc: Array.isArray(bcc) ? bcc : [],
      subject: subject || '(No Subject)',
      html: html || '',
      attachments_meta: realAttachments,
      hasAttachments: realAttachments.length > 0,
      status: record.status || 'sent',
      messageId: record.message_id || String(record.id || ''),
      errorMessage: record.error_message || null,
      createdAt: record.created_at || new Date().toISOString(),
      updatedAt: record.updated_at || record.created_at || new Date().toISOString(),
    };

    return res.json({
      success: true,
      data: decryptedRecord,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/email/history/:id - Delete email log record from Supabase
export const deleteEmailHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await supabaseService.delete('email_history', id);
    } catch (e) {
      const idx = memoryHistory.findIndex((m) => String(m.id) === String(id) || String(m.message_id) === String(id));
      if (idx !== -1) memoryHistory.splice(idx, 1);
    }

    res.json({
      success: true,
      message: 'Email history entry deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/email/drafts - Fetch encrypted drafts belonging strictly to the current user
export const getEmailDrafts = async (req, res, next) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userEmail = (req.user?.email || '').toLowerCase();
    const userId = req.user?.id || req.user?.team_member_id;

    let dbDrafts = [];
    try {
      dbDrafts = await supabaseService.selectAll('email_drafts', 'created_at', false);
    } catch (e) {
      dbDrafts = memoryDrafts;
    }

    if (!Array.isArray(dbDrafts)) dbDrafts = memoryDrafts;

    // Filter drafts strictly by owner
    const userDrafts = dbDrafts.filter((draft) => {
      if (userRole === 'admin') return true;
      const draftEmail = (draft.sender || draft.user_email || '').toLowerCase();
      const draftUserId = draft.user_id || draft.user_email;
      return (
        draftEmail === userEmail ||
        draftUserId === userId ||
        draftUserId === userEmail
      );
    });

    const decryptedDrafts = userDrafts.map((draft) => {
      const recipients = decrypt(draft.recipients, true);
      const cc = decrypt(draft.cc, true);
      const bcc = decrypt(draft.bcc, true);
      const subject = decrypt(draft.subject);
      const html = decrypt(draft.html);

      return {
        id: draft.id,
        sender: draft.sender || 'contact@zenemoo.in',
        recipients: Array.isArray(recipients) ? recipients : [],
        cc: Array.isArray(cc) ? cc : [],
        bcc: Array.isArray(bcc) ? bcc : [],
        subject: subject || '',
        html: html || '',
        attachments_meta: draft.attachments_meta || [],
        createdAt: draft.created_at || new Date().toISOString(),
        updatedAt: draft.updated_at || new Date().toISOString(),
      };
    });

    res.json({
      success: true,
      count: decryptedDrafts.length,
      data: decryptedDrafts,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/email/drafts - Encrypt and save draft to Supabase
export const saveEmailDraft = async (req, res, next) => {
  try {
    const { id, sender, recipients, cc, bcc, subject, html, attachments = [] } = req.body;
    const userId = req.user?.id || req.user?.team_member_id || null;
    const userEmail = (req.user?.email || sender || 'contact@zenemoo.in').toLowerCase();

    const payload = {
      user_id: userId,
      user_email: userEmail,
      sender: sender || 'contact@zenemoo.in',
      recipients: encrypt(parseRecipients(recipients)),
      cc: encrypt(parseRecipients(cc)),
      bcc: encrypt(parseRecipients(bcc)),
      subject: encrypt(subject || ''),
      html: encrypt(html || ''),
      attachments_meta: extractAttachmentMetadata(attachments),
      updated_at: new Date().toISOString(),
    };

    let draftRecord = null;
    if (id && !String(id).startsWith('temp_')) {
      try {
        draftRecord = await supabaseService.update('email_drafts', id, payload);
      } catch (e) {}
    }

    if (!draftRecord) {
      payload.created_at = new Date().toISOString();
      try {
        draftRecord = await supabaseService.insert('email_drafts', payload);
      } catch (e) {
        payload.id = `temp_${Date.now()}`;
        memoryDrafts.unshift(payload);
        draftRecord = payload;
      }
    }

    res.json({
      success: true,
      message: 'Draft saved successfully to Supabase.',
      draft: {
        id: draftRecord?.id || Date.now(),
        sender: sender || 'contact@zenemoo.in',
        recipients: parseRecipients(recipients),
        cc: parseRecipients(cc),
        bcc: parseRecipients(bcc),
        subject: subject || '',
        html: html || '',
        attachments_meta: extractAttachmentMetadata(attachments),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/email/drafts/:id - Delete draft from Supabase
export const deleteEmailDraft = async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await supabaseService.delete('email_drafts', id);
    } catch (e) {
      const idx = memoryDrafts.findIndex((d) => d.id === id);
      if (idx !== -1) memoryDrafts.splice(idx, 1);
    }

    res.json({
      success: true,
      message: 'Draft deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/email/diagnose - Production Live Diagnostic Suite
export const runEmailDiagnostics = async (req, res, next) => {
  try {
    const results = await runFullEmailDiagnostics();
    res.json({
      success: true,
      diagnostics: results,
    });
  } catch (err) {
    next(err);
  }
};
