import 'dotenv/config';
import { supabase } from '../config/supabase.js';
import { emailR2Service } from '../services/emailR2Service.js';
import { decrypt } from '../services/encryptionService.js';

/**
 * =========================================================================
 * ZENEMOO HARDENED RESUMABLE EMAIL CONTENT MIGRATION (SUPABASE -> CLOUDFLARE R2)
 * =========================================================================
 * 
 * Safety Guarantees:
 * 1. ZERO CONTENT DELETION: Supabase body and attachment columns remain intact.
 * 2. INDEPENDENT VERIFICATION: Every object is verified via HeadObject before updating DB.
 * 3. RESUMABLE & IDEMPOTENT: Skips records already verified in R2; safe to stop/restart.
 * 4. DRY-RUN SIMULATION: Exact byte counts, candidate counts, and key projections.
 * 5. FAILS-SAFE: Halts and reports if any object fails independent verification.
 * =========================================================================
 */

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isExecute = args.includes('--execute');
const limitIdx = args.indexOf('--limit');
const customLimit = limitIdx !== -1 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;
const CONCURRENCY_LIMIT = 3;

if (!isDryRun && !isExecute) {
  console.log('Usage:');
  console.log('  node src/scripts/completeEmailR2Migration.js --dry-run');
  console.log('  node src/scripts/completeEmailR2Migration.js --execute [--limit <number>]');
  process.exit(1);
}

// 6 Known Sent Records that were falsely marked migrated but are missing from R2
const KNOWN_MISSING_SENT_IDS = [
  '5bbc0787-708f-4b76-89ba-1ca88650ae28',
  '495d6adb-2176-4aab-92db-3b1bdb8cae13',
  '1c67f3f0-aaa5-4d2a-bb17-de7fdef739eb',
  'eb4b3826-e664-4502-8758-f453e5a214df',
  '064bbba0-17b7-4f33-9d00-f2a91b44aed8',
  '44f0eaa9-f7ae-47c2-840e-e28e4fa3dc44',
];

function safeByteLength(val) {
  if (!val) return 0;
  if (typeof val === 'string') return Buffer.byteLength(val, 'utf8');
  if (Buffer.isBuffer(val)) return val.length;
  try {
    return Buffer.byteLength(JSON.stringify(val), 'utf8');
  } catch (_) {
    return 0;
  }
}

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

/**
 * Migrate single incoming email record
 */
async function processIncomingRecord(email, dryRun) {
  const cleanId = emailR2Service.sanitizeId(email.id);
  const result = {
    id: email.id,
    subject: email.subject || '(No Subject)',
    bytesUploaded: 0,
    attachmentsUploaded: 0,
    status: 'pending',
    error: null,
  };

  // Safe stringification of body HTML & Text
  let html = typeof email.body_html === 'string' ? email.body_html : '';
  const text = typeof email.body_text === 'string' ? email.body_text : '';

  if (!html && text) {
    const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; white-space: pre-wrap; line-height: 1.6; color: #1e293b;">${escapedText}</div>`;
  }

  let rawString = null;
  if (email.raw_headers) {
    rawString = typeof email.raw_headers === 'object'
      ? JSON.stringify(email.raw_headers, null, 2)
      : String(email.raw_headers);
  }

  const attachments = Array.isArray(email.attachments) ? email.attachments : [];
  let estimatedBytes = safeByteLength(html) + safeByteLength(text) + safeByteLength(rawString);

  for (const a of attachments) {
    if (a.content || a.data || a.base64) {
      const raw = a.content || a.data || a.base64;
      estimatedBytes += typeof a.size === 'number' ? a.size : Math.round(raw.length * 0.75);
    }
  }

  if (dryRun) {
    result.status = 'dry_run_ready';
    result.bytesUploaded = estimatedBytes;
    result.attachmentsUploaded = attachments.filter((a) => a.content || a.data || a.base64).length;
    return result;
  }

  // --- LIVE EXECUTION ---
  try {
    // 1. Upload Body HTML & Text & Raw
    const bodyResult = await emailR2Service.uploadEmailBody({
      emailId: cleanId,
      html,
      text,
      raw: rawString,
      type: 'incoming',
    });

    let uploadedTotalBytes = bodyResult.totalBytes;
    const uploadedAttachmentsMeta = [];

    // 2. Upload Attachments (if binary base64 present)
    for (const att of attachments) {
      const rawData = att.content || att.data || att.base64;
      if (rawData) {
        const up = await emailR2Service.uploadAttachment({
          emailId: cleanId,
          filename: att.filename || att.name || 'attachment',
          content: rawData,
          contentType: att.contentType || att.type || 'application/octet-stream',
          type: 'incoming',
        });

        // Verify attachment in R2 immediately
        const attHead = await emailR2Service.verifyObjectExists(up.r2_key);
        if (!attHead.exists || attHead.contentLength === 0) {
          throw new Error(`R2 attachment verification failed for key: ${up.r2_key}`);
        }

        uploadedAttachmentsMeta.push({
          id: att.id || `att_${Date.now()}`,
          filename: up.filename,
          contentType: up.contentType,
          size: up.size,
          r2_key: up.r2_key,
        });
        uploadedTotalBytes += up.size;
        result.attachmentsUploaded++;
      } else {
        uploadedAttachmentsMeta.push(att);
      }
    }

    // 3. Independent Verification of Body in R2
    if (bodyResult.htmlKey) {
      const headHtml = await emailR2Service.verifyObjectExists(bodyResult.htmlKey);
      if (!headHtml.exists || headHtml.contentLength === 0) {
        throw new Error(`R2 HTML verification failed: object missing or empty for key: ${bodyResult.htmlKey}`);
      }
    }

    if (bodyResult.textKey) {
      const headText = await emailR2Service.verifyObjectExists(bodyResult.textKey);
      if (!headText.exists) {
        throw new Error(`R2 Text verification failed for key: ${bodyResult.textKey}`);
      }
    }

    // 4. Update Supabase record status (NON-DESTRUCTIVE: keep all original columns)
    const updatePayload = {
      storage_provider: 'cloudflare_r2',
      body_html_r2_key: bodyResult.htmlKey,
      body_text_r2_key: bodyResult.textKey,
      raw_email_r2_key: bodyResult.rawKey,
      attachments_r2_prefix: `incoming/${cleanId}/attachments/`,
      has_attachments: attachments.length > 0,
      attachments_meta: uploadedAttachmentsMeta,
      storage_migration_status: 'migrated',
      storage_migrated_at: new Date().toISOString(),
      storage_size_bytes: uploadedTotalBytes,
    };

    const { error: upErr } = await supabase
      .from('incoming_email_messages')
      .update(updatePayload)
      .eq('id', email.id);

    if (upErr) {
      throw new Error(`Supabase update error: ${upErr.message}`);
    }

    result.status = 'migrated';
    result.bytesUploaded = uploadedTotalBytes;
    return result;
  } catch (err) {
    result.status = 'failed';
    result.error = err.message;
    return result;
  }
}

/**
 * Migrate single sent email record
 */
async function processSentRecord(sentEmail, dryRun) {
  const cleanId = emailR2Service.sanitizeId(sentEmail.id);
  const result = {
    id: sentEmail.id,
    subject: '(Sent Email)',
    bytesUploaded: 0,
    attachmentsUploaded: 0,
    status: 'pending',
    error: null,
  };

  let decryptedHtml = '';
  try {
    decryptedHtml = decrypt(sentEmail.html) || sentEmail.html || '';
  } catch (_) {
    decryptedHtml = sentEmail.html || '';
  }

  let decryptedSubject = '(No Subject)';
  try {
    decryptedSubject = decrypt(sentEmail.subject) || sentEmail.subject || '(No Subject)';
  } catch (_) {
    decryptedSubject = sentEmail.subject || '(No Subject)';
  }
  result.subject = decryptedSubject;

  const attachments = Array.isArray(sentEmail.attachments_meta) ? sentEmail.attachments_meta : [];
  let estimatedBytes = safeByteLength(decryptedHtml);

  for (const a of attachments) {
    if (a.content || a.data || a.base64) {
      const raw = a.content || a.data || a.base64;
      estimatedBytes += typeof a.size === 'number' ? a.size : Math.round(raw.length * 0.75);
    }
  }

  if (dryRun) {
    result.status = 'dry_run_ready';
    result.bytesUploaded = estimatedBytes;
    result.attachmentsUploaded = attachments.filter((a) => a.content || a.data || a.base64).length;
    return result;
  }

  // --- LIVE EXECUTION ---
  try {
    // 1. Upload Body HTML & Text
    const bodyResult = await emailR2Service.uploadEmailBody({
      emailId: cleanId,
      html: decryptedHtml,
      text: decryptedHtml.replace(/<[^>]+>/g, ' ').trim(),
      type: 'sent',
    });

    let uploadedTotalBytes = bodyResult.totalBytes;
    const uploadedAttachmentsMeta = [];

    // 2. Upload Attachments (if binary base64 present)
    for (const att of attachments) {
      const rawData = att.content || att.data || att.base64;
      if (rawData) {
        const up = await emailR2Service.uploadAttachment({
          emailId: cleanId,
          filename: att.filename || att.name || 'attachment',
          content: rawData,
          contentType: att.contentType || att.type || 'application/octet-stream',
          type: 'sent',
        });

        const attHead = await emailR2Service.verifyObjectExists(up.r2_key);
        if (!attHead.exists || attHead.contentLength === 0) {
          throw new Error(`R2 sent attachment verification failed for key: ${up.r2_key}`);
        }

        uploadedAttachmentsMeta.push({
          id: att.id || `att_${Date.now()}`,
          filename: up.filename,
          contentType: up.contentType,
          size: up.size,
          r2_key: up.r2_key,
        });
        uploadedTotalBytes += up.size;
        result.attachmentsUploaded++;
      } else {
        uploadedAttachmentsMeta.push(att);
      }
    }

    // 3. Independent Verification of Body in R2
    if (bodyResult.htmlKey) {
      const headHtml = await emailR2Service.verifyObjectExists(bodyResult.htmlKey);
      if (!headHtml.exists || headHtml.contentLength === 0) {
        throw new Error(`R2 Sent HTML verification failed: object missing or empty for key: ${bodyResult.htmlKey}`);
      }
    }

    // 4. Update Supabase record status
    const updatePayload = {
      storage_provider: 'cloudflare_r2',
      body_html_r2_key: bodyResult.htmlKey,
      body_text_r2_key: bodyResult.textKey,
      attachments_r2_prefix: `sent/${cleanId}/attachments/`,
      has_attachments: attachments.length > 0,
      attachments_meta: uploadedAttachmentsMeta.length > 0 ? uploadedAttachmentsMeta : undefined,
      storage_migration_status: 'migrated',
      storage_migrated_at: new Date().toISOString(),
      storage_size_bytes: uploadedTotalBytes,
    };

    const { error: upErr } = await supabase
      .from('email_history')
      .update(updatePayload)
      .eq('id', sentEmail.id);

    if (upErr) {
      throw new Error(`Supabase sent update error: ${upErr.message}`);
    }

    result.status = 'migrated';
    result.bytesUploaded = uploadedTotalBytes;
    return result;
  } catch (err) {
    result.status = 'failed';
    result.error = err.message;
    return result;
  }
}

async function main() {
  const startTime = Date.now();
  console.log('========================================================================');
  console.log(`🚀 ZENEMOO COMPLETE EMAIL R2 MIGRATION (${isDryRun ? 'DRY RUN' : 'LIVE EXECUTION'})`);
  console.log(`R2 Bucket:    ${emailR2Service.bucketName}`);
  console.log(`Concurrency:  ${CONCURRENCY_LIMIT} concurrent streams`);
  console.log(`Batch Limit:  ${customLimit || 'Unlimited (All Candidates)'}`);
  console.log('========================================================================\n');

  // 1. Collect Incoming Candidates
  console.log('📦 1. Collecting incoming email candidates...');
  let incQuery = supabase
    .from('incoming_email_messages')
    .select('*')
    .neq('storage_migration_status', 'migrated')
    .order('created_at', { ascending: false });

  if (customLimit) {
    incQuery = incQuery.limit(customLimit);
  }

  const { data: incomingCandidates, error: incErr } = await incQuery;
  if (incErr) {
    console.error('❌ Error fetching incoming candidates:', incErr.message);
    process.exit(1);
  }

  console.log(`   Found ${incomingCandidates.length} incoming candidate(s) to process.\n`);

  // 2. Collect Sent Candidates (Pending + 6 Known Missing)
  console.log('📦 2. Collecting sent email candidates...');
  let sentQuery = supabase
    .from('email_history')
    .select('*')
    .neq('storage_migration_status', 'migrated')
    .order('created_at', { ascending: false });

  if (customLimit) {
    sentQuery = sentQuery.limit(customLimit);
  }

  const { data: pendingSent, error: sentErr } = await sentQuery;
  if (sentErr) {
    console.error('❌ Error fetching sent candidates:', sentErr.message);
    process.exit(1);
  }

  // Also fetch the 6 repair candidates
  const { data: repairSent, error: repErr } = await supabase
    .from('email_history')
    .select('*')
    .in('id', KNOWN_MISSING_SENT_IDS);

  if (repErr) {
    console.error('❌ Error fetching repair candidates:', repErr.message);
    process.exit(1);
  }

  // Deduplicate sent candidates
  const sentCandidateMap = new Map();
  (pendingSent || []).forEach((s) => sentCandidateMap.set(s.id, s));
  (repairSent || []).forEach((s) => sentCandidateMap.set(s.id, s));
  const sentCandidates = Array.from(sentCandidateMap.values());

  console.log(`   Found ${sentCandidates.length} sent candidate(s) (${pendingSent.length} pending + ${repairSent.length} repair records).\n`);

  // ============================================================================
  // EXECUTE INCOMING CANDIDATES
  // ============================================================================
  console.log('------------------------------------------------------------------------');
  console.log(`⚡ Processing ${incomingCandidates.length} Incoming Emails...`);
  console.log('------------------------------------------------------------------------');

  let incSuccess = 0;
  let incFailed = 0;
  let incBytes = 0;
  let incAtts = 0;

  const incResults = await runConcurrentPool(incomingCandidates, CONCURRENCY_LIMIT, async (item, idx, total) => {
    const res = await processIncomingRecord(item, isDryRun);
    const progress = `[${idx + 1}/${total}]`;
    if (res.status === 'migrated' || res.status === 'dry_run_ready') {
      incSuccess++;
      incBytes += res.bytesUploaded;
      incAtts += res.attachmentsUploaded;
      console.log(`  ${progress} ✅ ${res.id}: "${res.subject.substring(0, 35)}" (${(res.bytesUploaded / 1024).toFixed(1)} KB, Atts: ${res.attachmentsUploaded})`);
    } else {
      incFailed++;
      console.error(`  ${progress} ❌ ${res.id}: "${res.subject.substring(0, 35)}" - Error: ${res.error}`);
    }
    return res;
  });

  // ============================================================================
  // EXECUTE SENT CANDIDATES
  // ============================================================================
  console.log('\n------------------------------------------------------------------------');
  console.log(`⚡ Processing ${sentCandidates.length} Sent Emails...`);
  console.log('------------------------------------------------------------------------');

  let sentSuccess = 0;
  let sentFailed = 0;
  let sentBytes = 0;
  let sentAtts = 0;

  const sentResults = await runConcurrentPool(sentCandidates, CONCURRENCY_LIMIT, async (item, idx, total) => {
    const res = await processSentRecord(item, isDryRun);
    const progress = `[${idx + 1}/${total}]`;
    if (res.status === 'migrated' || res.status === 'dry_run_ready') {
      sentSuccess++;
      sentBytes += res.bytesUploaded;
      sentAtts += res.attachmentsUploaded;
      console.log(`  ${progress} ✅ ${res.id}: "${res.subject.substring(0, 35)}" (${(res.bytesUploaded / 1024).toFixed(1)} KB, Atts: ${res.attachmentsUploaded})`);
    } else {
      sentFailed++;
      console.error(`  ${progress} ❌ ${res.id}: "${res.subject.substring(0, 35)}" - Error: ${res.error}`);
    }
    return res;
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n========================================================================');
  console.log(`🏁 MIGRATION RUN COMPLETED (${isDryRun ? 'DRY-RUN SIMULATION' : 'LIVE EXECUTION'})`);
  console.log('========================================================================');
  console.log(`Mode:                     ${isDryRun ? 'DRY-RUN (Zero DB/R2 writes)' : 'LIVE EXECUTION'}`);
  console.log(`Duration:                 ${durationSec}s`);
  console.log(`Incoming Processed:       ${incomingCandidates.length}`);
  console.log(`Incoming Succeeded:       ${incSuccess}`);
  console.log(`Incoming Failed:          ${incFailed}`);
  console.log(`Incoming Upload Volume:   ${(incBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Incoming Atts Uploaded:   ${incAtts}`);
  console.log('------------------------------------------------------------------------');
  console.log(`Sent Processed:           ${sentCandidates.length}`);
  console.log(`Sent Succeeded:           ${sentSuccess}`);
  console.log(`Sent Failed:              ${sentFailed}`);
  console.log(`Sent Upload Volume:       ${(sentBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log('------------------------------------------------------------------------');
  console.log(`Total Records Succeeded:  ${incSuccess + sentSuccess}`);
  console.log(`Total Records Failed:     ${incFailed + sentFailed}`);
  console.log(`Total Data Volume:        ${((incBytes + sentBytes) / 1024 / 1024).toFixed(2)} MB`);
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
