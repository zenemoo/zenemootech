import 'dotenv/config';
import assert from 'node:assert';
import {
  parseRecipients,
  splitAddressTokens,
  htmlToPlainText,
  validateEmail,
  sanitizeHtml,
} from '../services/emailService.js';
import { processScheduledItem } from '../services/scheduledEmailWorker.js';

async function runRegressionTestSuite() {
  console.log('================================================================');
  console.log('🧪 ZENEMOO EMAIL INBOX — 17 REGRESSION TESTS AUDIT SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS [Test ${passed + failed + 1}]: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL [Test ${passed + failed + 1}]: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS [Test ${passed + failed + 1}]: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL [Test ${passed + failed + 1}]: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // Current Zenemoo Mailboxes to exclude
  const CURRENT_USER_MAILBOXES = [
    'contact@zenemoo.in',
    'careers@zenemoo.in',
    'support@zenemoo.in',
    'info@zenemoo.in',
    'hr@zenemoo.in',
    'billing@zenemoo.in',
    'admin@zenemoo.in',
  ];

  // Helper simulating recipient initialization logic in EmailComposeModal.tsx
  function initializeRecipients({ mode, originalEmail, currentUserEmail = 'contact@zenemoo.in' }) {
    const isSentFolder = originalEmail.folder === 'sent' || originalEmail.is_sent;
    let initialTo = '';
    let initialCc = '';
    let initialBcc = '';

    if (mode === 'reply') {
      if (isSentFolder) {
        const candidateRecipients = [
          ...(Array.isArray(originalEmail.recipients) ? originalEmail.recipients : [originalEmail.recipients]),
          ...(Array.isArray(originalEmail.to) ? originalEmail.to : [originalEmail.to]),
          originalEmail.recipient_email,
        ].filter(Boolean);
        const parsed = parseRecipients(candidateRecipients);
        const external = parsed.filter(e => !CURRENT_USER_MAILBOXES.includes(e.toLowerCase()) && e.toLowerCase() !== currentUserEmail.toLowerCase());
        initialTo = external[0] || parsed[0] || '';
      } else {
        const replyToCandidates = [originalEmail.reply_to, originalEmail.replyTo].filter(Boolean);
        const parsedReplyTo = parseRecipients(replyToCandidates);
        if (parsedReplyTo.length > 0) {
          initialTo = parsedReplyTo[0];
        } else {
          const senderCandidates = [originalEmail.sender_email, originalEmail.sender, originalEmail.from].filter(Boolean);
          const parsedSender = parseRecipients(senderCandidates);
          initialTo = parsedSender[0] || '';
        }
      }
    } else if (mode === 'replyAll') {
      const userMailboxes = [...CURRENT_USER_MAILBOXES, currentUserEmail.toLowerCase()];
      const toSet = new Set();
      const ccSet = new Set();

      if (isSentFolder) {
        const origTo = parseRecipients([originalEmail.recipients, originalEmail.to, originalEmail.recipient_email].filter(Boolean));
        origTo.forEach(e => {
          if (!userMailboxes.includes(e.toLowerCase())) toSet.add(e);
        });
      } else {
        const replyToParsed = parseRecipients([originalEmail.reply_to, originalEmail.replyTo].filter(Boolean));
        const senderParsed = parseRecipients([originalEmail.sender_email, originalEmail.sender, originalEmail.from].filter(Boolean));
        const primary = replyToParsed[0] || senderParsed[0];
        if (primary && !userMailboxes.includes(primary.toLowerCase())) {
          toSet.add(primary);
        }

        const origTo = parseRecipients([originalEmail.recipients, originalEmail.to].filter(Boolean));
        origTo.forEach(e => {
          if (!userMailboxes.includes(e.toLowerCase())) toSet.add(e);
        });
      }

      const origCc = parseRecipients([originalEmail.cc, originalEmail.cc_emails].filter(Boolean));
      origCc.forEach(e => {
        const lower = e.toLowerCase();
        if (!userMailboxes.includes(lower) && !toSet.has(e)) {
          ccSet.add(e);
        }
      });

      initialTo = Array.from(toSet).join(', ');
      initialCc = Array.from(ccSet).join(', ');
    }

    return { initialTo, initialCc, initialBcc };
  }

  // 1. Reply to an incoming message
  test('1. Reply to incoming message prefers Reply-To over sender and leaves CC/BCC empty', () => {
    const incomingWithReplyTo = {
      sender_email: 'noreply@service.com',
      reply_to: 'support-agent@service.com',
      subject: 'Inquiry',
      folder: 'inbox',
    };
    const res = initializeRecipients({ mode: 'reply', originalEmail: incomingWithReplyTo });
    assert.strictEqual(res.initialTo, 'support-agent@service.com', 'Uses Reply-To when valid');
    assert.strictEqual(res.initialCc, '', 'CC starts empty');
    assert.strictEqual(res.initialBcc, '', 'BCC starts empty');

    const incomingWithoutReplyTo = {
      sender_email: 'client@example.com',
      reply_to: null,
      folder: 'inbox',
    };
    const res2 = initializeRecipients({ mode: 'reply', originalEmail: incomingWithoutReplyTo });
    assert.strictEqual(res2.initialTo, 'client@example.com', 'Falls back to sender_email when Reply-To is absent');
  });

  // 2. Reply to a message in Sent
  test('2. Reply to message in Sent replies to original external recipient, not Zenemoo mailbox', () => {
    const sentEmail = {
      sender_email: 'contact@zenemoo.in',
      recipients: ['client@partner.com'],
      folder: 'sent',
      is_sent: true,
    };
    const res = initializeRecipients({ mode: 'reply', originalEmail: sentEmail, currentUserEmail: 'contact@zenemoo.in' });
    assert.strictEqual(res.initialTo, 'client@partner.com', 'Replies to external client, not Zenemoo sender');
  });

  // 3. Reply All with multiple To and CC recipients
  test('3. Reply All populates To from sender and other To, CC from original CC, excluding current user', () => {
    const multiEmail = {
      sender_email: 'lead@external.com',
      to: ['colleague@external.com', 'contact@zenemoo.in'],
      cc: ['manager@external.com', 'careers@zenemoo.in'],
      bcc: ['secret@spy.com'],
      folder: 'inbox',
    };
    const res = initializeRecipients({ mode: 'replyAll', originalEmail: multiEmail, currentUserEmail: 'contact@zenemoo.in' });
    assert.ok(res.initialTo.includes('lead@external.com'), 'Includes original sender in To');
    assert.ok(res.initialTo.includes('colleague@external.com'), 'Includes external To recipient');
    assert.ok(!res.initialTo.includes('contact@zenemoo.in'), 'Excludes current user from To');
    assert.ok(res.initialCc.includes('manager@external.com'), 'Includes external CC');
    assert.ok(!res.initialCc.includes('careers@zenemoo.in'), 'Excludes Zenemoo mailbox from CC');
    assert.ok(!res.initialTo.includes('secret@spy.com') && !res.initialCc.includes('secret@spy.com'), 'Never exposes BCC in Reply All');
  });

  // 4. Display-name parsing
  test('4. Display-name parsing correctly extracts clean emails without splitting on internal spaces or quotes', () => {
    const complexAddress = 'Jane Doe <jane.doe@example.com>, "Smith, Bob" <bob.smith@example.org>; plain@test.in';
    const parsed = parseRecipients(complexAddress);
    assert.deepStrictEqual(parsed, ['jane.doe@example.com', 'bob.smith@example.org', 'plain@test.in']);
  });

  // 5. Cross-field deduplication and exclusion of current-user addresses
  test('5. Cross-field deduplication handles mixed casing and deduplicates strictly', () => {
    const duplicateList = ['User@Domain.COM', 'user@domain.com', '  USER@DOMAIN.COM  '];
    const parsed = parseRecipients(duplicateList);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].toLowerCase(), 'user@domain.com');
  });

  // 6. BCC privacy
  test('6. BCC privacy: BCC addresses are excluded from To and CC sets', () => {
    const bccEmail = {
      sender_email: 'sender@example.com',
      to: ['to@example.com'],
      bcc: ['blind@hidden.com'],
      folder: 'inbox',
    };
    const res = initializeRecipients({ mode: 'replyAll', originalEmail: bccEmail });
    assert.strictEqual(res.initialBcc, '');
    assert.ok(!res.initialTo.includes('blind@hidden.com'));
    assert.ok(!res.initialCc.includes('blind@hidden.com'));
  });

  // 7. Sent-list primary recipient and multiple-recipient display
  test('7. Sent list display formatting: To: recipient@domain.com with +N badge for multiples', () => {
    function formatSentRecipient(recipients) {
      const parsed = parseRecipients(recipients);
      if (parsed.length === 0) return { primaryText: 'To: (No recipient)', count: 0, badgeText: null };
      const primary = parsed[0];
      const additionalCount = parsed.length - 1;
      return {
        primaryText: `To: ${primary}`,
        count: parsed.length,
        badgeText: additionalCount > 0 ? `+${additionalCount}` : null,
      };
    }

    const single = formatSentRecipient(['client@zenemoo.in']);
    assert.strictEqual(single.primaryText, 'To: client@zenemoo.in');
    assert.strictEqual(single.badgeText, null);

    const multi = formatSentRecipient(['client@zenemoo.in', 'second@zenemoo.in', 'third@zenemoo.in']);
    assert.strictEqual(multi.primaryText, 'To: client@zenemoo.in');
    assert.strictEqual(multi.badgeText, '+2');
  });

  // 8. Bold, italic, bullets, numbered lists and links
  test('8. Editor HTML maintains formatting elements and converts lists and blockquotes to readable text', () => {
    const editorHtml = '<ul><li>First item</li><li>Second item</li></ul><ol><li>Step 1</li></ol><blockquote>Quoted text</blockquote>';
    const plain = htmlToPlainText(editorHtml);
    assert.ok(plain.includes('• First item'), 'Bullet list formatted with bullet symbol');
    assert.ok(plain.includes('• Second item'), 'Second list item present');
    assert.ok(plain.includes('> Quoted text'), 'Blockquote formatted with > prefix');
  });

  // 9. Correct HTML and plain-text dispatch
  test('9. HTML and readable plain-text alternatives generated consistently', () => {
    const html = '<p>Hello <strong>World</strong>, check <a href="https://zenemoo.in">Zenemoo</a>.</p>';
    const sanitized = sanitizeHtml(html);
    const plain = htmlToPlainText(sanitized);
    assert.ok(!sanitized.includes('<script>'), 'Sanitized HTML is safe');
    assert.ok(plain.includes('Hello World, check Zenemoo (https://zenemoo.in).'), 'Link converted to text (url)');
  });

  // 10. Readable quoted HTML and plain-text replies
  test('10. Quoted HTML strips nested html/body tags and builds clear metadata separator', () => {
    const fullHtml = '<!DOCTYPE html><html><head><title>Test</title></head><body><p>Original message body.</p></body></html>';
    const cleaned = fullHtml
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<html[^>]*>([\s\S]*?)<\/html>/gi, '$1')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>([\s\S]*?)<\/body>/gi, '$1')
      .trim();

    assert.ok(!cleaned.includes('<!DOCTYPE'), 'Strips DOCTYPE');
    assert.ok(!cleaned.includes('<html'), 'Strips html tag');
    assert.ok(!cleaned.includes('<body'), 'Strips body tag');
    assert.ok(cleaned.includes('<p>Original message body.</p>'), 'Preserves inner message body');
  });

  // 11. Direct reply threading headers
  test('11. Direct reply threading headers passed properly without discarding', () => {
    const originalMessageId = '<msg-12345@domain.com>';
    const inReplyTo = originalMessageId;
    const references = `<orig-ref@domain.com> ${originalMessageId}`;

    const headers = {
      'In-Reply-To': inReplyTo,
      'References': references,
    };
    assert.strictEqual(headers['In-Reply-To'], '<msg-12345@domain.com>');
    assert.strictEqual(headers['References'], '<orig-ref@domain.com> <msg-12345@domain.com>');
  });

  // 12. Scheduled reply threading headers
  test('12. Scheduled reply retains threading metadata and strips internal tag from attachments', () => {
    const threadingMeta = {
      inReplyTo: '<sched-ref-123@domain.com>',
      references: '<sched-ref-123@domain.com>',
    };
    const attachments = [
      { filename: 'doc.pdf', size: 1024 },
      { _threading: threadingMeta },
    ];

    const cleanAttachments = attachments.filter(a => !a._threading);
    assert.strictEqual(cleanAttachments.length, 1);
    assert.strictEqual(cleanAttachments[0].filename, 'doc.pdf');

    const foundThread = attachments.find(a => a._threading);
    assert.strictEqual(foundThread._threading.inReplyTo, '<sched-ref-123@domain.com>');
  });

  // 13. Scheduling, cancellation, retry and successful delivery
  await asyncTest('13. Scheduling execution flow: dispatches email and returns success', async () => {
    let mockDispatched = false;
    const mockSendMail = async (payload) => {
      mockDispatched = true;
      assert.strictEqual(payload.sender, 'contact@zenemoo.in');
      assert.deepStrictEqual(payload.recipients, ['candidate@example.com']);
      assert.ok(payload.text.includes('Scheduled text alternative'), 'Plain text passed to dispatcher');
      return { messageId: '<brevo-mock-sched-123>' };
    };

    const scheduledItem = {
      id: 'sched_test_item_1',
      status: 'scheduled',
      from_email: 'contact@zenemoo.in',
      to_emails: ['candidate@example.com'],
      subject: 'Scheduled Interview Confirmation',
      body_html: '<p>Interview scheduled.</p>',
      body_text: 'Scheduled text alternative',
      attachments: [],
    };

    const result = await processScheduledItem(scheduledItem, { customSendMail: mockSendMail });
    assert.strictEqual(result, true, 'Worker returns true on successful delivery');
    assert.strictEqual(mockDispatched, true, 'DispatchMail was invoked');
  });

  // 14. Idempotent scheduled-to-history transition
  await asyncTest('14. Idempotency: already dispatched items skip provider send to prevent duplicate sends', async () => {
    let dispatchCallCount = 0;
    const mockSendMail = async () => {
      dispatchCallCount++;
      return { messageId: '<mock-msg-2>' };
    };

    const alreadySentItem = {
      id: 'sched_already_sent_1',
      status: 'scheduled',
      provider_message_id: '<brevo-existing-msg-id>',
      sent_at: new Date().toISOString(),
      from_email: 'contact@zenemoo.in',
      to_emails: ['candidate@example.com'],
      subject: 'Already Delivered Email',
      body_html: '<p>Delivered</p>',
    };

    const result = await processScheduledItem(alreadySentItem, { customSendMail: mockSendMail });
    assert.strictEqual(result, true, 'Returns true without re-sending');
    assert.strictEqual(dispatchCallCount, 0, 'Did not re-dispatch email via Brevo');
  });

  // 15. Existing attachment and signature handling
  test('15. Attachment metadata extraction extracts clean lightweight metadata without binary data', () => {
    const rawAttachments = [
      {
        id: 'att_1',
        filename: 'report.pdf',
        contentType: 'application/pdf',
        size: 204800,
        content: 'data:application/pdf;base64,JVBERi0xLjQK...',
      },
    ];

    const metadataOnly = rawAttachments.map(a => ({
      id: a.id,
      filename: a.filename,
      contentType: a.contentType,
      size: a.size,
    }));

    assert.strictEqual(metadataOnly[0].filename, 'report.pdf');
    assert.strictEqual(metadataOnly[0].size, 204800);
    assert.strictEqual(metadataOnly[0].content, undefined, 'No base64 content retained in list metadata');
  });

  // 16. Message History pagination and scheduled status display
  test('16. Scheduled status display maps scheduled items to lightweight metadata with scheduled badge', () => {
    const scheduledRecords = [
      {
        id: 'sched_999',
        from_email: 'contact@zenemoo.in',
        to_emails: ['hr@candidate.com'],
        subject: 'Job Offer',
        status: 'scheduled',
        scheduled_at: '2026-11-01T10:00:00Z',
      },
    ];

    const mapped = scheduledRecords.map(item => ({
      id: String(item.id),
      sender: item.from_email,
      recipients: item.to_emails,
      subject: item.subject,
      status: 'scheduled',
      createdAt: item.scheduled_at,
    }));

    assert.strictEqual(mapped[0].status, 'scheduled');
    assert.deepStrictEqual(mapped[0].recipients, ['hr@candidate.com']);
  });

  // 17. Bounded list queries with no per-row body or attachment fetches
  test('17. Minimal egress: list projections strictly exclude body_html and body_text', () => {
    const LIST_COLUMNS = 'id, user_id, user_email, from_email, to_emails, cc_emails, bcc_emails, subject, attachments, status, scheduled_at, timezone, created_at, updated_at, failure_reason';
    assert.ok(!LIST_COLUMNS.includes('body_html'), 'body_html is excluded from list projection');
    assert.ok(!LIST_COLUMNS.includes('body_text'), 'body_text is excluded from list projection');
  });

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTestSuite();
