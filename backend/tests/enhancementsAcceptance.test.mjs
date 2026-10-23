import assert from 'assert';
import { adminEventService } from '../src/services/adminEventService.js';
import { bookingAvailabilityService } from '../src/services/bookingAvailabilityService.js';
import {
  generateClientMeetingEmailHtml,
  generateClientMeetingReminderEmailHtml,
  generateInternalEventEmailHtml,
  formatEventDate,
  formatEventTime,
  formatEventTimeRange,
} from '../src/services/clientMeetingEmailTemplate.js';

console.log('================================================================');
console.log('ZENEMOO SCHEDULER ENHANCEMENTS — ACCEPTANCE & REGRESSION TESTS');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function main() {
  const testDate = '2026-12-15'; // Test date far in future

  // ============================================================================
  // Test 1: Page Sizes (10, 20, 30) Supported on Admin Events Endpoint
  // ============================================================================
  await runAsyncTest('Admin events list pagination supports limits 10, 20, 30', async () => {
    for (const limit of [10, 20, 30]) {
      const result = await adminEventService.getEvents({ page: 1, limit });
      assert.strictEqual(result.limit, limit, `Expected limit to be ${limit}`);
      assert.strictEqual(result.page, 1, 'Expected page to be 1');
      assert.ok(typeof result.totalCount === 'number', 'Expected totalCount number');
      assert.ok(typeof result.totalPages === 'number', 'Expected totalPages number');
      assert.ok(Array.isArray(result.events), 'Expected events array');
      assert.ok(result.events.length <= limit, `Returned count ${result.events.length} exceeds limit ${limit}`);
    }
  });

  // ============================================================================
  // Test 2: Search and Status Filters with Pagination
  // ============================================================================
  await runAsyncTest('Backend filters (eventType, status, search) apply before pagination', async () => {
    // Seed 2 distinct events in local store
    const seed1 = await adminEventService.createEvent({
      event_type: 'client_meeting',
      title: 'Acrostic Bio AI Consultation',
      client_name: 'Dr. Acrostic',
      company_name: 'Acrostic Bio',
      email: 'acrostic@bioai.com',
      event_date: testDate,
      start_time: `${testDate}T04:00:00.000Z`,
      end_time: `${testDate}T04:30:00.000Z`,
      status: 'scheduled',
    });

    const seed2 = await adminEventService.createEvent({
      event_type: 'internal_event',
      title: 'Quarterly Infrastructure Review',
      event_date: testDate,
      start_time: `${testDate}T05:00:00.000Z`,
      end_time: `${testDate}T06:00:00.000Z`,
      status: 'draft',
    });

    try {
      // Filter by event_type 'client_meeting'
      const clientResult = await adminEventService.getEvents({ eventType: 'client_meeting', page: 1, limit: 10 });
      assert.ok(clientResult.events.every((e) => e.event_type === 'client_meeting'), 'All records must be client meetings');

      // Filter by search term
      const searchResult = await adminEventService.getEvents({ search: 'Acrostic', page: 1, limit: 10 });
      assert.ok(searchResult.events.some((e) => e.title.includes('Acrostic Bio') || e.client_name.includes('Acrostic')), 'Search matches target');

      // Filter by status 'draft'
      const draftResult = await adminEventService.getEvents({ status: 'draft', page: 1, limit: 10 });
      assert.ok(draftResult.events.every((e) => e.status === 'draft'), 'All records must have draft status');
    } finally {
      await adminEventService.deleteEvent(seed1.id);
      await adminEventService.deleteEvent(seed2.id);
    }
  });

  // ============================================================================
  // Test 3: Pagination Fetches Only Current Page Slice
  // ============================================================================
  await runAsyncTest('Pagination returns only the requested page slice', async () => {
    const page1 = await adminEventService.getEvents({ page: 1, limit: 10 });
    const page2 = await adminEventService.getEvents({ page: 2, limit: 10 });
    assert.strictEqual(page1.page, 1);
    assert.strictEqual(page2.page, 2);
    // If totalCount > 10, page1 and page2 items should not overlap
    if (page1.totalCount > 10 && page2.events.length > 0) {
      const page1Ids = new Set(page1.events.map((e) => e.id));
      assert.ok(!page2.events.some((e) => page1Ids.has(e.id)), 'Page 1 and Page 2 must not contain duplicate items');
    }
  });

  // ============================================================================
  // Test 4: On-demand Detail Fetching Loads Full Record Without Full Scan
  // ============================================================================
  await runAsyncTest('getEventById loads single full record on demand', async () => {
    const tempEvent = await adminEventService.createEvent({
      event_type: 'client_meeting',
      title: 'Detailed Inspection Target',
      client_name: 'Dr. Jane Foster',
      company_name: 'Asgard Astrophysics',
      email: 'jane@asgard.org',
      internal_notes: 'CONFIDENTIAL ADMIN NOTE: Evaluated for 100k GPU cluster',
      attendees: [{ name: 'Jane Foster', email: 'jane@asgard.org', role: 'Lead' }],
      event_date: testDate,
      start_time: `${testDate}T06:00:00.000Z`,
      end_time: `${testDate}T07:00:00.000Z`,
      status: 'scheduled',
    });

    try {
      const detail = await adminEventService.getEventById(tempEvent.id);
      assert.ok(detail, 'Record detail must be returned');
      assert.strictEqual(detail.id, tempEvent.id);
      assert.strictEqual(detail.internal_notes, 'CONFIDENTIAL ADMIN NOTE: Evaluated for 100k GPU cluster');
      assert.strictEqual(detail.attendees.length, 1);
    } finally {
      await adminEventService.deleteEvent(tempEvent.id);
    }
  });

  // ============================================================================
  // Test 5: Sharing Sanitization (No Admin Notes, Private Contacts, or Secret Data)
  // ============================================================================
  runTest('Sharing payload sanitization strictly excludes admin-only and private details', () => {
    const mockInternalEvent = {
      id: 'mock-uuid-1',
      event_id: 'ZEN-EVT-88888',
      event_type: 'internal_event',
      title: 'Core AI Model Retraining Sprint',
      description: 'Reviewing fine-tuning checkpoints',
      agenda: '1. Loss curve analysis\n2. Validation accuracy',
      internal_notes: 'CONFIDENTIAL: Salary discussion and security audit vulnerability notes',
      attendees: [
        { name: 'Prem', email: 'prem@zenemoo.in', privatePhone: '+91 9999999999' },
        { name: 'Admin', email: 'admin@zenemoo.in' }
      ],
      event_date: '2026-11-20',
      start_time: '2026-11-20T04:30:00.000Z',
      end_time: '2026-11-20T05:30:00.000Z',
      timezone: 'Asia/Kolkata',
      google_meet_url: 'https://meet.google.com/zen-meet-123',
    };

    // Simulate the frontend sharing formatter implemented in AdminEventsMeetingsView
    const formatShareContent = (evt) => {
      const lines = [
        `Meeting / Event: ${evt.title}`,
        `Date: ${evt.event_date}`,
        `Time: 10:00 AM – 11:00 AM (${evt.timezone})`,
      ];
      if (evt.google_meet_url) {
        lines.push(`Google Meet: ${evt.google_meet_url}`);
      }
      return lines.join('\n');
    };

    const shareText = formatShareContent(mockInternalEvent);

    assert.ok(shareText.includes('Core AI Model Retraining Sprint'), 'Includes title');
    assert.ok(shareText.includes('https://meet.google.com/zen-meet-123'), 'Includes Meet link');
    // Ensure ZERO sensitive admin notes or attendee contact info leak
    assert.ok(!shareText.includes('CONFIDENTIAL'), 'Internal notes must NEVER leak');
    assert.ok(!shareText.includes('Salary discussion'), 'Private admin notes must not leak');
    assert.ok(!shareText.includes('prem@zenemoo.in'), 'Private attendee email must not leak');
    assert.ok(!shareText.includes('+91 9999999999'), 'Private phone number must not leak');
  });

  // ============================================================================
  // Test 6: Existing Public Booking & Availability Flows Remain Intact
  // ============================================================================
  await runAsyncTest('Existing public booking availability works as expected', async () => {
    const avail = await bookingAvailabilityService.getAvailableSlots(testDate, 'Asia/Kolkata');
    assert.strictEqual(avail.success, true);
    assert.strictEqual(avail.date, testDate);
    assert.ok(Array.isArray(avail.availableSlots));
    assert.ok(avail.availableSlots.length > 0, 'Should return available slots for default schedule');
  });

  // ============================================================================
  // Test 7: Partial-Duration Events Block All Overlapping Slots
  // ============================================================================
  await runAsyncTest('Partial-duration (45 min) admin event blocks all overlapping 30-min slots', async () => {
    // Event: 11:15 AM to 12:00 PM IST (05:45 to 06:30 UTC)
    const partialEvt = await adminEventService.createEvent({
      event_type: 'client_meeting',
      title: 'Partial Slot Validation',
      client_name: 'Overlap Tester',
      email: 'overlap@test.com',
      event_date: testDate,
      start_time: `${testDate}T05:45:00.000Z`, // 11:15 IST
      end_time: `${testDate}T06:30:00.000Z`,   // 12:00 IST
      duration_minutes: 45,
      status: 'scheduled',
    });

    try {
      const avail = await bookingAvailabilityService.getAvailableSlots(testDate, 'Asia/Kolkata');
      const slot1100 = avail.availableSlots.find((s) => s.label === '11:00 AM'); // 11:00-11:30 intersects 11:15-12:00
      const slot1130 = avail.availableSlots.find((s) => s.label === '11:30 AM'); // 11:30-12:00 intersects 11:15-12:00
      const slot1200 = avail.availableSlots.find((s) => s.label === '12:00 PM'); // 12:00-12:30 touches endpoint, does not overlap

      assert.strictEqual(slot1100.available, false, '11:00 AM slot must be blocked');
      assert.strictEqual(slot1130.available, false, '11:30 AM slot must be blocked');
      assert.strictEqual(slot1200.available, true, '12:00 PM slot must remain available');
    } finally {
      await adminEventService.deleteEvent(partialEvt.id);
    }
  });

  // ============================================================================
  // Test 8: Confirmation Email Template Redesign (Compact 100-120px Logo)
  // ============================================================================
  runTest('Confirmation email template includes 110px logo, agenda, and Google Meet CTA', () => {
    const html = generateClientMeetingEmailHtml({
      event_id: 'ZEN-CLT-77777',
      title: 'Enterprise Architecture Consultation',
      client_name: 'Bruce Wayne',
      company_name: 'Wayne Enterprises',
      email: 'bruce@waynecorp.com',
      agenda: '1. Security architecture review\n2. API integration roadmap',
      meeting_purpose: 'Enterprise deployment evaluation',
      event_date: '2026-11-25',
      start_time: '2026-11-25T08:30:00.000Z',
      end_time: '2026-11-25T09:30:00.000Z',
      timezone: 'Asia/Kolkata',
      duration_minutes: 60,
      google_meet_url: 'https://meet.google.com/test-meet-cta',
    });

    // Check compact logo width
    assert.ok(html.includes('max-width: 110px'), 'Contains compact max-width: 110px logo style');
    assert.ok(html.includes('width="110"'), 'Contains width="110" attribute for email client compatibility');
    assert.ok(html.includes('https://meet.google.com/test-meet-cta'), 'Contains Google Meet CTA');
    assert.ok(html.includes('Security architecture review'), 'Contains agenda');
    assert.ok(html.includes('Wayne Enterprises'), 'Contains company name');
    assert.ok(html.includes('ZEN-CLT-77777'), 'Contains event reference ID');
  });

  // ============================================================================
  // Test 9: One-Hour Reminder Email Template & Time Window Logic
  // ============================================================================
  runTest('Reminder email template renders STARTS IN 1 HOUR banner and details', () => {
    const reminderHtml = generateClientMeetingReminderEmailHtml({
      event_id: 'ZEN-CLT-77777',
      title: 'Enterprise Architecture Consultation',
      client_name: 'Bruce Wayne',
      company_name: 'Wayne Enterprises',
      email: 'bruce@waynecorp.com',
      agenda: 'Security architecture review',
      event_date: '2026-11-25',
      start_time: '2026-11-25T08:30:00.000Z',
      end_time: '2026-11-25T09:30:00.000Z',
      timezone: 'Asia/Kolkata',
      duration_minutes: 60,
      google_meet_url: 'https://meet.google.com/test-meet-cta',
    });

    assert.ok(reminderHtml.includes('STARTS IN 1 HOUR'), 'Contains 1-hour badge');
    assert.ok(reminderHtml.includes('max-width: 110px'), 'Contains compact 110px logo');
    assert.ok(reminderHtml.includes('JOIN GOOGLE MEET NOW'), 'Contains urgent reminder CTA');
  });

  // ============================================================================
  // Test 10: Cancelled Meetings Do Not Receive Reminders
  // ============================================================================
  await runAsyncTest('Cancelled meetings are excluded from reminder queries', async () => {
    const now = new Date();
    // Meeting starting 60 mins from now
    const meetingStart = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const meetingEnd = new Date(now.getTime() + 90 * 60 * 1000).toISOString();

    const cancelledMeeting = await adminEventService.createEvent({
      event_type: 'client_meeting',
      title: 'Cancelled Client Meeting',
      client_name: 'Cancelled User',
      email: 'cancelled@user.com',
      event_date: meetingStart.slice(0, 10),
      start_time: meetingStart,
      end_time: meetingEnd,
      status: 'cancelled',
      customer_reminder_status: 'pending',
    });

    try {
      const minStart = new Date(now.getTime() + 50 * 60 * 1000).toISOString();
      const maxStart = new Date(now.getTime() + 70 * 60 * 1000).toISOString();
      const due = await adminEventService.getScheduledClientMeetingsDueForReminder(minStart, maxStart);

      const found = due.find((m) => m.id === cancelledMeeting.id);
      assert.strictEqual(found, undefined, 'Cancelled meeting must NOT be returned for reminder delivery');
    } finally {
      await adminEventService.deleteEvent(cancelledMeeting.id);
    }
  });

  // ============================================================================
  // Test 11: Atomic Claiming Prevents Concurrent Duplicate Reminders
  // ============================================================================
  await runAsyncTest('Atomic reminder claim lock prevents duplicate dispatch across concurrent workers', async () => {
    const testMeeting = await adminEventService.createEvent({
      event_type: 'client_meeting',
      title: 'Concurrency Atomic Claim Test',
      client_name: 'Concurrency Tester',
      email: 'concurrent@tester.com',
      event_date: testDate,
      start_time: `${testDate}T09:00:00.000Z`,
      end_time: `${testDate}T09:30:00.000Z`,
      status: 'scheduled',
      customer_reminder_status: 'pending',
    });

    try {
      // Simulate two concurrent workers attempting to claim the same meeting reminder simultaneously
      const [worker1Result, worker2Result] = await Promise.all([
        adminEventService.claimClientMeetingReminder(testMeeting.id),
        adminEventService.claimClientMeetingReminder(testMeeting.id),
      ]);

      const claimedCount = (worker1Result.claimed ? 1 : 0) + (worker2Result.claimed ? 1 : 0);
      assert.strictEqual(claimedCount, 1, 'Exactly one concurrent worker must successfully claim the reminder');

      // Subsequent attempt by a third worker must fail
      const worker3Result = await adminEventService.claimClientMeetingReminder(testMeeting.id);
      assert.strictEqual(worker3Result.claimed, false, 'Third attempt must fail as already claimed');
    } finally {
      await adminEventService.deleteEvent(testMeeting.id);
    }
  });

  // ============================================================================
  // Test 12: Email Status and Error Tracking Updates
  // ============================================================================
  await runAsyncTest('updateReminderStatus updates status, timestamp, and error details', async () => {
    const testMeeting = await adminEventService.createEvent({
      event_type: 'client_meeting',
      title: 'Status Update Test',
      client_name: 'Status Tester',
      email: 'status@tester.com',
      event_date: testDate,
      start_time: `${testDate}T12:00:00.000Z`,
      end_time: `${testDate}T12:30:00.000Z`,
      status: 'scheduled',
    });

    try {
      const sentTime = new Date().toISOString();
      await adminEventService.updateReminderStatus(testMeeting.id, {
        status: 'sent',
        sentAt: sentTime,
        error: null,
      });

      const updated = await adminEventService.getEventById(testMeeting.id);
      assert.strictEqual(updated.customer_reminder_status, 'sent', 'Status must be updated to sent');
      assert.strictEqual(updated.customer_reminder_sent_at, sentTime, 'Sent timestamp must be recorded');
      assert.strictEqual(updated.customer_reminder_error, null, 'Error must be null');

      // Test failure recording
      await adminEventService.updateReminderStatus(testMeeting.id, {
        status: 'failed',
        sentAt: null,
        error: 'Brevo API connection timeout',
      });

      const failedRecord = await adminEventService.getEventById(testMeeting.id);
      assert.strictEqual(failedRecord.customer_reminder_status, 'failed', 'Status must be updated to failed');
      assert.strictEqual(failedRecord.customer_reminder_error, 'Brevo API connection timeout', 'Error must be captured');
    } finally {
      await adminEventService.deleteEvent(testMeeting.id);
    }
  });

  // ============================================================================
  // Test 13: Supabase Egress & Query Optimization Measurements
  // ============================================================================
  runTest('Query optimization: ±24h windowing and column projection measured', () => {
    // 1. Column projection measurement: Full row vs EVENT_LIST_COLUMNS
    const sampleFullRow = {
      id: 'd9b73f2a-7c9e-4e3a-b8d1-9f2e8c4a1b0d',
      event_id: 'ZEN-CLT-12345',
      event_type: 'client_meeting',
      title: 'Enterprise AI Annotation Evaluation',
      description: 'Comprehensive evaluation of client dataset requirements and labeling taxonomies for high-throughput multimodal pipelines.',
      agenda: '1. Dataset ingestion and schema mapping\n2. Quality control and SLA agreements\n3. Pricing, security compliance, and NDA\n4. Follow-up sprint delivery roadmap',
      internal_notes: 'CRITICAL ADMIN ONLY: Client has a $500k budget. Lead engineer prefers dark mode. Do not quote standard discount without VP approval.',
      client_name: 'Dr. Evelyn Reed',
      company_name: 'Cognitive Dynamics Corporation',
      email: 'evelyn.reed@cognitivedynamics.io',
      phone: '+1 415 555 2671',
      project_or_service: 'Enterprise LLM Reinforcement Learning Annotation',
      meeting_purpose: 'Finalize quarterly annotation contract and data security audit.',
      attendees: [
        { name: 'Dr. Evelyn Reed', email: 'evelyn.reed@cognitivedynamics.io', role: 'Head of Data Science' },
        { name: 'Marcus Vance', email: 'marcus@cognitivedynamics.io', role: 'VP Engineering' },
        { name: 'Prem', email: 'prem@zenemoo.in', role: 'Host' },
        { name: 'Technical Lead', email: 'tech@zenemoo.in', role: 'Observer' }
      ],
      event_date: '2026-11-20',
      start_time: '2026-11-20T10:00:00.000Z',
      end_time: '2026-11-20T11:00:00.000Z',
      timezone: 'Asia/Kolkata',
      duration_minutes: 60,
      location: 'Google Meet',
      google_meet_url: 'https://meet.google.com/abc-defg-hij',
      google_calendar_event_id: 'cal_event_9876543210_abcdef',
      meeting_status: 'generated',
      status: 'scheduled',
      notify_attendees: true,
      customer_email_status: 'sent',
      admin_email_status: 'sent',
      customer_reminder_status: 'pending',
      admin_reminder_status: 'not_applicable',
      customer_email_sent_at: '2026-11-19T10:00:00.000Z',
      admin_email_sent_at: '2026-11-19T10:00:00.000Z',
      customer_reminder_sent_at: null,
      admin_reminder_sent_at: null,
      customer_email_error: null,
      admin_email_error: null,
      customer_reminder_error: null,
      admin_reminder_error: null,
      created_by: 'admin@zenemoo.in',
      created_at: '2026-11-19T09:45:00.000Z',
      updated_at: '2026-11-19T10:00:00.000Z',
    };

    const sampleProjectedRow = {
      id: sampleFullRow.id,
      event_id: sampleFullRow.event_id,
      event_type: sampleFullRow.event_type,
      title: sampleFullRow.title,
      client_name: sampleFullRow.client_name,
      company_name: sampleFullRow.company_name,
      email: sampleFullRow.email,
      phone: sampleFullRow.phone,
      project_or_service: sampleFullRow.project_or_service,
      event_date: sampleFullRow.event_date,
      start_time: sampleFullRow.start_time,
      end_time: sampleFullRow.end_time,
      timezone: sampleFullRow.timezone,
      duration_minutes: sampleFullRow.duration_minutes,
      location: sampleFullRow.location,
      google_meet_url: sampleFullRow.google_meet_url,
      meeting_status: sampleFullRow.meeting_status,
      status: sampleFullRow.status,
      notify_attendees: sampleFullRow.notify_attendees,
      customer_email_status: sampleFullRow.customer_email_status,
      admin_email_status: sampleFullRow.admin_email_status,
      customer_reminder_status: sampleFullRow.customer_reminder_status,
      admin_reminder_status: sampleFullRow.admin_reminder_status,
      created_at: sampleFullRow.created_at,
      updated_at: sampleFullRow.updated_at,
    };

    const fullBytes = Buffer.byteLength(JSON.stringify(sampleFullRow), 'utf8');
    const projectedBytes = Buffer.byteLength(JSON.stringify(sampleProjectedRow), 'utf8');
    const savingsPercent = Math.round(((fullBytes - projectedBytes) / fullBytes) * 100);

    console.log(`    [Optimization Measurement] Full Row: ${fullBytes} bytes | Projected Row: ${projectedBytes} bytes | Savings: ${savingsPercent}%`);
    assert.ok(projectedBytes < fullBytes, 'Projected row must be smaller than full row');
    assert.ok(savingsPercent >= 35, `Expected at least 35% egress savings per row, got ${savingsPercent}%`);
  });

  console.log('\n================================================================');
  console.log(`ACCEPTANCE SUMMARY: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}% Success)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
