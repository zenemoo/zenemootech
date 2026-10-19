import { supabase } from '../config/supabase.js';
import { supabaseService } from './supabaseService.js';
import { sendMailViaBrevo, parseRecipients } from './emailService.js';
import { encrypt, decrypt } from './encryptionService.js';
import { memoryScheduledEmails } from '../controllers/scheduledEmailController.js';
import { emailR2Service } from './emailR2Service.js';

let isProcessingTick = false;
let workerIntervalHandle = null;

/**
 * Normalizes a record for Brevo delivery
 */
const prepareRecordForDispatch = (raw) => {
  let to = raw.to_emails || raw.recipients || [];
  if (typeof to === 'string' && (to.startsWith('enc_') || to.length > 30)) {
    try { to = decrypt(to); } catch (_) {}
  }
  if (typeof to === 'string') to = parseRecipients(to);

  let cc = raw.cc_emails || raw.cc || [];
  if (typeof cc === 'string' && (cc.startsWith('enc_') || cc.length > 30)) {
    try { cc = decrypt(cc); } catch (_) {}
  }
  if (typeof cc === 'string') cc = parseRecipients(cc);

  let bcc = raw.bcc_emails || raw.bcc || [];
  if (typeof bcc === 'string' && (bcc.startsWith('enc_') || bcc.length > 30)) {
    try { bcc = decrypt(bcc); } catch (_) {}
  }
  if (typeof bcc === 'string') bcc = parseRecipients(bcc);

  let subject = raw.subject || '';
  if (typeof subject === 'string' && (subject.startsWith('enc_') || subject.length > 30)) {
    try { subject = decrypt(subject); } catch (_) {}
  }

  let html = raw.body_html || raw.html || '';
  if (typeof html === 'string' && (html.startsWith('enc_') || html.length > 30)) {
    try { html = decrypt(html); } catch (_) {}
  }

  let text = raw.body_text || raw.text || '';

  // Extract threading metadata
  let inReplyTo = raw.in_reply_to || raw.inReplyTo || undefined;
  let references = raw.references_header || raw.references || undefined;
  let headers = raw.headers || undefined;

  const rawAttachments = Array.isArray(raw.attachments) ? raw.attachments : [];
  const threadAtt = rawAttachments.find((a) => a && a._threading);
  if (threadAtt && threadAtt._threading) {
    inReplyTo = inReplyTo || threadAtt._threading.inReplyTo;
    references = references || threadAtt._threading.references;
    headers = headers || threadAtt._threading.headers;
  }

  if (!headers && (inReplyTo || references)) {
    headers = {};
    if (inReplyTo) headers['In-Reply-To'] = inReplyTo;
    if (references) headers['References'] = references;
  }

  const cleanAttachments = rawAttachments.filter((a) => a && !a._threading);

  return {
    id: raw.id,
    from: raw.from_email || raw.sender || 'contact@zenemoo.in',
    to: Array.isArray(to) ? to : parseRecipients(to),
    cc: Array.isArray(cc) ? cc : parseRecipients(cc),
    bcc: Array.isArray(bcc) ? bcc : parseRecipients(bcc),
    subject,
    html,
    text,
    attachments: cleanAttachments,
    inReplyTo,
    references,
    headers,
  };
};

/**
 * Process single scheduled email item atomically with R2 retrieval and safe conversion to sent history
 */
export const processScheduledItem = async (item, { customSendMail } = {}) => {
  const normalized = prepareRecordForDispatch(item);

  // 1. Atomic claim check: ensure item status is still 'scheduled'
  if (item.status !== 'scheduled') {
    return false;
  }

  // Idempotency: verify if this item was already dispatched (e.g. if previous tick dispatched but DB crashed)
  if (item.provider_message_id || item.sent_at) {
    console.log(`[Scheduled Email Worker] Item ${item.id} already dispatched with provider ID: ${item.provider_message_id}. Skipping duplicate send.`);
    return true;
  }

  // Set status to 'processing' atomically to lock
  item.status = 'processing';
  item.updated_at = new Date().toISOString();

  try {
    await supabaseService.update('scheduled_emails', item.id, {
      status: 'processing',
      updated_at: item.updated_at,
    });
  } catch (_) {}

  // 2. Resolve HTML body & attachments from Cloudflare R2 if stored there
  const cleanId = emailR2Service.sanitizeId(item.id);
  let finalHtml = normalized.html;
  let finalText = item.body_text || normalized.text || '';

  if (item.body_html_r2_key || item.body_text_r2_key || item.storage_provider === 'cloudflare_r2') {
    const htmlKey = item.body_html_r2_key || `scheduled/${cleanId}/body.html`;
    const textKey = item.body_text_r2_key || `scheduled/${cleanId}/body.txt`;
    try {
      const r2Body = await emailR2Service.getEmailBodyWithFallback({
        htmlKey,
        textKey,
        fallbackHtml: finalHtml || '',
        fallbackText: finalText || '',
      });
      if (r2Body.body_html) finalHtml = r2Body.body_html;
      if (r2Body.body_text) finalText = r2Body.body_text;
    } catch (r2ReadErr) {
      console.warn('[Scheduled Email Worker R2 Read Note]:', r2ReadErr.message);
    }
  }

  // Prepare Brevo attachments: if attachment only has r2_key, fetch buffer for delivery
  const brevoAttachments = [];
  if (Array.isArray(item.attachments)) {
    for (const att of item.attachments) {
      if (att && att._threading) continue; // Skip internal threading metadata
      if (att.content || att.data || att.base64) {
        brevoAttachments.push(att);
      } else if (att.r2_key) {
        try {
          const r2Obj = await emailR2Service.getObjectBuffer(att.r2_key);
          if (r2Obj && r2Obj.buffer) {
            brevoAttachments.push({
              filename: att.filename || att.name,
              content: r2Obj.buffer.toString('base64'),
              contentType: att.contentType || att.type || 'application/octet-stream',
            });
          }
        } catch (attR2Err) {
          console.warn('[Scheduled Email Worker Attachment Buffer Read Warning]:', attR2Err.message);
        }
      }
    }
  }

  // 3. Dispatch via Brevo Service (or test stub)
  try {
    const dispatchMail = typeof customSendMail === 'function' ? customSendMail : sendMailViaBrevo;
    const sendResult = await dispatchMail({
      sender: normalized.from,
      recipients: normalized.to,
      cc: normalized.cc,
      bcc: normalized.bcc,
      subject: normalized.subject,
      html: finalHtml,
      text: finalText,
      attachments: brevoAttachments.length > 0 ? brevoAttachments : normalized.attachments,
      inReplyTo: normalized.inReplyTo,
      references: normalized.references,
      headers: normalized.headers,
    });

    const sentTimestamp = new Date().toISOString();
    const providerMsgId = sendResult?.messageId || `msg_sched_${Date.now()}`;
    item.provider_message_id = providerMsgId;
    item.sent_at = sentTimestamp;

    // 4. Automatically insert into Sent History (email_history) referencing the SAME R2 objects (zero duplication)
    // Check if history record already exists with this message_id (Idempotent transition)
    let historyExists = false;
    if (supabase) {
      try {
        const { data: existingHist } = await supabase
          .from('email_history')
          .select('id')
          .eq('message_id', providerMsgId)
          .maybeSingle();
        if (existingHist) historyExists = true;
      } catch (_) {}
    }

    if (!historyExists) {
      const historyPayload = {
        user_id: item.user_id || null,
        user_email: item.user_email || normalized.from,
        sender: normalized.from,
        recipients: encrypt(normalized.to),
        cc: encrypt(normalized.cc),
        bcc: encrypt(normalized.bcc),
        subject: encrypt(normalized.subject),
        html: encrypt(finalHtml),
        storage_provider: 'cloudflare_r2',
        body_html_r2_key: item.body_html_r2_key || `scheduled/${cleanId}/body.html`,
        body_text_r2_key: item.body_text_r2_key || `scheduled/${cleanId}/body.txt`,
        attachments_r2_prefix: item.attachments_r2_prefix || `scheduled/${cleanId}/attachments/`,
        attachments_meta: normalized.attachments,
        has_attachments: normalized.attachments.length > 0,
        status: 'sent',
        message_id: providerMsgId,
        created_at: sentTimestamp,
        updated_at: sentTimestamp,
        storage_migration_status: 'migrated',
      };

      try {
        await supabaseService.insert('email_history', historyPayload);
      } catch (histErr) {
        delete historyPayload.user_id;
        delete historyPayload.user_email;
        try {
          await supabaseService.insert('email_history', historyPayload);
        } catch (histRetryErr) {
          console.warn('[Scheduled Email Worker Insert History Warning]:', histRetryErr.message);
        }
      }
    }

    // 5. Delete the scheduled_emails row now that it is successfully converted to email_history
    // NOTE: Cloudflare R2 objects are NOT deleted because email_history references the same objects!
    if (supabase && item.id) {
      try {
        const { error: delErr } = await supabase.from('scheduled_emails').delete().eq('id', item.id);
        if (delErr) {
          await supabase.from('scheduled_emails').update({ status: 'sent', updated_at: sentTimestamp }).eq('id', item.id);
        }
      } catch (delErr) {
        console.warn('[Scheduled Email Worker Delete scheduled_emails Note]:', delErr.message);
        try {
          await supabaseService.update('scheduled_emails', item.id, { status: 'sent', updated_at: sentTimestamp });
        } catch (_) {}
      }
    }

    const memIdx = memoryScheduledEmails.findIndex((m) => String(m.id) === String(item.id));
    if (memIdx !== -1) {
      memoryScheduledEmails.splice(memIdx, 1);
    }

    console.log(`✓ [Scheduled Email Worker] Delivered scheduled email ${item.id} ("${normalized.subject}") via Brevo and transferred to email_history with R2 references.`);
    return true;
  } catch (err) {
    const errorMsg = err.message || 'Delivery via Brevo failed.';
    console.error(`✕ [Scheduled Email Worker] Failed to send scheduled email ${item.id}:`, errorMsg);

    // If failed: DO NOT delete scheduled_emails row and DO NOT delete R2 objects!
    item.status = 'failed';
    item.failure_reason = errorMsg;
    item.updated_at = new Date().toISOString();

    try {
      await supabaseService.update('scheduled_emails', item.id, {
        status: 'failed',
        failure_reason: errorMsg,
        updated_at: item.updated_at,
      });
    } catch (_) {}

    return false;
  }
};

/**
 * Worker execution tick
 */
export const runScheduledEmailProcessorTick = async () => {
  if (isProcessingTick) return { processed: 0, sent: 0, failed: 0 };
  isProcessingTick = true;

  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    const now = new Date();

    // 1. Fetch from memory cache
    const dueMemoryItems = memoryScheduledEmails.filter(
      (item) => item.status === 'scheduled' && new Date(item.scheduled_at).getTime() <= now.getTime()
    );

    // 2. Fetch from Supabase DB using targeted SQL filters (status = 'scheduled' AND scheduled_at <= now)
    let dueDbItems = [];
    try {
      if (supabase) {
        const { data: dbRecords, error: dbError } = await supabase
          .from('scheduled_emails')
          .select('id, user_id, user_email, from_email, to_emails, cc_emails, bcc_emails, subject, body_html, attachments, status, scheduled_at, created_at, updated_at')
          .eq('status', 'scheduled')
          .lte('scheduled_at', now.toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(50);

        if (!dbError && Array.isArray(dbRecords)) {
          dueDbItems = dbRecords;
        }
      }
    } catch (dbQueryErr) {
      console.warn('[Scheduled Email Worker DB Fetch Warning]:', dbQueryErr.message);
    }

    // Merge candidates
    const itemMap = new Map();
    dueMemoryItems.forEach((i) => itemMap.set(i.id, i));
    dueDbItems.forEach((i) => {
      if (!itemMap.has(i.id)) {
        itemMap.set(i.id, i);
      }
    });

    const dueList = Array.from(itemMap.values());
    processed = dueList.length;

    for (const item of dueList) {
      const success = await processScheduledItem(item);
      if (success) sent++;
      else failed++;
    }
  } catch (err) {
    console.error('[Scheduled Email Worker] Processor tick error:', err.message);
  } finally {
    isProcessingTick = false;
  }

  return { processed, sent, failed };
};

/**
 * Start Background Scheduled Email Processor Worker (Optional - Disabled in favor of Cloudflare Cron)
 */
export const startScheduledEmailWorker = (intervalMs = 20000) => {
  if (workerIntervalHandle) return;
  console.log(`⚡ [Scheduled Email Worker] Node interval disabled (Cloudflare Cron active)`);
};

/**
 * Stop Background Scheduled Email Processor Worker
 */
export const stopScheduledEmailWorker = () => {
  if (workerIntervalHandle) {
    clearInterval(workerIntervalHandle);
    workerIntervalHandle = null;
  }
};
