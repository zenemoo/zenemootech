import 'dotenv/config';
import { supabase } from '../config/supabase.js';
import { emailR2Service } from '../services/emailR2Service.js';

async function verifyAllR2Objects() {
  console.log('========================================================================');
  console.log('🔍 DEEP VERIFICATION OF ALL R2 OBJECTS PRIOR TO SUPABASE CLEANUP');
  console.log('========================================================================\n');

  if (!emailR2Service.isConfigured()) {
    console.error('❌ Cloudflare R2 credentials are not configured in environment!');
    process.exit(1);
  }

  // 1. Fetch all incoming_email_messages
  console.log('📦 Fetching all rows from incoming_email_messages...');
  const { data: incomingRows, error: incErr } = await supabase
    .from('incoming_email_messages')
    .select('id, subject, storage_migration_status, storage_provider, body_html_r2_key, body_text_r2_key, has_attachments, attachments_meta, attachments');

  if (incErr) {
    console.error('❌ Failed to fetch incoming_email_messages:', incErr);
    process.exit(1);
  }

  console.log(`   Fetched ${incomingRows.length} incoming email rows.\n`);

  // 2. Fetch all email_history
  console.log('📦 Fetching all rows from email_history...');
  const { data: sentRows, error: sentErr } = await supabase
    .from('email_history')
    .select('id, subject, storage_migration_status, storage_provider, body_html_r2_key, attachments_meta');

  if (sentErr) {
    console.error('❌ Failed to fetch email_history:', sentErr);
    process.exit(1);
  }

  console.log(`   Fetched ${sentRows.length} sent email rows.\n`);

  let incomingVerifiedBodies = 0;
  let incomingVerifiedAttachments = 0;
  let incomingMissingObjects = [];
  let incomingEligibleForCleanup = 0;
  let incomingIneligible = [];

  // Helper for checking R2 key
  async function checkKey(key, context) {
    if (!key) return { exists: false, size: 0, reason: 'Key is null/empty' };
    try {
      const exists = await emailR2Service.verifyObjectExists(key);
      if (!exists) return { exists: false, size: 0, reason: 'R2 HeadObject returned not found (404)' };
      const buf = await emailR2Service.getObjectBuffer(key);
      const size = buf && buf.buffer ? buf.buffer.length : 0;
      return { exists: true, size };
    } catch (err) {
      return { exists: false, size: 0, reason: err.message };
    }
  }

  console.log('⏳ Verifying 327 incoming email R2 objects...');
  const BATCH_SIZE = 10;
  for (let i = 0; i < incomingRows.length; i += BATCH_SIZE) {
    const chunk = incomingRows.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map(async (row) => {
      let rowValid = true;

      // Check body_html_r2_key
      const htmlKey = row.body_html_r2_key || `incoming/${row.id}/body.html`;
      const htmlCheck = await checkKey(htmlKey, `incoming:${row.id}:html`);
      if (htmlCheck.exists) {
        incomingVerifiedBodies++;
      } else {
        rowValid = false;
        incomingMissingObjects.push({ table: 'incoming_email_messages', id: row.id, key: htmlKey, type: 'html', reason: htmlCheck.reason });
      }

      // Check attachments
      const atts = Array.isArray(row.attachments_meta) && row.attachments_meta.length > 0
        ? row.attachments_meta
        : (Array.isArray(row.attachments) ? row.attachments : []);

      for (const att of atts) {
        if (att && (att.r2_key || att.filename || att.name)) {
          const attKey = att.r2_key || `incoming/${emailR2Service.sanitizeId(row.id)}/attachments/${emailR2Service.sanitizeFilename(att.filename || att.name)}`;
          const attCheck = await checkKey(attKey, `incoming:${row.id}:att:${att.filename || att.name}`);
          if (attCheck.exists) {
            incomingVerifiedAttachments++;
          } else {
            rowValid = false;
            incomingMissingObjects.push({ table: 'incoming_email_messages', id: row.id, key: attKey, type: 'attachment', reason: attCheck.reason });
          }
        }
      }

      if (rowValid) {
        incomingEligibleForCleanup++;
      } else {
        incomingIneligible.push(row.id);
      }
    }));
  }

  console.log(`   Incoming Emails Verified:`);
  console.log(`     - Verified HTML bodies in R2: ${incomingVerifiedBodies} / ${incomingRows.length}`);
  console.log(`     - Verified attachments in R2: ${incomingVerifiedAttachments}`);
  console.log(`     - Missing objects: ${incomingMissingObjects.length}`);
  console.log(`     - Eligible rows for cleanup: ${incomingEligibleForCleanup} / ${incomingRows.length}\n`);

  let sentVerifiedBodies = 0;
  let sentVerifiedAttachments = 0;
  let sentMissingObjects = [];
  let sentEligibleForCleanup = 0;
  let sentIneligible = [];

  console.log('⏳ Verifying 276 sent email R2 objects...');
  for (let i = 0; i < sentRows.length; i += BATCH_SIZE) {
    const chunk = sentRows.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map(async (row) => {
      let rowValid = true;

      const htmlKey = row.body_html_r2_key || `sent/${row.id}/body.html`;
      const htmlCheck = await checkKey(htmlKey, `sent:${row.id}:html`);
      if (htmlCheck.exists) {
        sentVerifiedBodies++;
      } else {
        rowValid = false;
        sentMissingObjects.push({ table: 'email_history', id: row.id, key: htmlKey, type: 'html', reason: htmlCheck.reason });
      }

      const atts = Array.isArray(row.attachments_meta) ? row.attachments_meta : [];
      for (const att of atts) {
        if (att && att.r2_key) {
          const attCheck = await checkKey(att.r2_key, `sent:${row.id}:att`);
          if (attCheck.exists) {
            sentVerifiedAttachments++;
          } else {
            rowValid = false;
            sentMissingObjects.push({ table: 'email_history', id: row.id, key: att.r2_key, type: 'attachment', reason: attCheck.reason });
          }
        }
      }

      if (rowValid) {
        sentEligibleForCleanup++;
      } else {
        sentIneligible.push(row.id);
      }
    }));
  }

  console.log(`   Sent Emails Verified:`);
  console.log(`     - Verified HTML bodies in R2: ${sentVerifiedBodies} / ${sentRows.length}`);
  console.log(`     - Verified attachments in R2: ${sentVerifiedAttachments}`);
  console.log(`     - Missing objects: ${sentMissingObjects.length}`);
  console.log(`     - Eligible rows for cleanup: ${sentEligibleForCleanup} / ${sentRows.length}\n`);

  console.log('========================================================================');
  console.log('📊 COMPREHENSIVE VERIFICATION AUDIT SUMMARY');
  console.log('========================================================================');
  console.log(`Total Incoming Rows:          ${incomingRows.length}`);
  console.log(`Incoming Eligible:            ${incomingEligibleForCleanup}`);
  console.log(`Incoming Ineligible:          ${incomingIneligible.length}`);
  console.log(`Incoming Missing Objects:     ${incomingMissingObjects.length}`);
  console.log('------------------------------------------------------------------------');
  console.log(`Total Sent Rows:              ${sentRows.length}`);
  console.log(`Sent Eligible:                ${sentEligibleForCleanup}`);
  console.log(`Sent Ineligible:              ${sentIneligible.length}`);
  console.log(`Sent Missing Objects:         ${sentMissingObjects.length}`);
  console.log('========================================================================');

  if (incomingMissingObjects.length > 0 || sentMissingObjects.length > 0) {
    console.error('❌ Verification found missing objects:');
    console.error('Incoming:', incomingMissingObjects);
    console.error('Sent:', sentMissingObjects);
    process.exit(1);
  } else {
    console.log('✅ ALL R2 OBJECTS INDEPENDENTLY VERIFIED — ZERO MISSING OBJECTS');
    process.exit(0);
  }
}

verifyAllR2Objects().catch(err => {
  console.error('Unhandled error in verification:', err);
  process.exit(1);
});
