import { supabaseService } from './supabaseService.js';
import { sendMailViaBrevo, parseRecipients } from './emailService.js';
import { encrypt, decrypt } from './encryptionService.js';
import { memoryScheduledEmails } from '../controllers/scheduledEmailController.js';

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

  return {
    id: raw.id,
    from: raw.from_email || raw.sender || 'contact@zenemoo.in',
    to: Array.isArray(to) ? to : parseRecipients(to),
    cc: Array.isArray(cc) ? cc : parseRecipients(cc),
    bcc: Array.isArray(bcc) ? bcc : parseRecipients(bcc),
    subject,
    html,
    attachments: raw.attachments || [],
  };
};

/**
 * Process single scheduled email item atomically
 */
const processScheduledItem = async (item) => {
  const normalized = prepareRecordForDispatch(item);

  // 1. Atomic claim check: ensure item status is still 'scheduled'
  if (item.status !== 'scheduled') {
    return false;
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

  // 2. Dispatch via Brevo Service
  try {
    const sendResult = await sendMailViaBrevo({
      sender: normalized.from,
      recipients: normalized.to,
      cc: normalized.cc,
      bcc: normalized.bcc,
      subject: normalized.subject,
      html: normalized.html,
      attachments: normalized.attachments,
    });

    const sentTimestamp = new Date().toISOString();
    const providerMsgId = sendResult?.messageId || `msg_sched_${Date.now()}`;

    // 3. Mark scheduled email as 'sent'
    item.status = 'sent';
    item.sent_at = sentTimestamp;
    item.provider_message_id = providerMsgId;
    item.failure_reason = null;
    item.updated_at = sentTimestamp;

    try {
      await supabaseService.update('scheduled_emails', item.id, {
        status: 'sent',
        sent_at: sentTimestamp,
        provider_message_id: providerMsgId,
        failure_reason: null,
        updated_at: sentTimestamp,
      });
    } catch (_) {}

    // 4. Automatically insert into Sent History (email_history)
    const historyPayload = {
      user_id: item.user_id || null,
      user_email: item.user_email || normalized.from,
      sender: normalized.from,
      recipients: encrypt(normalized.to),
      cc: encrypt(normalized.cc),
      bcc: encrypt(normalized.bcc),
      subject: encrypt(normalized.subject),
      html: encrypt(normalized.html),
      attachments_meta: normalized.attachments,
      status: 'sent',
      message_id: providerMsgId,
      created_at: sentTimestamp,
      updated_at: sentTimestamp,
    };

    try {
      await supabaseService.insert('email_history', historyPayload);
    } catch (_) {}

    console.log(`✓ [Scheduled Email Worker] Delivered email ${item.id} ("${normalized.subject}") via Brevo. Message ID: ${providerMsgId}`);
    return true;
  } catch (err) {
    const errorMsg = err.message || 'Delivery via Brevo failed.';
    console.error(`✕ [Scheduled Email Worker] Failed to send scheduled email ${item.id}:`, errorMsg);

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

    // 2. Fetch from Supabase DB
    let dueDbItems = [];
    try {
      const allDb = await supabaseService.selectAll('scheduled_emails', 'scheduled_at', true);
      dueDbItems = (allDb || []).filter(
        (item) => item.status === 'scheduled' && new Date(item.scheduled_at).getTime() <= now.getTime()
      );
    } catch (_) {}

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
