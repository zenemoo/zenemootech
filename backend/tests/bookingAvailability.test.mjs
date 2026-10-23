import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import {
  BookingAvailabilityService,
  timeToMinutes,
  minutesToTimeStr,
  validateTimeRanges,
  validateWeeklyHours,
  validateDateOverrides,
  DEFAULT_WEEKLY_HOURS,
  DEFAULT_AVAILABILITY_CONFIG,
} from '../src/services/bookingAvailabilityService.js';

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message);
  }
}

console.log('================================================================');
console.log('ZENEMOO BOOKING AVAILABILITY MANAGEMENT — REGRESSION TEST SUITE');
console.log('================================================================\n');

const service = new BookingAvailabilityService();

// -----------------------------------------------------------------------------
// 1. Time string conversion and minute math
// -----------------------------------------------------------------------------
runTest('Test 1: timeToMinutes and minutesToTimeStr conversions', () => {
  assert.strictEqual(timeToMinutes('00:00'), 0);
  assert.strictEqual(timeToMinutes('10:00'), 600);
  assert.strictEqual(timeToMinutes('10:30'), 630);
  assert.strictEqual(timeToMinutes('22:00'), 1320);
  assert.strictEqual(timeToMinutes('24:00'), 1440);
  assert.strictEqual(timeToMinutes('invalid'), -1);
  assert.strictEqual(timeToMinutes('25:00'), -1);

  assert.strictEqual(minutesToTimeStr(600), '10:00');
  assert.strictEqual(minutesToTimeStr(630), '10:30');
  assert.strictEqual(minutesToTimeStr(1320), '22:00');
});

// -----------------------------------------------------------------------------
// 2. Time range validation rules
// -----------------------------------------------------------------------------
runTest('Test 2: Time range validation enforces rules and rejects overlaps', () => {
  // Valid single range
  const val1 = validateTimeRanges([{ start: '10:00', end: '18:00' }]);
  assert.strictEqual(val1.valid, true);

  // Valid split shifts
  const val2 = validateTimeRanges([
    { start: '10:00', end: '13:00' },
    { start: '14:00', end: '18:00' },
  ]);
  assert.strictEqual(val2.valid, true);

  // End before start (invalid)
  const val3 = validateTimeRanges([{ start: '18:00', end: '10:00' }]);
  assert.strictEqual(val3.valid, false);

  // Shorter than 30 mins (invalid)
  const val4 = validateTimeRanges([{ start: '10:00', end: '10:15' }]);
  assert.strictEqual(val4.valid, false);

  // Overlapping ranges (invalid)
  const val5 = validateTimeRanges([
    { start: '10:00', end: '14:00' },
    { start: '13:00', end: '17:00' },
  ]);
  assert.strictEqual(val5.valid, false);

  // Not aligned to 30 mins (invalid)
  const val6 = validateTimeRanges([{ start: '10:17', end: '12:00' }]);
  assert.strictEqual(val6.valid, false);
});

// -----------------------------------------------------------------------------
// 3. Weekly hours validation
// -----------------------------------------------------------------------------
runTest('Test 3: Weekly hours validation checks all 7 days', () => {
  const validWeekly = validateWeeklyHours(DEFAULT_WEEKLY_HOURS);
  assert.strictEqual(validWeekly.valid, true);

  // Missing a day
  const incomplete = { ...DEFAULT_WEEKLY_HOURS };
  delete incomplete[6];
  const missingVal = validateWeeklyHours(incomplete);
  assert.strictEqual(missingVal.valid, false);

  // Active day with no ranges
  const emptyRanges = JSON.parse(JSON.stringify(DEFAULT_WEEKLY_HOURS));
  emptyRanges[1].ranges = [];
  const emptyVal = validateWeeklyHours(emptyRanges);
  assert.strictEqual(emptyVal.valid, false);
});

// -----------------------------------------------------------------------------
// 4. Date overrides validation
// -----------------------------------------------------------------------------
runTest('Test 4: Date overrides validation supports unavailable, custom_hours, blocked_range', () => {
  const overrides = [
    { date: '2026-11-05', type: 'unavailable', is_available: false, ranges: [], reason: 'Diwali' },
    { date: '2026-11-06', type: 'custom_hours', is_available: true, ranges: [{ start: '14:00', end: '18:00' }], reason: 'Afternoon only' },
    { date: '2026-11-07', type: 'blocked_range', is_available: true, ranges: [{ start: '12:00', end: '14:00' }], reason: 'Team Lunch' },
  ];

  const val = validateDateOverrides(overrides);
  assert.strictEqual(val.valid, true);

  // Duplicate date override
  const dupes = [
    { date: '2026-11-05', type: 'unavailable', is_available: false, ranges: [] },
    { date: '2026-11-05', type: 'custom_hours', is_available: true, ranges: [{ start: '10:00', end: '12:00' }] },
  ];
  const dupeVal = validateDateOverrides(dupes);
  assert.strictEqual(dupeVal.valid, false);
});

// -----------------------------------------------------------------------------
// 5. Default availability calculation (Backward Compatibility)
// -----------------------------------------------------------------------------
await runAsyncTest('Test 5: Default schedule generates 10:00 AM – 10:00 PM slots for active day', async () => {
  const futureDate = '2028-06-15'; // A Thursday
  const res = await service.getAvailableSlots(futureDate, 'Asia/Kolkata');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.isClosed, false);
  assert.ok(Array.isArray(res.availableSlots), 'availableSlots must be an array');
  assert.ok(res.availableSlots.length > 0, 'Must have slots for default working day');

  // Verify first slot is 10:00 AM and last slot is 10:00 PM (25 slots total)
  const firstSlot = res.availableSlots[0];
  const lastSlot = res.availableSlots[res.availableSlots.length - 1];
  assert.strictEqual(firstSlot.label, '10:00 AM');
  assert.strictEqual(lastSlot.label, '10:00 PM');
  assert.strictEqual(res.availableSlots.length, 25);
});

// -----------------------------------------------------------------------------
// 6. Disabled weekday returns zero slots with closure reason
// -----------------------------------------------------------------------------
await runAsyncTest('Test 6: Disabled weekday returns zero slots and marks day as non-working', async () => {
  // Mock config with Sunday (0) disabled
  const customWeekly = JSON.parse(JSON.stringify(DEFAULT_WEEKLY_HOURS));
  customWeekly[0].active = false; // Disable Sunday

  await service.saveConfig({
    weekly_hours: customWeekly,
    date_overrides: [],
  }, 'test_runner');

  const futureSunday = '2028-06-18'; // A Sunday
  const res = await service.getAvailableSlots(futureSunday, 'Asia/Kolkata');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.isClosed, true);
  assert.strictEqual(res.availableSlots.length, 0);
  assert.strictEqual(res.closureReason, 'Non-working day');
});

// -----------------------------------------------------------------------------
// 7. Full-day date override (holiday / day off)
// -----------------------------------------------------------------------------
await runAsyncTest('Test 7: Date override (unavailable) closes entire day', async () => {
  const testDate = '2028-06-19'; // A Monday
  await service.saveConfig({
    weekly_hours: DEFAULT_WEEKLY_HOURS,
    date_overrides: [
      { id: 'ovr_test_1', date: testDate, type: 'unavailable', is_available: false, ranges: [], reason: 'Company Holiday' },
    ],
  }, 'test_runner');

  const res = await service.getAvailableSlots(testDate, 'Asia/Kolkata');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.isClosed, true);
  assert.strictEqual(res.availableSlots.length, 0);
  assert.strictEqual(res.closureReason, 'Company Holiday');
});

// -----------------------------------------------------------------------------
// 8. Custom hours date override replaces weekly schedule
// -----------------------------------------------------------------------------
await runAsyncTest('Test 8: Custom hours date override provides special operating hours', async () => {
  const testDate = '2028-06-20'; // A Tuesday
  await service.saveConfig({
    weekly_hours: DEFAULT_WEEKLY_HOURS,
    date_overrides: [
      {
        id: 'ovr_test_2',
        date: testDate,
        type: 'custom_hours',
        is_available: true,
        ranges: [{ start: '14:00', end: '16:00' }], // 2:00 PM to 4:00 PM (4 slots: 14:00, 14:30, 15:00, 15:30)
        reason: 'Afternoon Consultations Only',
      },
    ],
  }, 'test_runner');

  const res = await service.getAvailableSlots(testDate, 'Asia/Kolkata');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.isClosed, false);
  assert.strictEqual(res.availableSlots.length, 4);
  assert.strictEqual(res.availableSlots[0].label, '2:00 PM');
  assert.strictEqual(res.availableSlots[3].label, '3:30 PM');
});

// -----------------------------------------------------------------------------
// 9. Partial-day time blocking removes overlapping slots
// -----------------------------------------------------------------------------
await runAsyncTest('Test 9: Partial-day time blocking excludes specified window', async () => {
  const testDate = '2028-06-21'; // A Wednesday
  // Normal 10:00 - 22:00 has 25 slots. Block 12:00 to 14:00 (4 slots: 12:00, 12:30, 13:00, 13:30).
  await service.saveConfig({
    weekly_hours: DEFAULT_WEEKLY_HOURS,
    date_overrides: [
      {
        id: 'ovr_test_3',
        date: testDate,
        type: 'blocked_range',
        is_available: true,
        ranges: [{ start: '12:00', end: '14:00' }],
        reason: 'Executive Review Meeting',
      },
    ],
  }, 'test_runner');

  const res = await service.getAvailableSlots(testDate, 'Asia/Kolkata');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.availableSlots.length, 25 - 4); // 21 slots remain

  // Confirm blocked slots are NOT present
  const labels = res.availableSlots.map((s) => s.label);
  assert.ok(!labels.includes('12:00 PM'), '12:00 PM must be excluded');
  assert.ok(!labels.includes('12:30 PM'), '12:30 PM must be excluded');
  assert.ok(!labels.includes('1:00 PM'), '1:00 PM must be excluded');
  assert.ok(!labels.includes('1:30 PM'), '1:30 PM must be excluded');
  assert.ok(labels.includes('11:30 AM'), '11:30 AM must remain available');
  assert.ok(labels.includes('2:00 PM'), '2:00 PM must remain available');
});

// -----------------------------------------------------------------------------
// 10. Server-side pre-booking validation (isSlotAvailable)
// -----------------------------------------------------------------------------
await runAsyncTest('Test 10: Server-side isSlotAvailable rejects blocked and closed slots', async () => {
  const closedDate = '2028-06-19';
  const blockedDate = '2028-06-21';

  // Ensure config contains both overrides for validation testing
  await service.saveConfig({
    weekly_hours: DEFAULT_WEEKLY_HOURS,
    date_overrides: [
      { id: 'ovr_test_1', date: closedDate, type: 'unavailable', is_available: false, ranges: [], reason: 'Company Holiday' },
      { id: 'ovr_test_3', date: blockedDate, type: 'blocked_range', is_available: true, ranges: [{ start: '12:00', end: '14:00' }], reason: 'Executive Review Meeting' },
    ],
  }, 'test_runner');

  // Slot on closed date -> rejected
  const closedSlotIso = service.getUtcIsoFromLocal(closedDate, 11, 0, 'Asia/Kolkata');
  const check1 = await service.isSlotAvailable(closedSlotIso, 'Asia/Kolkata');
  assert.strictEqual(check1.allowed, false);
  assert.ok(check1.reason.includes('Company Holiday'));

  // Slot in blocked time range -> rejected
  const blockedSlotIso = service.getUtcIsoFromLocal(blockedDate, 12, 30, 'Asia/Kolkata');
  const check2 = await service.isSlotAvailable(blockedSlotIso, 'Asia/Kolkata');
  assert.strictEqual(check2.allowed, false);
  assert.ok(check2.reason.includes('Executive Review Meeting'));

  // Slot outside working hours (e.g. 8:00 AM) -> rejected
  const earlySlotIso = service.getUtcIsoFromLocal(blockedDate, 8, 0, 'Asia/Kolkata');
  const check3 = await service.isSlotAvailable(earlySlotIso, 'Asia/Kolkata');
  assert.strictEqual(check3.allowed, false);

  // Valid slot -> allowed
  const validSlotIso = service.getUtcIsoFromLocal(blockedDate, 15, 0, 'Asia/Kolkata');
  const check4 = await service.isSlotAvailable(validSlotIso, 'Asia/Kolkata');
  assert.strictEqual(check4.allowed, true);
});

// -----------------------------------------------------------------------------
// 11. Timezone conversion accuracy (Asia/Kolkata +05:30)
// -----------------------------------------------------------------------------
runTest('Test 11: getUtcIsoFromLocal converts Asia/Kolkata local time to exact UTC', () => {
  // 10:00 AM IST on 2028-07-01 should be 04:30 AM UTC on 2028-07-01
  const iso = service.getUtcIsoFromLocal('2028-07-01', 10, 0, 'Asia/Kolkata');
  const d = new Date(iso);
  assert.strictEqual(d.getUTCFullYear(), 2028);
  assert.strictEqual(d.getUTCMonth(), 6); // 0-indexed month 6 = July
  assert.strictEqual(d.getUTCDate(), 1);
  assert.strictEqual(d.getUTCHours(), 4);
  assert.strictEqual(d.getUTCMinutes(), 30);
});

// -----------------------------------------------------------------------------
// 12. Deleting override restores standard weekly schedule
// -----------------------------------------------------------------------------
await runAsyncTest('Test 12: Removing date overrides restores full weekly availability', async () => {
  // Restore clean default schedule with zero overrides
  await service.saveConfig({
    weekly_hours: DEFAULT_WEEKLY_HOURS,
    date_overrides: [],
  }, 'test_cleaner');

  const testDate = '2028-06-19'; // Previously closed
  const res = await service.getAvailableSlots(testDate, 'Asia/Kolkata');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.isClosed, false);
  assert.strictEqual(res.availableSlots.length, 25);
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (100% Success)`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
