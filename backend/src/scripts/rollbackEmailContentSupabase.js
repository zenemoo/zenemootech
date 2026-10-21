import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase.js';

/**
 * Zenemoo Supabase Email Rollback Script
 * Restores body_html, body_text, raw_headers, attachments, and html from verified pre-migration backup.
 */

async function runRollback() {
  const isExecute = process.argv.includes('--execute');
  const mode = isExecute ? 'EXECUTE' : 'DRY-RUN';

  const dirIdx = process.argv.indexOf('--backup-dir');
  const cliBackupDir = dirIdx !== -1 && process.argv[dirIdx + 1] ? process.argv[dirIdx + 1] : null;
  const localDefaultDir = path.resolve('backups/email_tables_backup_2026-10-20T19-47-59-956Z');
  const externalSafeDir = 'C:\\Users\\mrpre\\Zenemoo_Email_Backups\\email_tables_backup_2026-10-20T19-47-59-956Z';

  let backupDir = cliBackupDir || (fs.existsSync(localDefaultDir) ? localDefaultDir : externalSafeDir);

  console.log('========================================================================');
  console.log(`🔄 ZENEMOO SUPABASE EMAIL ROLLBACK [${mode} MODE]`);
  console.log('========================================================================\n');
  console.log(`Backup Directory: ${backupDir}\n`);

  if (!fs.existsSync(backupDir)) {
    console.error('❌ Backup directory does not exist:', backupDir);
    process.exit(1);
  }

  const incBackupFile = path.join(backupDir, 'incoming_email_messages.json');
  const sentBackupFile = path.join(backupDir, 'email_history.json');

  if (!fs.existsSync(incBackupFile) || !fs.existsSync(sentBackupFile)) {
    console.error('❌ Backup JSON files missing!');
    process.exit(1);
  }

  const incomingBackup = JSON.parse(fs.readFileSync(incBackupFile, 'utf8'));
  const sentBackup = JSON.parse(fs.readFileSync(sentBackupFile, 'utf8'));

  console.log(`Loaded backup data:`);
  console.log(`  - Incoming emails in backup: ${incomingBackup.length}`);
  console.log(`  - Sent emails in backup:     ${sentBackup.length}\n`);

  if (!isExecute) {
    console.log('ℹ️ DRY-RUN: Rollback preview verified. To execute rollback, run:');
    console.log('   node src/scripts/rollbackEmailContentSupabase.js --execute\n');
    return;
  }

  console.log('⏳ Restoring incoming_email_messages content columns...');
  let restoredIncoming = 0;
  const failedIncoming = [];
  const BATCH_SIZE = 25;
  for (let i = 0; i < incomingBackup.length; i += BATCH_SIZE) {
    const batch = incomingBackup.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (row) => {
      const { error: upErr } = await supabase
        .from('incoming_email_messages')
        .update({
          body_html: row.body_html,
          body_text: row.body_text,
          raw_headers: row.raw_headers,
          attachments: row.attachments,
        })
        .eq('id', row.id);

      if (upErr) {
        console.error(`❌ Failed to rollback incoming email ${row.id}:`, upErr.message);
        failedIncoming.push({ id: row.id, error: upErr.message });
      } else {
        restoredIncoming++;
      }
    }));
    console.log(`   Restored ${restoredIncoming} / ${incomingBackup.length} incoming emails...`);
  }

  console.log('⏳ Restoring email_history content columns...');
  let restoredSent = 0;
  const failedSent = [];
  for (let i = 0; i < sentBackup.length; i += BATCH_SIZE) {
    const batch = sentBackup.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (row) => {
      const { error: upErr } = await supabase
        .from('email_history')
        .update({
          html: row.html,
        })
        .eq('id', row.id);

      if (upErr) {
        console.error(`❌ Failed to rollback sent email ${row.id}:`, upErr.message);
        failedSent.push({ id: row.id, error: upErr.message });
      } else {
        restoredSent++;
      }
    }));
    console.log(`   Restored ${restoredSent} / ${sentBackup.length} sent emails...`);
  }

  console.log('\n========================================================================');
  console.log('✅ ROLLBACK EXECUTION COMPLETE');
  console.log('========================================================================');
  console.log(`Restored incoming emails: ${restoredIncoming} / ${incomingBackup.length}`);
  console.log(`Restored sent emails:     ${restoredSent} / ${sentBackup.length}`);
  if (failedIncoming.length > 0 || failedSent.length > 0) {
    console.error(`⚠️ Rollback encountered failures: ${failedIncoming.length} incoming, ${failedSent.length} sent`);
    if (failedIncoming.length) console.error('Failed Incoming IDs:', failedIncoming);
    if (failedSent.length) console.error('Failed Sent IDs:', failedSent);
    process.exit(1);
  }
  console.log('========================================================================');
}

runRollback().catch(err => {
  console.error('Unhandled error in rollback:', err);
  process.exit(1);
});
