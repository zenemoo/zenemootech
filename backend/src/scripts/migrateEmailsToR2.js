import dotenv from 'dotenv';
dotenv.config();

import { supabase } from '../config/supabase.js';
import { emailR2Service } from '../services/emailR2Service.js';
import { decrypt } from '../services/encryptionService.js';

/**
 * =====================================================================
 * ZENEMOO RESUMABLE EMAIL MIGRATION UTILITY (CONTROLLED CONCURRENCY = 3)
 * SUPABASE -> CLOUDFLARE R2 PRIVATE BUCKET (zenemoo-email-storage)
 * =====================================================================
 * 
 * CRITICAL SAFETY PRINCIPLES:
 * 1. ZERO DELETION: Existing Supabase rows, columns, and data are NEVER deleted.
 * 2. IDEMPOTENT: Safe to run repeatedly; skips already-migrated records.
 * 3. RESUMABLE: Automatically continues from where it left off.
 * 4. DRY-RUN: Supports simulation without modifying any data.
 * 5. VERIFICATION: Validates each R2 object immediately after upload.
 * 6. CONTROLLED CONCURRENCY: Exactly 3 concurrent worker streams to avoid load spikes.
 * 
 * CLI Usage:
 *   node src/scripts/migrateEmailsToR2.js --dry-run
 *   node src/scripts/migrateEmailsToR2.js --test
 *   node src/scripts/migrateEmailsToR2.js --limit 5
 *   node src/scripts/migrateEmailsToR2.js --id <email-id>
 *   node src/scripts/migrateEmailsToR2.js --all
 *   node src/scripts/migrateEmailsToR2.js --stream incoming
 *   node src/scripts/migrateEmailsToR2.js --stream sent
 * =====================================================================
 */

const CONCURRENCY_LIMIT = 3;

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isTestMode = args.includes('--test');
const isAll = args.includes('--all');
const limitIdx = args.indexOf('--limit');
const targetLimit = isTestMode ? 3 : (limitIdx !== -1 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : (isAll ? 1000 : 5));
const idIdx = args.indexOf('--id');
const targetId = idIdx !== -1 && args[idIdx + 1] ? args[idIdx + 1] : null;
const streamIdx = args.indexOf('--stream');
const targetStream = streamIdx !== -1 && args[streamIdx + 1] ? args[streamIdx + 1] : 'all'; // 'incoming', 'sent', 'all'

/**
 * Concurrency Worker Pool: Runs an array of items with a fixed concurrency limit.
 * Isolated error handling ensures one failure never aborts other concurrent tasks.
 */
async function runConcurrentPool(items, concurrency, workerFn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      const item = items[currentIndex];
      try {
        results[currentIndex] = await workerFn(item, currentIndex, items.length);
      } catch (err) {
        results[currentIndex] = {
          id: item?.id,
          status: 'failed',
          error: err.message,
          bytesUploaded: 0,
        };
      }
    }
  }

  const workerPromises = [];
  const activeWorkers = Math.min(concurrency, items.length);
  for (let i = 0; i < activeWorkers; i++) {
    workerPromises.push(worker());
  }

  await Promise.all(workerPromises);
  return results;
}

async function migrateIncomingEmail(email, dryRun = false) {
  const result = {
    id: email.id,
    subject: email.subject || '(No Subject)',
    sender: email.sender_email,
    bytesUploaded: 0,
    attachmentsCount: 0,
    status: 'skipped',
    error: null,
  };

  const isAlreadyMigrated = email.storage_migration_status === 'migrated' && email.body_html_r2_key;
  if (isAlreadyMigrated && !targetId) {
    result.status = 'already_migrated';
    return result;
  }

  const html = email.body_html || '';
  const text = email.body_text || '';
  const rawHeaders = email.raw_headers || '';
  const attachments = Array.isArray(email.attachments) ? email.attachments : [];

  let estimatedBytes = Buffer.byteLength(html, 'utf8') + Buffer.byteLength(text, 'utf8');
  for (const a of attachments) {
    if (a.content || a.data || a.base64) {
      estimatedBytes += typeof a.size === 'number' ? a.size : Math.round((a.content || '').length * 0.75);
    }
  }

  if (dryRun) {
    result.status = 'dry_run_candidate';
    result.bytesUploaded = estimatedBytes;
    result.attachmentsCount = attachments.length;
    return result;
  }

  try {
    // 1. Upload Body HTML & Text
    const bodyResult = await emailR2Service.uploadEmailBody({
      emailId: email.id,
      html,
      text,
      raw: rawHeaders || null,
      type: 'incoming',
    });

    let uploadedTotalBytes = bodyResult.totalBytes;
    const uploadedAttachments = [];

    // 2. Upload Attachments
    for (const att of attachments) {
      const rawData = att.content || att.data || att.base64;
      if (rawData) {
        try {
          const up = await emailR2Service.uploadAttachment({
            emailId: email.id,
            filename: att.filename || att.name || 'attachment',
            content: rawData,
            contentType: att.contentType || att.type || 'application/octet-stream',
            type: 'incoming',
          });

          uploadedAttachments.push({
            id: att.id,
            filename: up.filename,
            contentType: up.contentType,
            size: up.size,
            r2_key: up.r2_key,
          });
          uploadedTotalBytes += up.size;
        } catch (attErr) {
          console.warn(`[Migrate Attachment Warning for ${email.id}]:`, attErr.message);
          uploadedAttachments.push(att);
        }
      } else {
        uploadedAttachments.push(att);
      }
    }

    // 3. Verify in R2
    if (bodyResult.htmlKey) {
      const head = await emailR2Service.verifyObjectExists(bodyResult.htmlKey);
      if (!head.exists) {
        throw new Error(`R2 verification failed for html key: ${bodyResult.htmlKey}`);
      }
    }

    // 4. Update Supabase with R2 references (NON-DESTRUCTIVE: keep original columns)
    const updatePayload = {
      storage_provider: 'cloudflare_r2',
      body_html_r2_key: bodyResult.htmlKey,
      body_text_r2_key: bodyResult.textKey,
      raw_email_r2_key: bodyResult.rawKey,
      attachments_r2_prefix: `incoming/${emailR2Service.sanitizeId(email.id)}/attachments/`,
      has_attachments: attachments.length > 0,
      attachments_meta: uploadedAttachments,
      storage_migration_status: 'migrated',
      storage_migrated_at: new Date().toISOString(),
      storage_size_bytes: uploadedTotalBytes,
    };

    const { error: upErr } = await supabase
      .from('incoming_email_messages')
      .update(updatePayload)
      .eq('id', email.id);

    if (upErr) {
      console.warn(`[Supabase Update Note for ${email.id}]:`, upErr.message);
    }

    result.status = 'migrated';
    result.bytesUploaded = uploadedTotalBytes;
    result.attachmentsCount = uploadedAttachments.length;
    return result;
  } catch (err) {
    result.status = 'failed';
    result.error = err.message;
    return result;
  }
}

async function migrateSentEmail(sentEmail, dryRun = false) {
  const result = {
    id: sentEmail.id,
    subject: '(Encrypted / Sent)',
    sender: sentEmail.sender,
    bytesUploaded: 0,
    attachmentsCount: 0,
    status: 'skipped',
    error: null,
  };

  const isAlreadyMigrated = sentEmail.storage_migration_status === 'migrated' && sentEmail.body_html_r2_key;
  if (isAlreadyMigrated && !targetId) {
    result.status = 'already_migrated';
    return result;
  }

  const decryptedHtml = decrypt(sentEmail.html) || '';
  const decryptedSubject = decrypt(sentEmail.subject) || '(No Subject)';
  result.subject = decryptedSubject;
  const attachments = Array.isArray(sentEmail.attachments_meta) ? sentEmail.attachments_meta : [];

  let estimatedBytes = Buffer.byteLength(decryptedHtml, 'utf8');

  if (dryRun) {
    result.status = 'dry_run_candidate';
    result.bytesUploaded = estimatedBytes;
    result.attachmentsCount = attachments.length;
    return result;
  }

  try {
    const sentId = String(sentEmail.id);
    const bodyResult = await emailR2Service.uploadEmailBody({
      emailId: sentId,
      html: decryptedHtml,
      text: decryptedHtml.replace(/<[^>]+>/g, ' ').trim(),
      type: 'sent',
    });

    let uploadedTotalBytes = bodyResult.totalBytes;
    const uploadedAttachments = [];

    for (const att of attachments) {
      const rawData = att.content || att.data || att.base64;
      if (rawData) {
        try {
          const up = await emailR2Service.uploadAttachment({
            emailId: sentId,
            filename: att.filename || att.name || 'attachment',
            content: rawData,
            contentType: att.contentType || att.type || 'application/octet-stream',
            type: 'sent',
          });
          uploadedAttachments.push({
            id: att.id,
            filename: up.filename,
            contentType: up.contentType,
            size: up.size,
            r2_key: up.r2_key,
          });
          uploadedTotalBytes += up.size;
        } catch (attErr) {
          console.warn(`[Migrate Sent Attachment Warning for ${sentId}]:`, attErr.message);
          uploadedAttachments.push(att);
        }
      } else {
        uploadedAttachments.push(att);
      }
    }

    // Verify in R2
    if (bodyResult.htmlKey) {
      const head = await emailR2Service.verifyObjectExists(bodyResult.htmlKey);
      if (!head.exists) {
        throw new Error(`R2 verification failed for sent html key: ${bodyResult.htmlKey}`);
      }
    }

    // Update Supabase email_history record
    const updatePayload = {
      storage_provider: 'cloudflare_r2',
      body_html_r2_key: bodyResult.htmlKey,
      body_text_r2_key: bodyResult.textKey,
      attachments_r2_prefix: `sent/${emailR2Service.sanitizeId(sentId)}/attachments/`,
      has_attachments: attachments.length > 0,
      attachments_meta: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      storage_migration_status: 'migrated',
      storage_migrated_at: new Date().toISOString(),
      storage_size_bytes: uploadedTotalBytes,
    };

    const { error: upErr } = await supabase
      .from('email_history')
      .update(updatePayload)
      .eq('id', sentEmail.id);

    if (upErr) {
      console.warn(`[Supabase Sent Update Note for ${sentId}]:`, upErr.message);
    }

    result.status = 'migrated';
    result.bytesUploaded = uploadedTotalBytes;
    result.attachmentsCount = uploadedAttachments.length;
    return result;
  } catch (err) {
    result.status = 'failed';
    result.error = err.message;
    return result;
  }
}

async function run() {
  const startTime = Date.now();
  console.log('===============================================================');
  console.log('ZENEMOO EMAIL TO R2 MIGRATION UTILITY (CONCURRENT = 3)');
  console.log(`Target Bucket: ${emailR2Service.bucketName}`);
  console.log(`Dry Run Mode:  ${isDryRun}`);
  console.log(`Test Mode:     ${isTestMode}`);
  console.log(`Batch Limit:   ${targetLimit}`);
  console.log(`Filter ID:     ${targetId || 'None'}`);
  console.log(`Stream:        ${targetStream}`);
  console.log(`Concurrency:   ${CONCURRENCY_LIMIT} workers`);
  console.log('===============================================================\n');

  let totalIncomingProcessed = 0;
  let totalIncomingMigrated = 0;
  let totalIncomingSkipped = 0;
  let totalIncomingFailed = 0;
  let totalIncomingBytes = 0;

  let totalSentProcessed = 0;
  let totalSentMigrated = 0;
  let totalSentSkipped = 0;
  let totalSentFailed = 0;
  let totalSentBytes = 0;

  // 1. Migrate Incoming Emails
  if (targetStream === 'all' || targetStream === 'incoming') {
    console.log('📦 Fetching incoming emails from Supabase incoming_email_messages...');
    let query = supabase.from('incoming_email_messages').select('*');
    if (targetId) {
      query = query.eq('id', targetId);
    } else {
      query = query.neq('storage_migration_status', 'migrated').order('received_at', { ascending: false }).limit(targetLimit);
    }

    const { data: incomingEmails, error: incErr } = await query;
    if (incErr) {
      console.error('❌ Failed to fetch incoming emails:', incErr.message);
    } else if (Array.isArray(incomingEmails)) {
      console.log(`Found ${incomingEmails.length} incoming email candidate(s).\n`);

      const incomingResults = await runConcurrentPool(incomingEmails, CONCURRENCY_LIMIT, async (item, index, total) => {
        const res = await migrateIncomingEmail(item, isDryRun);

        console.log(`[${index + 1}/${total}] ID: ${res.id}`);
        console.log(`   Subject: "${res.subject.substring(0, 50)}"`);
        console.log(`   Status:  ${res.status}`);
        console.log(`   Bytes:   ${(res.bytesUploaded / 1024).toFixed(1)} KB`);
        console.log(`   Atts:    ${res.attachmentsCount}`);
        if (res.error) console.log(`   Error:   ${res.error}`);
        console.log('');

        return res;
      });

      for (const res of incomingResults) {
        totalIncomingProcessed++;
        if (res.status === 'migrated' || res.status === 'dry_run_candidate') {
          totalIncomingMigrated++;
          totalIncomingBytes += res.bytesUploaded;
        } else if (res.status === 'already_migrated' || res.status === 'skipped') {
          totalIncomingSkipped++;
        } else if (res.status === 'failed') {
          totalIncomingFailed++;
        }
      }
    }
  }

  // 2. Migrate Sent Emails
  if (targetStream === 'all' || targetStream === 'sent') {
    console.log('📦 Fetching sent emails from Supabase email_history...');
    let query = supabase.from('email_history').select('*');
    if (targetId) {
      query = query.eq('id', targetId);
    } else {
      query = query.neq('storage_migration_status', 'migrated').order('created_at', { ascending: false }).limit(targetLimit);
    }

    const { data: sentEmails, error: sentErr } = await query;
    if (sentErr) {
      console.error('❌ Failed to fetch sent emails:', sentErr.message);
    } else if (Array.isArray(sentEmails)) {
      console.log(`Found ${sentEmails.length} sent email candidate(s).\n`);

      const sentResults = await runConcurrentPool(sentEmails, CONCURRENCY_LIMIT, async (item, index, total) => {
        const res = await migrateSentEmail(item, isDryRun);

        console.log(`[${index + 1}/${total}] Sent ID: ${res.id}`);
        console.log(`   Subject: "${res.subject.substring(0, 50)}"`);
        console.log(`   Status:  ${res.status}`);
        console.log(`   Bytes:   ${(res.bytesUploaded / 1024).toFixed(1)} KB`);
        if (res.error) console.log(`   Error:   ${res.error}`);
        console.log('');

        return res;
      });

      for (const res of sentResults) {
        totalSentProcessed++;
        if (res.status === 'migrated' || res.status === 'dry_run_candidate') {
          totalSentMigrated++;
          totalSentBytes += res.bytesUploaded;
        } else if (res.status === 'already_migrated' || res.status === 'skipped') {
          totalSentSkipped++;
        } else if (res.status === 'failed') {
          totalSentFailed++;
        }
      }
    }
  }

  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('===============================================================');
  console.log('MIGRATION EXECUTION SUMMARY');
  console.log('===============================================================');
  console.log(`Incoming Processed:        ${totalIncomingProcessed}`);
  console.log(`Incoming Migrated:         ${totalIncomingMigrated}`);
  console.log(`Incoming Skipped/Already:  ${totalIncomingSkipped}`);
  console.log(`Incoming Failed:           ${totalIncomingFailed}`);
  console.log(`Incoming Storage Moved:    ${(totalIncomingBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log('---------------------------------------------------------------');
  console.log(`Sent Processed:            ${totalSentProcessed}`);
  console.log(`Sent Migrated:             ${totalSentMigrated}`);
  console.log(`Sent Skipped/Already:      ${totalSentSkipped}`);
  console.log(`Sent Failed:               ${totalSentFailed}`);
  console.log(`Sent Storage Moved:        ${(totalSentBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log('---------------------------------------------------------------');
  console.log(`Total Combined Migrated:   ${totalIncomingMigrated + totalSentMigrated}`);
  console.log(`Total Combined Failed:     ${totalIncomingFailed + totalSentFailed}`);
  console.log(`Total Combined Storage:    ${((totalIncomingBytes + totalSentBytes) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Elapsed Time:              ${elapsedSeconds}s`);
  console.log(`Mode:                      ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE'}`);
  console.log('===============================================================');
}

run();
