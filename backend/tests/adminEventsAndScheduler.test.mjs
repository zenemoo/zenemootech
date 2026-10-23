import assert from 'assert';
import { adminEventService } from '../src/services/adminEventService.js';
import { bookingAvailabilityService } from '../src/services/bookingAvailabilityService.js';
import {
  generateClientMeetingEmailHtml,
  generateInternalEventEmailHtml,
  formatEventDate,
  formatEventTime,
  formatEventTimeRange,
} from '../src/services/clientMeetingEmailTemplate.js';

console.log('================================================================');
console.log('ZENEMOO ADMIN EVENT & CLIENT MEETING SCHEDULER — TEST SUITE');
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
  // Test 1: Email Template Helpers
  runTest('Email date and time formatting helpers', () => {
    const formattedDate = formatEventDate('2026-11-15T09:00:00.000Z', 'Asia/Kolkata');
    assert.ok(formattedDate.includes('November 15'), `Expected November 15, got ${formattedDate}`);

    const formattedTime = formatEventTime('2026-11-15T09:30:00.000Z', 'Asia/Kolkata');
    assert.ok(formattedTime.includes(':'), 'Expected formatted time string');

    const range = formatEventTimeRange('2026-11-15T09:00:00.000Z', '2026-11-15T10:00:00.000Z', 'Asia/Kolkata');
    assert.ok(range.includes('–'), 'Expected range separator');
  });

  // Test 2: Client Meeting Email Generation
  runTest('generateClientMeetingEmailHtml renders branded HTML with meeting details', () => {
    const html = generateClientMeetingEmailHtml({
      event_id: 'ZEN-CLT-99999',
      title: 'AI Data Strategy Consultation',
      client_name: 'Sarah Connor',
      company_name: 'Cyberdyne Systems',
      email: 'sarah@cyberdyne.com',
      project_or_service: 'Enterprise LLM Fine-tuning',
      meeting_purpose: 'Discuss custom speech data corpus requirements.',
      event_date: '2026-11-15',
      start_time: '2026-11-15T09:30:00.000Z',
      end_time: '2026-11-15T10:30:00.000Z',
      timezone: 'Asia/Kolkata',
      duration_minutes: 60,
      google_meet_url: 'https://meet.google.com/test-meet-url',
    });

    assert.ok(html.includes('ZEN-CLT-99999'), 'Contains event ID');
    assert.ok(html.includes('Sarah Connor'), 'Contains client name');
    assert.ok(html.includes('Cyberdyne Systems'), 'Contains company name');
    assert.ok(html.includes('https://meet.google.com/test-meet-url'), 'Contains Google Meet link');
    assert.ok(html.includes('JOIN GOOGLE MEET'), 'Contains Meet CTA button');
  });

  // Test 3: Internal Event Email Generation
  runTest('generateInternalEventEmailHtml renders internal training details', () => {
    const html = generateInternalEventEmailHtml({
      event_id: 'ZEN-EVT-12345',
      title: 'Quarterly AI Annotation Training',
      description: 'Hands-on training for multimodal annotation pipelines.',
      agenda: '1. Overview\n2. Quality Benchmarks\n3. Q&A',
      event_date: '2026-11-16',
      start_time: '2026-11-16T05:30:00.000Z',
      end_time: '2026-11-16T07:30:00.000Z',
      timezone: 'Asia/Kolkata',
      duration_minutes: 120,
      location: 'Zenemoo Main Conference Room / Online',
    });

    assert.ok(html.includes('ZEN-EVT-12345'), 'Contains event ID');
    assert.ok(html.includes('Quarterly AI Annotation Training'), 'Contains title');
    assert.ok(html.includes('Quality Benchmarks'), 'Contains agenda snippet');
  });

  // Clean local store for isolated testing
  const testDate = '2026-12-01'; // Future Tuesday

  // Test 4: Create Internal Event via Service
  let internalEvent = null;
  await runAsyncTest('Create internal event in local/Supabase store', async () => {
    internalEvent = await adminEventService.createEvent({
      event_type: 'internal_event',
      title: 'Sprint Planning & Architecture Sync',
      event_date: testDate,
      start_time: `${testDate}T05:30:00.000Z`, // 11:00 AM IST
      end_time: `${testDate}T06:30:00.000Z`,   // 12:00 PM IST (60 mins)
      duration_minutes: 60,
      status: 'scheduled',
      attendees: [{ name: 'Prem', email: 'prem@zenemoo.in' }],
    });

    assert.ok(internalEvent.id, 'Expected generated UUID');
    assert.ok(internalEvent.event_id.startsWith('ZEN-EVT-'), 'Expected ZEN-EVT prefix');
    assert.strictEqual(internalEvent.status, 'scheduled');
  });

  // Test 5: Shared Availability Blocking
  await runAsyncTest('Scheduled admin event automatically blocks overlapping public 30-min slots', async () => {
    const avail = await bookingAvailabilityService.getAvailableSlots(testDate, 'Asia/Kolkata');
    assert.strictEqual(avail.success, true);
    assert.ok(Array.isArray(avail.availableSlots));

    // 11:00 AM IST is 05:30 UTC
    // 11:30 AM IST is 06:00 UTC
    // Both fall inside 11:00 AM - 12:00 PM IST window
    const slot1100 = avail.availableSlots.find((s) => s.label === '11:00 AM');
    const slot1130 = avail.availableSlots.find((s) => s.label === '11:30 AM');
    const slot1200 = avail.availableSlots.find((s) => s.label === '12:00 PM');
    const slot1030 = avail.availableSlots.find((s) => s.label === '10:30 AM');

    assert.ok(slot1100, 'Slot 11:00 AM should exist');
    assert.ok(slot1130, 'Slot 11:30 AM should exist');
    assert.ok(slot1200, 'Slot 12:00 PM should exist');
    assert.ok(slot1030, 'Slot 10:30 AM should exist');

    assert.strictEqual(slot1100.available, false, '11:00 AM slot must be blocked by admin event');
    assert.strictEqual(slot1130.available, false, '11:30 AM slot must be blocked by admin event');
    assert.strictEqual(slot1030.available, true, '10:30 AM slot before event must remain available');
    assert.strictEqual(slot1200.available, true, '12:00 PM slot after event must remain available');
  });

  // Test 6: Partial-Hour Event (e.g., 45 minutes)
  let clientMeeting45 = null;
  await runAsyncTest('Partial-hour event (45 mins) blocks all intersecting 30-min slots', async () => {
    // 2:15 PM IST to 3:00 PM IST (45 mins)
    // 2:15 PM IST = 08:45 UTC; 3:00 PM IST = 09:30 UTC
    clientMeeting45 = await adminEventService.createEvent({
      event_type: 'client_meeting',
      title: 'Discovery with Apex AI',
      client_name: 'Alex Mercer',
      company_name: 'Apex AI',
      email: 'alex@apexai.com',
      event_date: testDate,
      start_time: `${testDate}T08:45:00.000Z`, // 14:15 IST
      end_time: `${testDate}T09:30:00.000Z`,   // 15:00 IST
      duration_minutes: 45,
      status: 'scheduled',
    });

    const avail = await bookingAvailabilityService.getAvailableSlots(testDate, 'Asia/Kolkata');
    const slot1400 = avail.availableSlots.find((s) => s.label === '2:00 PM'); // 14:00 - 14:30 intersects 14:15 - 15:00
    const slot1430 = avail.availableSlots.find((s) => s.label === '2:30 PM'); // 14:30 - 15:00 intersects 14:15 - 15:00
    const slot1500 = avail.availableSlots.find((s) => s.label === '3:00 PM'); // 15:00 - 15:30 does NOT intersect

    assert.strictEqual(slot1400.available, false, '2:00 PM slot must be blocked by intersecting 14:15 meeting');
    assert.strictEqual(slot1430.available, false, '2:30 PM slot must be blocked by intersecting 14:15 meeting');
    assert.strictEqual(slot1500.available, true, '3:00 PM slot should remain available');
  });

  // Test 7: Draft Status Non-Blocking
  await runAsyncTest('Draft events do NOT block public availability', async () => {
    const draftEvent = await adminEventService.createEvent({
      event_type: 'internal_event',
      title: 'Tentative Team Offsite Discussion',
      event_date: testDate,
      start_time: `${testDate}T10:30:00.000Z`, // 4:00 PM IST
      end_time: `${testDate}T11:30:00.000Z`,   // 5:00 PM IST
      duration_minutes: 60,
      status: 'draft',
    });

    const avail = await bookingAvailabilityService.getAvailableSlots(testDate, 'Asia/Kolkata');
    const slot1600 = avail.availableSlots.find((s) => s.label === '4:00 PM');
    const slot1630 = avail.availableSlots.find((s) => s.label === '4:30 PM');

    assert.strictEqual(slot1600.available, true, 'Draft event must NOT block 4:00 PM');
    assert.strictEqual(slot1630.available, true, 'Draft event must NOT block 4:30 PM');

    // Clean up draft
    await adminEventService.deleteEvent(draftEvent.id);
  });

  // Test 8: Cancellation Releases Reserved Time
  await runAsyncTest('Cancelling a scheduled event immediately releases the reserved slots', async () => {
    // Cancel the internal event (11:00 AM - 12:00 PM)
    await adminEventService.updateEvent(internalEvent.id, { status: 'cancelled' });

    const avail = await bookingAvailabilityService.getAvailableSlots(testDate, 'Asia/Kolkata');
    const slot1100 = avail.availableSlots.find((s) => s.label === '11:00 AM');
    const slot1130 = avail.availableSlots.find((s) => s.label === '11:30 AM');

    assert.strictEqual(slot1100.available, true, 'Cancelled event must release 11:00 AM slot');
    assert.strictEqual(slot1130.available, true, 'Cancelled event must release 11:30 AM slot');
  });

  // Test 9: Conflict Check Endpoint Logic
  await runAsyncTest('checkIntervalConflict detects overlap against active client meeting', async () => {
    // clientMeeting45 is 14:15 - 15:00 IST (08:45 - 09:30 UTC)
    const conflictResult = await adminEventService.checkIntervalConflict({
      startTimeIso: `${testDate}T09:00:00.000Z`,
      endTimeIso: `${testDate}T10:00:00.000Z`,
    });

    assert.strictEqual(conflictResult.hasConflict, true, 'Expected conflict with existing meeting');
    assert.strictEqual(conflictResult.conflictType, 'admin_event');
    assert.ok(conflictResult.conflictingRecord.reference.startsWith('ZEN-CLT-'));

    // Test non-conflicting time (16:00 - 17:00 UTC)
    const noConflictResult = await adminEventService.checkIntervalConflict({
      startTimeIso: `${testDate}T16:00:00.000Z`,
      endTimeIso: `${testDate}T17:00:00.000Z`,
    });
    assert.strictEqual(noConflictResult.hasConflict, false, 'Expected no conflict for open time');
  });

  // Test 10: Server-side isSlotAvailable rejects booking overlapping with active admin event
  await runAsyncTest('isSlotAvailable rejects submission for slot reserved by admin event', async () => {
    // clientMeeting45 is 14:15 - 15:00 IST on testDate
    // Slot 14:30 IST is 09:00 UTC
    const check1430 = await bookingAvailabilityService.isSlotAvailable(`${testDate}T09:00:00.000Z`, 'Asia/Kolkata');
    assert.strictEqual(check1430.allowed, false, 'Expected isSlotAvailable to reject slot overlapping admin event');
    assert.ok(check1430.reason.includes('overlaps with a scheduled event'));

    // Slot 15:30 IST is 10:00 UTC (free)
    const check1530 = await bookingAvailabilityService.isSlotAvailable(`${testDate}T10:00:00.000Z`, 'Asia/Kolkata');
    assert.strictEqual(check1530.allowed, true, 'Expected isSlotAvailable to allow open slot');
  });

  // Clean up test data
  if (internalEvent) await adminEventService.deleteEvent(internalEvent.id);
  if (clientMeeting45) await adminEventService.deleteEvent(clientMeeting45.id);

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}% Success)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
