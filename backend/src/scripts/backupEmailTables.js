import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { supabase } from '../config/supabase.js';

async function createDatabaseBackup() {
  console.log('========================================================================');
  console.log('📦 CREATING FULL VERIFIED PRE-MIGRATION BACKUP OF EMAIL TABLES');
  console.log('========================================================================\n');

  if (!supabase) {
    console.error('❌ Supabase client not initialized. Cannot create backup.');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups', `email_tables_backup_${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`Backup Destination: ${backupDir}\n`);

  function computeSha256(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  const tables = ['incoming_email_messages', 'email_history', 'scheduled_emails'];
  const manifest = {
    timestamp: new Date().toISOString(),
    backupDirectory: backupDir,
    tables: {},
  };

  for (const table of tables) {
    console.log(`Fetching all records from '${table}'...`);
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`❌ Failed to fetch table '${table}':`, error.message);
      process.exit(1);
    }

    const count = Array.isArray(data) ? data.length : 0;
    const jsonStr = JSON.stringify(data, null, 2);
    const filePath = path.join(backupDir, `${table}.json`);
    fs.writeFileSync(filePath, jsonStr, 'utf8');

    const stat = fs.statSync(filePath);
    const hash = computeSha256(jsonStr);

    // Immediate Read-Back Integrity Verification
    const readBack = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(readBack) || readBack.length !== count) {
      throw new Error(`Integrity check failed for ${table}: expected ${count} records, got ${readBack.length}`);
    }

    manifest.tables[table] = {
      recordCount: count,
      fileSizeBytes: stat.size,
      fileSizeMb: (stat.size / 1024 / 1024).toFixed(3),
      sha256: hash,
      verified: true,
    };

    console.log(`   ✅ Saved and verified: ${count} rows (${(stat.size / 1024 / 1024).toFixed(2)} MB, SHA256: ${hash.substring(0, 16)}...)`);
  }

  const manifestPath = path.join(backupDir, 'backup_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('\n========================================================================');
  console.log('✅ PRE-MIGRATION BACKUP COMPLETED AND VERIFIED 100% SUCCESSFUL');
  console.log(`Manifest: ${manifestPath}`);
  console.log('========================================================================\n');

  return { backupDir, manifest };
}

createDatabaseBackup().catch((err) => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
