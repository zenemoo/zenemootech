import 'dotenv/config';
import { supabase } from '../config/supabase.js';
import { emailR2Service } from '../services/emailR2Service.js';

/**
 * Zenemoo Supabase Email Heavy Content Reversible Cleanup Script
 *
 * SAFETY PRINCIPLES:
 * 1. Default mode is DRY-RUN (--dry-run or no args). Only runs if explicitly invoked with --execute.
 * 2. ONLY cleans rows where:
 *      - storage_migration_status = 'migrated'
 *      - storage_provider = 'cloudflare_r2'
 *      - body_html_r2_key IS NOT NULL
 * 3. Never touches scheduled_emails.
 * 4. Never drops tables or deletes email rows.
 * 5. All metadata (IDs, recipients, sender, timestamps, message_id, subject, snippet, status) is 100% PRESERVED.
 * 6. For incoming attachments: strips heavy Base64 content, preserving full metadata array (id, filename, contentType, size, r2_key)
 *    so UI display and R2 streaming download continue working without disruption.
 */

async function runCleanup() {
  const isExecute = process.argv.includes('--execute');
  const mode = isExecute ? 'EXECUTE' : 'DRY-RUN';

  console.log('========================================================================');
  console.log(`🧹 ZENEMOO SUPABASE EMAIL STORAGE CLEANUP [${mode} MODE]`);
  console.log('========================================================================\n');

  if (!isExecute) {
    console.log('ℹ️ Running in READ-ONLY DRY-RUN mode. No rows will be modified.\n');
  } else {
    console.log('⚠️ RUNNING IN EXECUTE MODE. Heavy content columns will be cleared.\n');
  }

  // 1. Inspect incoming_email_messages
  console.log('📦 Scanning incoming_email_messages for eligible rows...');
  const { data: incomingRows, error: incErr } = await supabase
    .from('incoming_email_messages')
    .select('id, subject, storage_migration_status, storage_provider, body_html_r2_key, body_html, body_text, raw_headers, attachments, attachments_meta, has_attachments');

  if (incErr) {
    console.error('❌ Failed to query incoming_email_messages:', incErr);
    process.exit(1);
  }

  let incomingEligible = [];
  let incomingIneligible = [];
  let incomingHeavyAttachmentsCount = 0;

  for (const row of incomingRows) {
    const isMigrated = row.storage_migration_status === 'migrated';
    const isR2 = row.storage_provider === 'cloudflare_r2';
    const hasKey = Boolean(row.body_html_r2_key);

    if (isMigrated && isR2 && hasKey) {
      incomingEligible.push(row);
      const atts = Array.isArray(row.attachments) ? row.attachments : [];
      if (atts.some(a => a && (a.content || a.base64 || a.data))) {
        incomingHeavyAttachmentsCount++;
      }
    } else {
      incomingIneligible.push({ id: row.id, status: row.storage_migration_status, provider: row.storage_provider, key: row.body_html_r2_key });
    }
  }

  console.log(`   Total incoming rows:                   ${incomingRows.length}`);
  console.log(`   Eligible for cleanup:                  ${incomingEligible.length}`);
  console.log(`   Ineligible (excluded):                 ${incomingIneligible.length}`);
  console.log(`   Rows with heavy Base64 in attachments: ${incomingHeavyAttachmentsCount}\n`);

  // 2. Inspect email_history
  console.log('📦 Scanning email_history for eligible rows...');
  const { data: sentRows, error: sentErr } = await supabase
    .from('email_history')
    .select('id, subject, storage_migration_status, storage_provider, body_html_r2_key, html');

  if (sentErr) {
    console.error('❌ Failed to query email_history:', sentErr);
    process.exit(1);
  }

  let sentEligible = [];
  let sentIneligible = [];

  for (const row of sentRows) {
    const isMigrated = row.storage_migration_status === 'migrated';
    const isR2 = row.storage_provider === 'cloudflare_r2';
    const hasKey = Boolean(row.body_html_r2_key);

    if (isMigrated && isR2 && hasKey) {
      sentEligible.push(row);
    } else {
      sentIneligible.push({ id: row.id, status: row.storage_migration_status, provider: row.storage_provider, key: row.body_html_r2_key });
    }
  }

  console.log(`   Total sent rows:                       ${sentRows.length}`);
  console.log(`   Eligible for cleanup:                  ${sentEligible.length}`);
  console.log(`   Ineligible (excluded):                 ${sentIneligible.length}\n`);

  // 3. Inspect scheduled_emails (Strictly Preserved)
  console.log('📦 Checking scheduled_emails table...');
  const { count: scheduledCount, error: schedErr } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true });

  if (schedErr) {
    console.error('❌ Failed to check scheduled_emails:', schedErr);
    process.exit(1);
  }
  console.log(`   Total scheduled_emails rows:           ${scheduledCount}`);
  console.log(`   Action on scheduled_emails:            PRESERVED (0 rows modified)\n`);

  if (!isExecute) {
    console.log('========================================================================');
    console.log('📋 DRY-RUN CLEANUP PREVIEW SUMMARY');
    console.log('========================================================================');
    console.log(`1. incoming_email_messages:`);
    console.log(`   - Eligible Rows to Update: ${incomingEligible.length} / ${incomingRows.length}`);
    console.log(`   - Columns to Clear / Nullify: body_html, body_text, raw_headers`);
    console.log(`   - Columns to Compact: attachments (replaced with lightweight metadata array, stripping Base64)`);
    console.log(`   - Preserved Columns: id, message_id, subject, sender, recipients, timestamps, snippet, category, state, R2 keys`);
    console.log(`2. email_history:`);
    console.log(`   - Eligible Rows to Update: ${sentEligible.length} / ${sentRows.length}`);
    console.log(`   - Columns to Clear / Nullify: html`);
    console.log(`   - Preserved Columns: id, message_id, subject, sender, recipients, timestamps, status, R2 keys`);
    console.log(`3. scheduled_emails:`);
    console.log(`   - All ${scheduledCount} rows untouched`);
    console.log('========================================================================');
    console.log('🛑 STOPPED: To execute this cleanup after receiving approval, run:');
    console.log('   node src/scripts/cleanupEmailContentSupabase.js --execute');
    console.log('========================================================================');
    return;
  }

  // EXECUTE MODE
  console.log('⏳ Executing content column cleanup in controlled batches with real-time R2 prevalidation...');

  // A. Clean incoming_email_messages
  let cleanedIncoming = 0;
  const skippedIncoming = [];
  const failedIncoming = [];
  const INCOMING_BATCH_SIZE = 15;
  for (let i = 0; i < incomingEligible.length; i += INCOMING_BATCH_SIZE) {
    const batch = incomingEligible.slice(i, i + INCOMING_BATCH_SIZE);
    await Promise.all(batch.map(async (row) => {
      // Create lightweight attachments array: strip content, data, base64
      let cleanAttachments = [];
      if (Array.isArray(row.attachments_meta) && row.attachments_meta.length > 0) {
        cleanAttachments = row.attachments_meta;
      } else if (Array.isArray(row.attachments)) {
        cleanAttachments = row.attachments.filter(Boolean).map((a, idx) => ({
          id: a.id || `att_${idx}`,
          filename: a.filename || a.name || 'attachment',
          contentType: a.contentType || a.type || 'application/octet-stream',
          size: typeof a.size === 'number' ? a.size : 1024,
          r2_key: a.r2_key || `incoming/${emailR2Service.sanitizeId(row.id)}/attachments/${emailR2Service.sanitizeFilename(a.filename || a.name)}`,
        }));
      }

      // 1. REAL-TIME PRE-CLEAR REVALIDATION IN R2
      const htmlKey = row.body_html_r2_key || `incoming/${emailR2Service.sanitizeId(row.id)}/body.html`;
      const htmlHead = await emailR2Service.verifyObjectExists(htmlKey);
      if (!htmlHead.exists || htmlHead.contentLength === 0) {
        console.warn(`⚠️ [PRE-CLEAR SKIP] Incoming row ${row.id}: R2 body HTML not verified (${htmlKey}). Record skipped and Supabase content untouched.`);
        skippedIncoming.push({ id: row.id, reason: `R2 body HTML not verified (${htmlKey})` });
        return;
      }

      let allAttachmentsVerified = true;
      let missingAttKey = null;
      for (const att of cleanAttachments) {
        if (att && att.r2_key) {
          const attHead = await emailR2Service.verifyObjectExists(att.r2_key);
          if (!attHead.exists || attHead.contentLength === 0) {
            allAttachmentsVerified = false;
            missingAttKey = att.r2_key;
            break;
          }
        }
      }

      if (!allAttachmentsVerified) {
        console.warn(`⚠️ [PRE-CLEAR SKIP] Incoming row ${row.id}: R2 attachment not verified (${missingAttKey}). Record skipped and Supabase content untouched.`);
        skippedIncoming.push({ id: row.id, reason: `R2 attachment not verified (${missingAttKey})` });
        return;
      }

      // 2. Cleared only if 100% verified in R2 right at this instant
      const { error: upErr } = await supabase
        .from('incoming_email_messages')
        .update({
          body_html: null,
          body_text: null,
          raw_headers: null,
          attachments: cleanAttachments,
        })
        .eq('id', row.id);

      if (upErr) {
        console.error(`❌ Failed to clean incoming email ${row.id}:`, upErr.message);
        failedIncoming.push({ id: row.id, error: upErr.message });
      } else {
        cleanedIncoming++;
      }
    }));
    console.log(`   Cleaned ${cleanedIncoming} / ${incomingEligible.length} incoming emails (Skipped: ${skippedIncoming.length})...`);
  }

  // B. Clean email_history
  let cleanedSent = 0;
  const skippedSent = [];
  const failedSent = [];
  const SENT_BATCH_SIZE = 15;
  for (let i = 0; i < sentEligible.length; i += SENT_BATCH_SIZE) {
    const batch = sentEligible.slice(i, i + SENT_BATCH_SIZE);
    await Promise.all(batch.map(async (row) => {
      // 1. REAL-TIME PRE-CLEAR REVALIDATION IN R2
      const htmlKey = row.body_html_r2_key || `sent/${emailR2Service.sanitizeId(row.id)}/body.html`;
      const htmlHead = await emailR2Service.verifyObjectExists(htmlKey);
      if (!htmlHead.exists || htmlHead.contentLength === 0) {
        console.warn(`⚠️ [PRE-CLEAR SKIP] Sent row ${row.id}: R2 body HTML not verified (${htmlKey}). Record skipped and Supabase content untouched.`);
        skippedSent.push({ id: row.id, reason: `R2 body HTML not verified (${htmlKey})` });
        return;
      }

      // 2. Cleared only if 100% verified in R2 right at this instant
      const { error: upErr } = await supabase
        .from('email_history')
        .update({
          html: null,
        })
        .eq('id', row.id);

      if (upErr) {
        console.error(`❌ Failed to clean sent email ${row.id}:`, upErr.message);
        failedSent.push({ id: row.id, error: upErr.message });
      } else {
        cleanedSent++;
      }
    }));
    console.log(`   Cleaned ${cleanedSent} / ${sentEligible.length} sent emails (Skipped: ${skippedSent.length})...`);
  }

  console.log('\n========================================================================');
  console.log('✅ CLEANUP EXECUTION COMPLETE');
  console.log('========================================================================');
  console.log(`Successfully cleaned incoming emails: ${cleanedIncoming} / ${incomingEligible.length}`);
  console.log(`Skipped incoming emails:              ${skippedIncoming.length}`);
  console.log(`Failed incoming emails:               ${failedIncoming.length}`);
  console.log('------------------------------------------------------------------------');
  console.log(`Successfully cleaned sent emails:     ${cleanedSent} / ${sentEligible.length}`);
  console.log(`Skipped sent emails:                  ${skippedSent.length}`);
  console.log(`Failed sent emails:                   ${failedSent.length}`);
  console.log('========================================================================');

  if (skippedIncoming.length > 0 || skippedSent.length > 0 || failedIncoming.length > 0 || failedSent.length > 0) {
    console.error(`⚠️ Issues encountered during execution:`);
    if (skippedIncoming.length) console.error('Skipped Incoming IDs:', skippedIncoming);
    if (skippedSent.length) console.error('Skipped Sent IDs:', skippedSent);
    if (failedIncoming.length) console.error('Failed Incoming IDs:', failedIncoming);
    if (failedSent.length) console.error('Failed Sent IDs:', failedSent);
    process.exit(1);
  }
}

runCleanup().catch(err => {
  console.error('Unhandled error in cleanup:', err);
  process.exit(1);
});
