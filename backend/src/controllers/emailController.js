import { supabaseService } from '../services/supabaseService.js';
import {
  sendMailViaBrevo,
  parseRecipients,
  validateEmail,
  sanitizeHtml,
  extractAttachmentMetadata,
  runFullEmailDiagnostics,
} from '../services/emailService.js';
import { encrypt, decrypt } from '../services/encryptionService.js';

// In-Memory Backup Caches (Fallback if Supabase table is pending creation)
const memoryHistory = [];
const memoryDrafts = [];

// POST /api/email/send - Send email via Brevo SMTP and store AES-256 encrypted log in Supabase
export const sendEmail = async (req, res, next) => {
  try {
    const { sender, recipients, cc, bcc, subject, html, attachments = [] } = req.body;

    if (!recipients || !subject || !html) {
      return res.status(400).json({
        success: false,
        message: 'Recipients, subject, and email body content are required.',
      });
    }

    const parsedTo = parseRecipients(recipients);
    const invalidTo = parsedTo.filter((email) => !validateEmail(email));

    if (parsedTo.length === 0 || invalidTo.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more recipient email addresses are invalid.',
        invalidRecipients: invalidTo,
      });
    }

    const fromSender = sender || 'contact@zenemoo.in';
    const safeHtml = sanitizeHtml(html);
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

      // Encrypt sensitive fields before saving to Supabase
      const payload = {
        sender: fromSender,
        recipients: encrypt(parsedTo),
        cc: encrypt(parseRecipients(cc)),
        bcc: encrypt(parseRecipients(bcc)),
        subject: encrypt(subject),
        html: encrypt(safeHtml),
        attachments_meta: attachmentsMeta, // Metadata only (image: "yes", pdf: "no"). NO binary files stored.
        status: 'sent',
        message_id: sendResult.messageId || `msg_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let insertedRecord = null;
      try {
        insertedRecord = await supabaseService.insert('email_history', payload);
      } catch (dbErr) {
        console.warn('Supabase email_history insert warning (using fallback memory):', dbErr.message);
        payload.id = `temp_${Date.now()}`;
        memoryHistory.unshift(payload);
        insertedRecord = payload;
      }

      // Return decrypted response to admin UI
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

      const failedPayload = {
        sender: fromSender,
        recipients: encrypt(parsedTo),
        cc: encrypt(parseRecipients(cc)),
        bcc: encrypt(parseRecipients(bcc)),
        subject: encrypt(subject),
        html: encrypt(safeHtml),
        attachments_meta: attachmentsMeta,
        status: 'failed',
        error_message: sendErr.message || 'SMTP Handshake Failed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await supabaseService.insert('email_history', failedPayload);
      } catch (e) {
        failedPayload.id = `temp_${Date.now()}`;
        memoryHistory.unshift(failedPayload);
      }

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

// GET /api/email/history - Fetch email logs from Supabase and decrypt fields for Admin
export const getEmailHistory = async (req, res, next) => {
  try {
    let dbLogs = [];
    try {
      dbLogs = await supabaseService.selectAll('email_history', 'created_at', false);
    } catch (e) {
      dbLogs = memoryHistory;
    }

    if (!Array.isArray(dbLogs)) dbLogs = memoryHistory;

    // Decrypt all encrypted payload fields
    const decryptedLogs = dbLogs.map((log) => {
      const recipients = decrypt(log.recipients, true);
      const cc = decrypt(log.cc, true);
      const bcc = decrypt(log.bcc, true);
      const subject = decrypt(log.subject);
      const html = decrypt(log.html);

      return {
        id: log.id,
        sender: log.sender || 'contact@zenemoo.in',
        recipients: Array.isArray(recipients) ? recipients : [recipients],
        cc: Array.isArray(cc) ? cc : [],
        bcc: Array.isArray(bcc) ? bcc : [],
        subject: subject || '(No Subject)',
        html: html || '',
        attachments_meta: log.attachments_meta || [],
        status: log.status || 'sent',
        messageId: log.message_id,
        errorMessage: log.error_message,
        createdAt: log.created_at || new Date().toISOString(),
      };
    });

    res.json({
      success: true,
      count: decryptedLogs.length,
      data: decryptedLogs,
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
      const idx = memoryHistory.findIndex((m) => m.id === id);
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

// GET /api/email/drafts - Fetch encrypted drafts from Supabase and decrypt for Admin
export const getEmailDrafts = async (req, res, next) => {
  try {
    let dbDrafts = [];
    try {
      dbDrafts = await supabaseService.selectAll('email_drafts', 'created_at', false);
    } catch (e) {
      dbDrafts = memoryDrafts;
    }

    if (!Array.isArray(dbDrafts)) dbDrafts = memoryDrafts;

    const decryptedDrafts = dbDrafts.map((draft) => {
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

    const payload = {
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
