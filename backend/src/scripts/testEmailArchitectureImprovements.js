import 'dotenv/config';
import { supabase } from '../config/supabase.js';
import { emailR2Service } from '../services/emailR2Service.js';
import { getIncomingEmails, getIncomingEmailById, deleteIncomingEmail, getSentEmails } from '../controllers/emailInboxController.js';
import { getEmailHistory, getEmailHistoryById, deleteEmailHistory } from '../controllers/emailController.js';
import { createScheduledEmail, getScheduledEmailById, cancelScheduledEmail } from '../controllers/scheduledEmailController.js';

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
    send(data) {
      this.bodyData = data;
      return this;
    },
    json(data) {
      this.bodyData = data;
      return this;
    },
  };
}

async function runImprovementsTestSuite() {
  console.log('================================================================');
  console.log('🧪 VERIFYING PRODUCTION-SAFE EMAIL ARCHITECTURE IMPROVEMENTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const adminUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'contact@zenemoo.in',
    role: 'admin',
    email_access: true,
  };

  // ---------------------------------------------------------
  // TEST 1: INBOX SERVER-SIDE PAGINATION & EGRESS OPTIMIZATION
  // ---------------------------------------------------------
  console.log('1️⃣ Testing INBOX Server-Side Pagination & PostgREST Egress Optimization...');
  
  // Page 1
  const reqInboxP1 = {
    query: { page: '1', pageSize: '25', view: 'all' },
    user: adminUser,
  };
  const resInboxP1 = createMockResponse();
  await getIncomingEmails(reqInboxP1, resInboxP1);

  assert(resInboxP1.statusCode === 200, `Inbox Page 1 HTTP status is 200`);
  assert(resInboxP1.bodyData?.success === true, `Inbox Page 1 returned success`);
  assert(Array.isArray(resInboxP1.bodyData?.emails), `Inbox Page 1 returned emails array`);
  assert(resInboxP1.bodyData?.emails?.length === 25, `Inbox Page 1 returned exactly 25 records (got ${resInboxP1.bodyData?.emails?.length})`);
  assert(resInboxP1.bodyData?.pageSize === 25, `Default page size is 25`);
  assert(resInboxP1.bodyData?.total > 100, `Total count reported (${resInboxP1.bodyData?.total})`);

  // Verify list records are metadata-only (zero body_html, body_text, or raw_headers)
  const sampleInboxItem = resInboxP1.bodyData?.emails?.[0];
  assert(sampleInboxItem && sampleInboxItem.body_html === undefined, `List record excludes heavy body_html`);
  assert(sampleInboxItem && sampleInboxItem.body_text === undefined, `List record excludes heavy body_text`);
  assert(sampleInboxItem && sampleInboxItem.raw_headers === undefined, `List record excludes heavy raw_headers`);
  assert(sampleInboxItem && typeof sampleInboxItem.subject === 'string', `List record includes subject`);
  assert(sampleInboxItem && typeof sampleInboxItem.snippet === 'string', `List record includes lightweight snippet`);

  // Page 2
  const reqInboxP2 = {
    query: { page: '2', pageSize: '25', view: 'all' },
    user: adminUser,
  };
  const resInboxP2 = createMockResponse();
  await getIncomingEmails(reqInboxP2, resInboxP2);

  assert(resInboxP2.statusCode === 200, `Inbox Page 2 HTTP status is 200`);
  assert(resInboxP2.bodyData?.emails?.length === 25, `Inbox Page 2 returned 25 records`);
  assert(resInboxP2.bodyData?.page === 2, `Inbox Page 2 currentPage is 2`);
  const isP2Different = resInboxP1.bodyData.emails[0].id !== resInboxP2.bodyData.emails[0].id;
  assert(isP2Different, `Page 2 contains distinct records from Page 1 (server-side range query)`);

  // ---------------------------------------------------------
  // TEST 2: SENT SERVER-SIDE PAGINATION & EGRESS OPTIMIZATION
  // ---------------------------------------------------------
  console.log('\n2️⃣ Testing SENT Server-Side Pagination & PostgREST Egress Optimization...');

  // Page 1
  const reqSentP1 = {
    query: { page: '1', pageSize: '25', status: 'all' },
    user: adminUser,
  };
  const resSentP1 = createMockResponse();
  await getEmailHistory(reqSentP1, resSentP1);

  assert(resSentP1.statusCode === 200, `Sent History Page 1 HTTP status is 200`);
  assert(resSentP1.bodyData?.success === true, `Sent History Page 1 returned success`);
  assert(Array.isArray(resSentP1.bodyData?.data), `Sent History Page 1 returned data array`);
  assert(resSentP1.bodyData?.data?.length === 25, `Sent History Page 1 returned exactly 25 records (got ${resSentP1.bodyData?.data?.length})`);
  assert(resSentP1.bodyData?.pageSize === 25, `Sent History default page size is 25`);

  // Verify sent list records are metadata-only
  const sampleSentItem = resSentP1.bodyData?.data?.[0];
  assert(sampleSentItem && sampleSentItem.html === undefined, `Sent list record excludes heavy html`);
  assert(sampleSentItem && sampleSentItem.body_html === undefined, `Sent list record excludes body_html`);
  assert(sampleSentItem && typeof sampleSentItem.subject === 'string', `Sent list record includes subject`);

  // Page 2
  const reqSentP2 = {
    query: { page: '2', pageSize: '25', status: 'all' },
    user: adminUser,
  };
  const resSentP2 = createMockResponse();
  await getEmailHistory(reqSentP2, resSentP2);

  assert(resSentP2.statusCode === 200, `Sent History Page 2 HTTP status is 200`);
  assert(resSentP2.bodyData?.data?.length === 25, `Sent History Page 2 returned 25 records`);
  assert(resSentP2.bodyData?.page === 2, `Sent History Page 2 currentPage is 2`);

  // ---------------------------------------------------------
  // TEST 3: EMAIL DETAIL FETCH ON DEMAND (INBOX & SENT)
  // ---------------------------------------------------------
  console.log('\n3️⃣ Testing On-Demand Detail Loading from Cloudflare R2...');

  // Inbox Detail
  const testInboxId = '431d1f5c-38c8-4ebf-b964-990037a3664b';
  const reqInboxDetail = {
    params: { id: testInboxId },
    user: adminUser,
  };
  const resInboxDetail = createMockResponse();
  await getIncomingEmailById(reqInboxDetail, resInboxDetail);

  assert(resInboxDetail.statusCode === 200, `Inbox detail fetch HTTP status is 200`);
  assert(resInboxDetail.bodyData?.success === true, `Inbox detail returned success`);
  assert(resInboxDetail.bodyData?.email?.body_html !== undefined, `Inbox detail loaded body_html on demand`);
  assert(resInboxDetail.bodyData?.email?.is_read === true, `Email marked as read upon detail fetch`);

  // Sent Detail
  const testSentId = '82ce22e8-c790-41f1-ab0f-9d3fbf24fd05';
  const reqSentDetail = {
    params: { id: testSentId },
    user: adminUser,
  };
  const resSentDetail = createMockResponse();
  await getEmailHistoryById(reqSentDetail, resSentDetail);

  assert(resSentDetail.statusCode === 200, `Sent detail fetch HTTP status is 200`);
  assert(resSentDetail.bodyData?.success === true, `Sent detail returned success`);
  assert(resSentDetail.bodyData?.data?.html !== undefined, `Sent detail loaded HTML body on demand`);

  // ---------------------------------------------------------
  // TEST 4: SCHEDULED EMAIL ARCHITECTURE & R2 INTEGRATION
  // ---------------------------------------------------------
  console.log('\n4️⃣ Testing Scheduled Email Architecture with Cloudflare R2...');

  const testScheduledPayload = {
    sender: 'contact@zenemoo.in',
    recipients: ['test-recipient@example.com'],
    subject: 'Test R2 Scheduled Email Integration',
    html: '<p>This is a test scheduled email stored securely in Cloudflare R2.</p>',
    text: 'This is a test scheduled email stored securely in Cloudflare R2.',
    attachments: [
      {
        filename: 'scheduled_doc.txt',
        content: Buffer.from('Scheduled attachment content in R2', 'utf8').toString('base64'),
        contentType: 'text/plain',
      },
    ],
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    timezone: 'Asia/Kolkata',
  };

  const reqCreateSched = {
    body: testScheduledPayload,
    user: adminUser,
  };
  const resCreateSched = createMockResponse();
  await createScheduledEmail(reqCreateSched, resCreateSched);

  assert(resCreateSched.statusCode === 201, `Scheduled email created HTTP status is 201`);
  const createdSchedId = resCreateSched.bodyData?.entry?.id;
  assert(Boolean(createdSchedId), `Scheduled email created with ID: ${createdSchedId}`);

  // Verify R2 objects were created
  const cleanSchedId = emailR2Service.sanitizeId(createdSchedId);
  const schedBodyObj = await emailR2Service.getObjectText(`scheduled/${cleanSchedId}/body.html`);
  assert(schedBodyObj && schedBodyObj.includes('Cloudflare R2'), `Scheduled email body is stored in R2 (scheduled/${cleanSchedId}/body.html)`);

  const schedAttObj = await emailR2Service.getObjectBuffer(`scheduled/${cleanSchedId}/attachments/scheduled_doc.txt`);
  assert(schedAttObj && schedAttObj.buffer?.length > 0, `Scheduled attachment is stored in R2`);

  // Fetch detail on demand
  const reqSchedDetail = {
    params: { id: createdSchedId },
    user: adminUser,
  };
  const resSchedDetail = createMockResponse();
  await getScheduledEmailById(reqSchedDetail, resSchedDetail);

  assert(resSchedDetail.statusCode === 200, `Scheduled email detail fetch HTTP status is 200`);
  assert(resSchedDetail.bodyData?.entry?.body_html?.includes('Cloudflare R2'), `Scheduled detail loaded body from R2 on demand`);

  // Clean up test scheduled email
  const reqCancelSched = {
    params: { id: createdSchedId },
    user: adminUser,
  };
  const resCancelSched = createMockResponse();
  await cancelScheduledEmail(reqCancelSched, resCancelSched);
  assert(resCancelSched.statusCode === 200, `Scheduled email cancelled successfully`);

  // Delete test scheduled objects from R2 & DB
  await emailR2Service.deleteEmailObjects({ emailId: createdSchedId, type: 'scheduled' });
  await supabase.from('scheduled_emails').delete().eq('id', createdSchedId);

  // ---------------------------------------------------------
  // TEST 5: PERMANENT DELETION (R2-FIRST + SUPABASE SAFETY)
  // ---------------------------------------------------------
  console.log('\n5️⃣ Testing Permanent Delete Safety (R2-First + Atomic DB Cleanup)...');

  // Create temporary probe incoming email with valid UUID format
  const probeId = 'ffffffff-aaaa-4444-8888-' + String(Date.now()).slice(-12).padStart(12, '0');
  const cleanProbeId = emailR2Service.sanitizeId(probeId);

  // 1. Upload probe body and attachment to R2
  await emailR2Service.uploadEmailBody({
    emailId: probeId,
    html: '<p>Probe delete test</p>',
    text: 'Probe delete test',
    type: 'incoming',
  });
  await emailR2Service.uploadAttachment({
    emailId: probeId,
    filename: 'probe.txt',
    content: Buffer.from('Probe attachment delete test', 'utf8'),
    type: 'incoming',
  });

  // Verify R2 objects exist before deletion
  const preDeleteObjs = await emailR2Service.listObjectsByPrefix(`incoming/${cleanProbeId}/`);
  assert(preDeleteObjs.length >= 2, `Probe R2 objects created before deletion (${preDeleteObjs.length} objects)`);

  // Insert temporary DB row
  const probeDbPayload = {
    id: probeId,
    message_id: `<${probeId}@test.zenemoo.in>`,
    mailbox_email: 'contact@zenemoo.in',
    sender_name: 'Delete Tester',
    sender_email: 'tester@zenemoo.in',
    recipient_email: 'contact@zenemoo.in',
    subject: 'Probe Deletion Test',
    snippet: 'Probe snippet',
    is_read: true,
    is_starred: false,
    is_archived: false,
    is_trashed: true,
    storage_provider: 'cloudflare_r2',
    attachments: [{ id: 'att_1', filename: 'probe.txt', r2_key: `incoming/${cleanProbeId}/attachments/probe.txt` }],
  };
  await supabase.from('incoming_email_messages').insert([probeDbPayload]);

  // Request permanent delete
  const reqDelete = {
    params: { id: probeId },
    user: adminUser,
  };
  const resDelete = createMockResponse();
  await deleteIncomingEmail(reqDelete, resDelete);

  assert(resDelete.statusCode === 200, `Permanent delete HTTP status is 200`);

  // Verify R2 objects are completely deleted (0 orphaned objects)
  const postDeleteObjs = await emailR2Service.listObjectsByPrefix(`incoming/${cleanProbeId}/`);
  assert(postDeleteObjs.length === 0, `All R2 objects belonging to email were deleted (0 orphaned objects remain)`);

  // Verify Supabase row was deleted
  const { data: verifyDbRow } = await supabase.from('incoming_email_messages').select('id').eq('id', probeId).maybeSingle();
  assert(!verifyDbRow, `Supabase database record deleted only after successful R2 cleanup`);

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🏁 ARCHITECTURE IMPROVEMENTS TEST SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runImprovementsTestSuite().catch((err) => {
  console.error('Test suite encountered an unexpected error:', err);
  process.exit(1);
});
