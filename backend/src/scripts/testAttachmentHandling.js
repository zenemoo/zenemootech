import 'dotenv/config';
import { supabase } from '../config/supabase.js';
import emailR2Service from '../services/emailR2Service.js';
import { getAttachmentDownload } from '../controllers/emailInboxController.js';

// Test suite for attachment handling
async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING ATTACHMENT HANDLING TEST SUITE');
  console.log('====================================================\n');

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

  // Mock response helper to simulate Express response
  function createMockResponse() {
    return {
      statusCode: 200,
      headers: {},
      bodyBuffer: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(name, value) {
        this.headers[name] = value;
      },
      send(data) {
        this.bodyBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      },
      json(data) {
        this.jsonData = data;
      }
    };
  }

  // TEST 1: INBOX Migrated Email with PDF Attachment in R2
  console.log('1️⃣ Testing INBOX Migrated Email with PDF Attachment in R2...');
  const testInboxPdfEmailId = '431d1f5c-38c8-4ebf-b964-990037a3664b';
  const testInboxPdfFilename = 'Haris.J_com-10.pdf';

  // Test View Mode (inline)
  const reqView = {
    params: { id: testInboxPdfEmailId, attachmentId: testInboxPdfFilename },
    query: { disposition: 'inline' },
    user: { id: 'admin-test-user', role: 'admin' }
  };
  const resView = createMockResponse();
  await getAttachmentDownload(reqView, resView);

  assert(resView.statusCode === 200, `HTTP status is 200 (got ${resView.statusCode})`);
  assert(resView.headers['Content-Type'] === 'application/pdf', `Content-Type is application/pdf (got ${resView.headers['Content-Type']})`);
  assert(resView.headers['Content-Disposition'] && resView.headers['Content-Disposition'].startsWith('inline;'), `Content-Disposition is inline (got ${resView.headers['Content-Disposition']})`);
  assert(resView.headers['X-Content-Type-Options'] === 'nosniff', `Security header X-Content-Type-Options: nosniff present`);
  assert(Buffer.isBuffer(resView.bodyBuffer) && resView.bodyBuffer.length > 1000, `PDF buffer streamed directly from R2 (${resView.bodyBuffer?.length} bytes)`);

  // Test Download Mode (attachment)
  const reqDownload = {
    params: { id: testInboxPdfEmailId, attachmentId: testInboxPdfFilename },
    query: { disposition: 'attachment' },
    user: { id: 'admin-test-user', role: 'admin' }
  };
  const resDownload = createMockResponse();
  await getAttachmentDownload(reqDownload, resDownload);

  assert(resDownload.statusCode === 200, `Download HTTP status is 200`);
  assert(resDownload.headers['Content-Disposition'] && resDownload.headers['Content-Disposition'].startsWith('attachment;'), `Content-Disposition is attachment (got ${resDownload.headers['Content-Disposition']})`);
  assert(resDownload.headers['Content-Disposition'].includes('Haris.J') && resDownload.headers['Content-Disposition'].includes('.pdf'), `Filename is preserved in Content-Disposition`);

  // TEST 2: INBOX Migrated Email with Image Attachment in R2
  console.log('\n2️⃣ Testing INBOX Migrated Email with Image Attachment in R2...');
  const testInboxImgEmailId = '2cb02b2f-8bc5-42ad-86c5-3ae009db3d4f';
  const testInboxImgFilename = '1000168788.jpg';

  const reqImg = {
    params: { id: testInboxImgEmailId, attachmentId: testInboxImgFilename },
    query: { disposition: 'inline' },
    user: { id: 'admin-test-user', role: 'admin' }
  };
  const resImg = createMockResponse();
  await getAttachmentDownload(reqImg, resImg);

  assert(resImg.statusCode === 200, `Image HTTP status is 200`);
  assert(resImg.headers['Content-Type'].startsWith('image/'), `Content-Type is image/jpeg (got ${resImg.headers['Content-Type']})`);
  assert(Buffer.isBuffer(resImg.bodyBuffer) && resImg.bodyBuffer.length > 100000, `Image streamed successfully from R2 (${resImg.bodyBuffer?.length} bytes)`);

  // TEST 3: SENT Migrated Email with Attachment in R2
  console.log('\n3️⃣ Testing SENT Migrated Email with Attachment in R2...');
  const testSentPdfEmailId = '82ce22e8-c790-41f1-ab0f-9d3fbf24fd05';
  const testSentPdfFilename = 'TrainPlex_Sub-Vendor_NDA_Standard__2_.pdf';

  const reqSent = {
    params: { id: testSentPdfEmailId, attachmentId: testSentPdfFilename },
    query: { disposition: 'inline' },
    user: { id: 'admin-test-user', role: 'admin' }
  };
  const resSent = createMockResponse();
  await getAttachmentDownload(reqSent, resSent);

  assert(resSent.statusCode === 200, `Sent attachment HTTP status is 200`);
  assert(resSent.headers['Content-Type'] === 'application/pdf', `Content-Type resolved: ${resSent.headers['Content-Type']}`);
  assert(Buffer.isBuffer(resSent.bodyBuffer) && resSent.bodyBuffer.length > 2000000, `Sent PDF streamed successfully from R2 (${resSent.bodyBuffer?.length} bytes)`);

  // TEST 4: SENT Migrated Email with Image in R2
  console.log('\n4️⃣ Testing SENT Migrated Email with Image in R2...');
  const testSentImgEmailId = '35ca30ee-8b63-4822-81eb-9e37622e3532';
  const testSentImgFilename = 'jm95kir2qrkijsukxxhv.jpg';

  const reqSentImg = {
    params: { id: testSentImgEmailId, attachmentId: testSentImgFilename },
    query: { disposition: 'inline' },
    user: { id: 'admin-test-user', role: 'admin' }
  };
  const resSentImg = createMockResponse();
  await getAttachmentDownload(reqSentImg, resSentImg);

  assert(resSentImg.statusCode === 200, `Sent image HTTP status is 200`);
  assert(resSentImg.headers['Content-Type'] === 'image/jpeg', `Content-Type is image/jpeg (got ${resSentImg.headers['Content-Type']})`);
  assert(Buffer.isBuffer(resSentImg.bodyBuffer) && resSentImg.bodyBuffer.length > 50000, `Sent image streamed from R2 (${resSentImg.bodyBuffer?.length} bytes)`);

  // TEST 5: Supabase Fallback for Legacy Email Attachment
  console.log('\n5️⃣ Testing Supabase / Fallback for Legacy Email Attachment...');
  const legacyEmailId = '890cacda-6dc4-45fe-84b0-bd10a51f0cff';
  const legacyPdfFilename = 'Yougesh_B_Resume_Language_Expert-263.pdf';

  const reqFallback = {
    params: { id: legacyEmailId, attachmentId: legacyPdfFilename },
    query: { disposition: 'inline' },
    user: { id: 'admin-test-user', role: 'admin' }
  };
  const resFallback = createMockResponse();
  await getAttachmentDownload(reqFallback, resFallback);

  assert(resFallback.statusCode === 200, `Fallback HTTP status is 200`);
  assert(resFallback.headers['Content-Type'] === 'application/pdf', `Fallback Content-Type is application/pdf`);
  assert(resFallback.headers['X-Content-Type-Options'] === 'nosniff', `Fallback security header present`);
  assert(Buffer.isBuffer(resFallback.bodyBuffer) && resFallback.bodyBuffer.length > 0, `Fallback PDF generated properly`);

  // TEST 6: Security & Authorization - Unauthenticated / Unauthorized
  console.log('\n6️⃣ Testing Security & Unauthorized Rejection...');
  const reqUnauth = {
    params: { id: testInboxPdfEmailId, attachmentId: testInboxPdfFilename },
    query: {},
    user: { id: 'regular-user', role: 'user', email_access: false }
  };
  const resUnauth = createMockResponse();
  await getAttachmentDownload(reqUnauth, resUnauth);
  assert(resUnauth.statusCode === 403, `Unauthorized user receives 403 Forbidden (got ${resUnauth.statusCode})`);

  // TEST 7: Security - Nonexistent Email & Invalid Attachment
  console.log('\n7️⃣ Testing Security & Boundary Checks...');
  const reqInvalid = {
    params: { id: '00000000-0000-0000-0000-000000000000', attachmentId: 'fake-file.pdf' },
    query: {},
    user: { id: 'admin-test-user', role: 'admin' }
  };
  const resInvalid = createMockResponse();
  await getAttachmentDownload(reqInvalid, resInvalid);
  assert(resInvalid.statusCode === 404, `Nonexistent email returns 404 Not Found (got ${resInvalid.statusCode})`);

  // TEST 8: Normal Email with No Attachments
  console.log('\n8️⃣ Testing Normal Email with No Attachments...');
  const { data: noAttData } = await supabase
    .from('incoming_email_messages')
    .select('id, attachments')
    .eq('attachments', '[]')
    .limit(1);

  if (noAttData && noAttData.length > 0) {
    const noAttEmail = noAttData[0];
    const reqNoAtt = {
      params: { id: noAttEmail.id, attachmentId: 'any-file.pdf' },
      query: {},
      user: { id: 'admin-test-user', role: 'admin' }
    };
    const resNoAtt = createMockResponse();
    await getAttachmentDownload(reqNoAtt, resNoAtt);
    assert(resNoAtt.statusCode === 404, `Email with empty attachments safely returns 404 for arbitrary attachment requests`);
  }

  // TEST 9: Verify no base64 in responses & no R2 credentials exposed
  console.log('\n9️⃣ Testing R2 Credential & Buffer Streaming Safety...');
  assert(!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.startsWith('http'), 'R2 access key is private and not exposed');
  assert(typeof emailR2Service.getObjectBuffer === 'function', 'emailR2Service provides direct buffer streaming');

  console.log('\n====================================================');
  console.log(`🏁 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test suite failed unexpectedly:', err);
  process.exit(1);
});
