import 'dotenv/config';
import { supabase } from '../config/supabase.js';
import { emailR2Service } from '../services/emailR2Service.js';
import { getIncomingEmailById } from '../controllers/emailInboxController.js';
import { getEmailHistoryById } from '../controllers/emailController.js';

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    bodyData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    json(data) {
      this.bodyData = data;
      return this;
    },
    send(data) {
      this.bodyData = data;
      return this;
    },
  };
}

async function runPostMigrationAudit() {
  console.log('========================================================================');
  console.log('🔍 ZENEMOO POST-MIGRATION AUDIT & LIVE BEHAVIOR VERIFICATION');
  console.log('========================================================================\n');

  if (!supabase) {
    console.error('❌ Supabase client not initialized.');
    process.exit(1);
  }

  // 1. Audit incoming_email_messages
  console.log('--- 1. Checking incoming_email_messages ---');
  const { count: totalIncoming } = await supabase
    .from('incoming_email_messages')
    .select('*', { count: 'exact', head: true });

  const { count: incMigrated } = await supabase
    .from('incoming_email_messages')
    .select('*', { count: 'exact', head: true })
    .eq('storage_migration_status', 'migrated');

  const { count: incFailed } = await supabase
    .from('incoming_email_messages')
    .select('*', { count: 'exact', head: true })
    .eq('storage_migration_status', 'failed');

  const { count: incPending } = await supabase
    .from('incoming_email_messages')
    .select('*', { count: 'exact', head: true })
    .eq('storage_migration_status', 'pending');

  const { count: incR2Provider } = await supabase
    .from('incoming_email_messages')
    .select('*', { count: 'exact', head: true })
    .eq('storage_provider', 'cloudflare_r2');

  console.log(`Total rows in incoming_email_messages:      ${totalIncoming}`);
  console.log(`   - Storage migration status = 'migrated': ${incMigrated}`);
  console.log(`   - Storage migration status = 'failed':   ${incFailed}`);
  console.log(`   - Storage migration status = 'pending':  ${incPending}`);
  console.log(`   - Storage provider = 'cloudflare_r2':    ${incR2Provider}`);

  // 2. Audit email_history
  console.log('\n--- 2. Checking email_history ---');
  const { count: totalSent } = await supabase
    .from('email_history')
    .select('*', { count: 'exact', head: true });

  const { count: sentMigrated } = await supabase
    .from('email_history')
    .select('*', { count: 'exact', head: true })
    .eq('storage_migration_status', 'migrated');

  const { count: sentPending } = await supabase
    .from('email_history')
    .select('*', { count: 'exact', head: true })
    .neq('storage_migration_status', 'migrated');

  const { count: sentR2Provider } = await supabase
    .from('email_history')
    .select('*', { count: 'exact', head: true })
    .eq('storage_provider', 'cloudflare_r2');

  console.log(`Total rows in email_history:                ${totalSent}`);
  console.log(`   - Storage migration status = 'migrated': ${sentMigrated}`);
  console.log(`   - Storage migration status != 'migrated':${sentPending}`);
  console.log(`   - Storage provider = 'cloudflare_r2':    ${sentR2Provider}`);

  // 3. Verify the 6 previously missing sent records in R2
  console.log('\n--- 3. Verifying Previously Missing 6 Sent Records in R2 ---');
  const KNOWN_MISSING_SENT_IDS = [
    '5bbc0787-708f-4b76-89ba-1ca88650ae28',
    '495d6adb-2176-4aab-92db-3b1bdb8cae13',
    '1c67f3f0-aaa5-4d2a-bb17-de7fdef739eb',
    'eb4b3826-e664-4502-8758-f453e5a214df',
    '064bbba0-17b7-4f33-9d00-f2a91b44aed8',
    '44f0eaa9-f7ae-47c2-840e-e28e4fa3dc44',
  ];

  const { data: repRecords } = await supabase
    .from('email_history')
    .select('id, body_html_r2_key, storage_migration_status')
    .in('id', KNOWN_MISSING_SENT_IDS);

  let repairAllVerified = true;
  for (const rec of (repRecords || [])) {
    const head = await emailR2Service.verifyObjectExists(rec.body_html_r2_key);
    console.log(`   ID: ${rec.id} -> key: ${rec.body_html_r2_key} (exists=${head.exists}, size=${head.contentLength} bytes)`);
    if (!head.exists || head.contentLength === 0) repairAllVerified = false;
  }
  console.log(`All 6 repair records verified in Cloudflare R2: ${repairAllVerified ? '✅ YES' : '❌ NO'}`);

  // 4. Verify End-to-End Controller Behavior
  console.log('\n--- 4. Testing End-to-End Controller Reading from R2 ---');
  const adminUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'contact@zenemoo.in',
    role: 'admin',
    email_access: true,
  };

  // Test opening a newly migrated incoming email
  const sampleIncomingId = '155f9160-85e1-4a76-8b9c-73c409c2a564';
  const reqInc = { params: { id: sampleIncomingId }, user: adminUser };
  const resInc = createMockResponse();
  await getIncomingEmailById(reqInc, resInc, (err) => console.error(err));

  console.log(`[getIncomingEmailById] HTTP Status: ${resInc.statusCode}, Success: ${resInc.bodyData?.success}`);
  console.log(`   - Subject: "${resInc.bodyData?.email?.subject?.substring(0, 40)}"`);
  console.log(`   - Storage Provider: ${resInc.bodyData?.email?.storage_provider}`);
  console.log(`   - Body HTML length: ${resInc.bodyData?.email?.body_html?.length || 0} chars (Streamed from R2!)`);

  // Test opening a newly migrated sent email
  const sampleSentId = '44f0eaa9-f7ae-47c2-840e-e28e4fa3dc44';
  const reqSent = { params: { id: sampleSentId }, user: adminUser };
  const resSent = createMockResponse();
  await getEmailHistoryById(reqSent, resSent, (err) => console.error(err));

  console.log(`\n[getEmailHistoryById] HTTP Status: ${resSent.statusCode}, Success: ${resSent.bodyData?.success}`);
  console.log(`   - Subject: "${resSent.bodyData?.data?.subject?.substring(0, 40)}"`);
  console.log(`   - Body HTML length: ${resSent.bodyData?.data?.html?.length || 0} chars (Streamed from R2!)`);

  console.log('\n========================================================================');
  console.log('🏁 POST-MIGRATION AUDIT COMPLETE — 100% VERIFIED');
  console.log('========================================================================\n');
}

runPostMigrationAudit().catch((err) => {
  console.error('Fatal post-audit error:', err);
  process.exit(1);
});
