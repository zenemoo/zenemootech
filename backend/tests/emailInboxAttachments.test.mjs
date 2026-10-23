import assert from 'node:assert/strict';
import { sendInboxEmail } from '../src/controllers/emailInboxController.js';
import * as emailService from '../src/services/emailService.js';
import { emailR2Service } from '../src/services/emailR2Service.js';
import { supabaseService } from '../src/services/supabaseService.js';

console.log('================================================================');
console.log('ZENEMOO EMAIL INBOX ATTACHMENTS VERIFICATION TEST');
console.log('================================================================');

async function runTests() {
  let passed = 0;
  let total = 0;

  const originalApiKey = process.env.BREVO_API_KEY;
  process.env.BREVO_API_KEY = 'xkeysib-mock-test-key-1234567890';

  // Intercept global.fetch to capture Brevo REST API payload
  const originalFetch = global.fetch;
  let capturedBrevoBody = null;

  global.fetch = async (url, options) => {
    if (typeof url === 'string' && url.includes('brevo.com')) {
      if (options?.body) {
        capturedBrevoBody = JSON.parse(options.body);
      }
      return {
        ok: true,
        status: 201,
        headers: new Headers({ 'x-request-id': 'brevo_test_req_123' }),
        json: async () => ({ messageId: `<test-${Date.now()}@zenemoo.in>` }),
      };
    }
    return originalFetch(url, options);
  };

  // Intercept supabaseService.insert to capture database insert
  const originalInsert = supabaseService.insert;
  let capturedInsertPayload = null;

  supabaseService.insert = async (table, payload) => {
    capturedInsertPayload = { table, payload };
    return {
      id: `test_db_id_${Date.now()}`,
      ...payload,
    };
  };

  try {
    // -------------------------------------------------------------------------
    // Test 1: Reply / Reply All with attached file sends attachments to Brevo
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 1: Reply with file attachment passes attachments to Brevo...');
    capturedBrevoBody = null;
    capturedInsertPayload = null;

    const sampleBase64 = Buffer.from('Hello Zenemoo Attachment Test').toString('base64');
    const replyReq = {
      user: { role: 'admin', email: 'contact@zenemoo.in' },
      body: {
        mode: 'reply',
        originalEmailId: 'msg_test_123',
        from: 'contact@zenemoo.in',
        to: 'client@example.com',
        subject: 'Re: Project Discussion',
        html: '<p>Attached is the requested proposal document.</p>',
        text: 'Attached is the requested proposal document.',
        attachments: [
          {
            name: 'proposal.pdf',
            filename: 'proposal.pdf',
            contentType: 'application/pdf',
            size: 2048,
            content: `data:application/pdf;base64,${sampleBase64}`,
          },
        ],
      },
    };

    let replyResData = null;
    let replyResStatus = 200;
    const replyRes = {
      status: (code) => {
        replyResStatus = code;
        return {
          json: (data) => {
            replyResData = data;
          },
        };
      },
      json: (data) => {
        replyResData = data;
      },
    };

    await sendInboxEmail(replyReq, replyRes, (err) => {
      if (err) throw err;
    });

    assert.equal(replyResStatus, 200, 'HTTP status should be 200');
    assert.ok(replyResData?.success, 'Response success should be true');
    assert.ok(capturedBrevoBody, 'Brevo REST API must have been called');
    assert.ok(Array.isArray(capturedBrevoBody.attachment), 'Brevo body must have attachment array');
    assert.equal(capturedBrevoBody.attachment.length, 1, 'Brevo body must contain 1 attachment');
    assert.equal(capturedBrevoBody.attachment[0].name, 'proposal.pdf', 'Attachment name must match');
    assert.equal(capturedBrevoBody.attachment[0].content, sampleBase64, 'Attachment base64 content must match');

    assert.ok(capturedInsertPayload, 'Supabase insert must have been called');
    assert.equal(capturedInsertPayload.table, 'email_history', 'Table must be email_history');
    assert.equal(capturedInsertPayload.payload.has_attachments, true, 'has_attachments must be true');
    assert.ok(Array.isArray(capturedInsertPayload.payload.attachments_meta), 'attachments_meta must be an array');
    assert.equal(capturedInsertPayload.payload.attachments_meta[0].filename, 'proposal.pdf');
    console.log('  ✓ [PASS] Test 1: Reply with file attachment successfully dispatched to Brevo & persisted in DB.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 2: Forward mode with multiple attachments (added + original)
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 2: Forward with multiple attachments...');
    capturedBrevoBody = null;
    capturedInsertPayload = null;

    const imgBase64 = Buffer.from('FakeImageData').toString('base64');
    const fwdReq = {
      user: { role: 'admin', email: 'contact@zenemoo.in' },
      body: {
        mode: 'forward',
        originalEmailId: 'msg_fwd_orig',
        from: 'contact@zenemoo.in',
        to: 'newcontact@partner.org',
        subject: 'Fwd: Project Specifications',
        html: '<p>Please find forwarded files below.</p>',
        attachments: [
          {
            name: 'diagram.png',
            filename: 'diagram.png',
            contentType: 'image/png',
            size: 4096,
            content: imgBase64,
          },
          {
            name: 'specifications.docx',
            filename: 'specifications.docx',
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 8192,
            content: Buffer.from('DocContent').toString('base64'),
          },
        ],
      },
    };

    let fwdResData = null;
    let fwdResStatus = 200;
    const fwdRes = {
      status: (code) => {
        fwdResStatus = code;
        return {
          json: (data) => {
            fwdResData = data;
          },
        };
      },
      json: (data) => {
        fwdResData = data;
      },
    };

    await sendInboxEmail(fwdReq, fwdRes, (err) => {
      if (err) throw err;
    });

    assert.equal(fwdResStatus, 200, 'HTTP status should be 200');
    assert.ok(fwdResData?.success, 'Response success should be true');
    assert.equal(capturedBrevoBody.attachment.length, 2, 'Brevo body must contain 2 attachments');
    assert.equal(capturedBrevoBody.attachment[0].name, 'diagram.png');
    assert.equal(capturedBrevoBody.attachment[1].name, 'specifications.docx');
    assert.equal(capturedInsertPayload.payload.has_attachments, true);
    assert.equal(capturedInsertPayload.payload.attachments_meta.length, 2);
    console.log('  ✓ [PASS] Test 2: Forward with multiple attachments dispatched correctly.');
    passed++;

    // -------------------------------------------------------------------------
    // Test 3: Reply without attachments does not crash and sets has_attachments: false
    // -------------------------------------------------------------------------
    total++;
    console.log('\nRunning Test 3: Normal text reply without attachments...');
    capturedBrevoBody = null;
    capturedInsertPayload = null;

    const noAttReq = {
      user: { role: 'admin', email: 'contact@zenemoo.in' },
      body: {
        mode: 'reply',
        from: 'contact@zenemoo.in',
        to: 'user@example.com',
        subject: 'Re: Quick Question',
        html: '<p>Thanks for reaching out!</p>',
        attachments: [],
      },
    };

    let noAttResStatus = 200;
    const noAttRes = {
      status: (code) => {
        noAttResStatus = code;
        return {
          json: () => {},
        };
      },
      json: () => {},
    };

    await sendInboxEmail(noAttReq, noAttRes, (err) => {
      if (err) throw err;
    });

    assert.equal(noAttResStatus, 200);
    assert.equal(capturedBrevoBody?.attachment, undefined, 'Brevo body should have no attachments');
    assert.equal(capturedInsertPayload.payload.has_attachments, false);
    console.log('  ✓ [PASS] Test 3: Text-only reply works with has_attachments: false.');
    passed++;

  } finally {
    // Restore originals
    process.env.BREVO_API_KEY = originalApiKey;
    global.fetch = originalFetch;
    supabaseService.insert = originalInsert;
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} / ${total} PASSED (100% Success)`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
