import 'dotenv/config';
import { supabase } from '../config/supabase.js';
import { emailR2Service } from '../services/emailR2Service.js';
import { processScheduledItem } from '../services/scheduledEmailWorker.js';
import { encrypt, decrypt } from '../services/encryptionService.js';

async function runScheduledWorkerTestSuite() {
  console.log('================================================================');
  console.log('🧪 VERIFYING SCHEDULED EMAIL SUCCESS CONVERSION & ZERO-DUPLICATION');
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

  const testId = `test_sched_${Date.now()}`;
  const cleanId = emailR2Service.sanitizeId(testId);

  try {
    // -------------------------------------------------------------
    // STEP 1: CREATE TEST SCHEDULED EMAIL WITH R2 STORAGE
    // -------------------------------------------------------------
    console.log('1️⃣ Setting up test scheduled email with R2 objects...');

    // 1. Upload HTML body, text body, and attachment directly to R2 under scheduled/
    const htmlKey = `scheduled/${cleanId}/body.html`;
    const textKey = `scheduled/${cleanId}/body.txt`;
    const attKey = `scheduled/${cleanId}/attachments/schedule_contract.pdf`;

    await emailR2Service.putObject({
      key: htmlKey,
      body: '<h1>Scheduled Contract</h1><p>This is a test scheduled body in R2.</p>',
      contentType: 'text/html; charset=utf-8',
    });

    await emailR2Service.putObject({
      key: textKey,
      body: 'Scheduled Contract - This is a test scheduled body in R2.',
      contentType: 'text/plain; charset=utf-8',
    });

    await emailR2Service.putObject({
      key: attKey,
      body: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF', 'utf8'),
      contentType: 'application/pdf',
      contentDisposition: 'attachment; filename="schedule_contract.pdf"',
    });

    // Check R2 objects count before processing
    const preObjs = await emailR2Service.listObjectsByPrefix(`scheduled/${cleanId}/`);
    assert(preObjs.length === 3, `3 R2 objects created (body.html, body.txt, attachments/schedule_contract.pdf)`);

    // Insert scheduled email row into Supabase scheduled_emails
    const scheduledRow = {
      id: testId,
      user_id: '00000000-0000-0000-0000-000000000001',
      user_email: 'contact@zenemoo.in',
      from_email: 'contact@zenemoo.in',
      to_emails: encrypt(['candidate@test.zenemoo.in']),
      cc_emails: encrypt([]),
      bcc_emails: encrypt([]),
      subject: encrypt('Test Scheduled Contract Delivery'),
      body_html: encrypt('<p>(Stored in Cloudflare R2)</p>'),
      body_text: 'Stored in Cloudflare R2',
      attachments: [
        {
          id: 'att_sched_1',
          filename: 'schedule_contract.pdf',
          name: 'schedule_contract.pdf',
          contentType: 'application/pdf',
          type: 'application/pdf',
          size: 75,
          r2_key: attKey,
        },
      ],
      scheduled_at: new Date(Date.now() - 10000).toISOString(), // Due now
      timezone: 'Asia/Kolkata',
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      await supabase.from('scheduled_emails').insert([scheduledRow]);
    }

    // -------------------------------------------------------------
    // STEP 2: TEST FAILURE PATH (Simulated Brevo dispatch failure)
    // -------------------------------------------------------------
    console.log('\n2️⃣ Testing Failure Behavior (Simulated Brevo dispatch failure)...');

    let sendAttempted = false;
    const failingSendMail = async () => {
      sendAttempted = true;
      throw new Error('Simulated Brevo rate limit / network error');
    };

    const scheduledItemForFailure = {
      ...scheduledRow,
      body_html_r2_key: htmlKey,
      body_text_r2_key: textKey,
      attachments_r2_prefix: `scheduled/${cleanId}/attachments/`,
      storage_provider: 'cloudflare_r2',
    };

    const failResult = await processScheduledItem(scheduledItemForFailure, { customSendMail: failingSendMail });
    assert(failResult === false, `processScheduledItem returned false on send error`);
    assert(sendAttempted === true, `Brevo send stub was attempted without actual network send`);

    // Verify Supabase row was NOT deleted on failure
    if (supabase) {
      const { data: checkFailDb } = await supabase.from('scheduled_emails').select('status, failure_reason').eq('id', testId).maybeSingle();
      assert(checkFailDb && checkFailDb.status === 'failed', `scheduled_emails row preserved with status = 'failed'`);
      assert(checkFailDb && checkFailDb.failure_reason?.includes('Simulated Brevo'), `failure_reason recorded in database`);
    }

    // Verify R2 objects were NOT deleted on failure
    const postFailObjs = await emailR2Service.listObjectsByPrefix(`scheduled/${cleanId}/`);
    assert(postFailObjs.length === 3, `R2 objects preserved intact on failure (${postFailObjs.length} objects)`);

    // Verify NO email_history row was created
    if (supabase) {
      const { data: checkNoHistory } = await supabase.from('email_history').select('id').ilike('subject', '%Test Scheduled Contract Delivery%').maybeSingle();
      assert(!checkNoHistory, `No successful email_history row created on failure`);
    }

    // -------------------------------------------------------------
    // STEP 3: TEST SUCCESS CONVERSION & ZERO-DUPLICATION
    // -------------------------------------------------------------
    console.log('\n3️⃣ Testing Success Conversion Flow (Mocked Brevo Success)...');

    // Reset status to 'scheduled' for retry
    if (supabase) {
      await supabase.from('scheduled_emails').update({ status: 'scheduled', failure_reason: null }).eq('id', testId);
    }
    scheduledItemForFailure.status = 'scheduled';

    let stubbedBrevoCalled = false;
    let brevoPayloadReceived = null;
    const simulatedMsgId = `<brevo-sched-mock-${Date.now()}@zenemoo.in>`;

    // Mock Brevo send to return success without live network dispatch
    const successfulSendMail = async (payload) => {
      stubbedBrevoCalled = true;
      brevoPayloadReceived = payload;
      return {
        success: true,
        messageId: simulatedMsgId,
      };
    };

    const successResult = await processScheduledItem(scheduledItemForFailure, { customSendMail: successfulSendMail });

    assert(successResult === true, `processScheduledItem returned true on success`);
    assert(stubbedBrevoCalled === true, `Brevo send mock executed with resolved R2 content`);
    assert(brevoPayloadReceived && brevoPayloadReceived.html?.includes('Scheduled Contract'), `Brevo received HTML body resolved from R2`);
    assert(brevoPayloadReceived && Array.isArray(brevoPayloadReceived.attachments) && brevoPayloadReceived.attachments.length === 1, `Brevo received attachment buffer from R2`);

    // Verify email_history was created
    let historyRecord = null;
    if (supabase) {
      const { data: histData } = await supabase.from('email_history').select('*').eq('message_id', simulatedMsgId).maybeSingle();
      historyRecord = histData;
    }

    assert(Boolean(historyRecord), `email_history record created in Supabase with message_id: ${simulatedMsgId}`);
    assert(historyRecord?.storage_provider === 'cloudflare_r2', `email_history has storage_provider = 'cloudflare_r2'`);
    assert(historyRecord?.body_html_r2_key === htmlKey, `email_history references the exact SAME HTML R2 key (${htmlKey})`);
    assert(historyRecord?.body_text_r2_key === textKey, `email_history references the exact SAME text R2 key (${textKey})`);
    assert(Array.isArray(historyRecord?.attachments_meta) && historyRecord.attachments_meta[0]?.r2_key === attKey, `email_history preserves original attachment R2 key`);

    // Verify scheduled_emails row was DELETED after email_history insertion
    if (supabase) {
      const { data: checkDeletedSched } = await supabase.from('scheduled_emails').select('id').eq('id', testId).maybeSingle();
      assert(!checkDeletedSched, `scheduled_emails row deleted after successful conversion`);
    }

    // Verify R2 objects count is STILL EXACTLY 3 (Zero duplicate R2 objects created!)
    const allR2Objs = await emailR2Service.listObjectsByPrefix(`scheduled/${cleanId}/`);
    assert(allR2Objs.length === 3, `Exact 3 R2 objects remain (Zero duplicate R2 copies created)`);

    // Verify sent/ prefix has no duplicate objects created for this ID
    const sentDuplicateCheck = await emailR2Service.listObjectsByPrefix(`sent/${cleanId}/`);
    assert(sentDuplicateCheck.length === 0, `No redundant duplicate objects uploaded to sent/ prefix`);

    // -------------------------------------------------------------
    // STEP 4: CLEANUP TEST OBJECTS
    // -------------------------------------------------------------
    console.log('\n4️⃣ Cleaning up test objects...');

    // Delete test R2 objects
    await emailR2Service.deleteEmailObjects({ emailId: testId, type: 'scheduled' });

    // Delete test email_history row
    if (supabase && historyRecord?.id) {
      await supabase.from('email_history').delete().eq('id', historyRecord.id);
    }

    const postCleanup = await emailR2Service.listObjectsByPrefix(`scheduled/${cleanId}/`);
    assert(postCleanup.length === 0, `Test R2 objects cleaned up cleanly`);

    console.log('\n================================================================');
    console.log(`🏁 SCHEDULED WORKER FLOW TEST SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error('Scheduled worker test failed unexpectedly:', err);
    process.exit(1);
  }
}

runScheduledWorkerTestSuite();
