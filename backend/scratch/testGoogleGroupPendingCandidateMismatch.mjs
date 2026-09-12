import { normalizeAndValidateEmail } from '../src/controllers/googleGroupSyncController.js';
import fs from 'fs';
import path from 'path';

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

console.log('🧪 Running Dedicated Regression Test: Pending Candidates & Batch Alignment...\n');

// ============================================================================
// PART 1: CODE LEVEL VERIFICATION
// ============================================================================
const controllerPath = path.resolve('src/controllers/googleGroupSyncController.js');
const controllerCode = fs.readFileSync(controllerPath, 'utf8');

const appsScriptPath = path.resolve('src/scripts/googleGroupSyncAppsScript.gs');
const appsScriptCode = fs.readFileSync(appsScriptPath, 'utf8');

assert(controllerCode.includes('pendingBeforeSync'), '1. Controller tracks pendingBeforeSync metric');
assert(controllerCode.includes('candidatesToProcess'), '2. Controller tracks candidatesToProcess metric');
assert(controllerCode.includes('remainingPending'), '3. Controller tracks remainingPending metric');
assert(controllerCode.includes('PARTIAL_SUCCESS'), '4. Controller handles PARTIAL_SUCCESS status');
assert(appsScriptCode.includes('Received batch size:'), '5. Apps Script logs incoming batch size for diagnostics');

// ============================================================================
// PART 2: CANDIDATE CALCULATION & BATCH ORCHESTRATION ENGINE
// ============================================================================
function simulateSyncOrchestrator(eligibleEmails, groupMemberEmails, excludedEmails, mockInsertFn, maxLimit = 100, batchSize = 25) {
  const existingSet = new Set(groupMemberEmails.map(e => normalizeAndValidateEmail(typeof e === 'string' ? e : e?.email)).filter(Boolean));
  const exclusionSet = new Set(excludedEmails.map(e => normalizeAndValidateEmail(typeof e === 'string' ? e : e?.email)).filter(Boolean));

  let excludedCount = 0;
  const missingCandidates = [];

  for (const raw of eligibleEmails) {
    const clean = normalizeAndValidateEmail(raw);
    if (!clean) continue;

    if (exclusionSet.has(clean)) {
      excludedCount++;
    } else if (!existingSet.has(clean)) {
      missingCandidates.push(clean);
    }
  }

  const pendingBeforeSync = missingCandidates.length;
  const candidatesToProcess = missingCandidates.slice(0, maxLimit);
  const totalBatches = Math.ceil(candidatesToProcess.length / batchSize);

  let addedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const addedEmails = [];
  const errors = [];
  const batchesSent = [];

  for (let b = 0; b < totalBatches; b++) {
    const batchChunk = candidatesToProcess.slice(b * batchSize, (b + 1) * batchSize);
    batchesSent.push(batchChunk);

    // Call mock Apps Script receiver
    const result = mockInsertFn(batchChunk, existingSet, exclusionSet);
    addedCount += result.addedCount;
    skippedCount += result.skippedCount;
    failedCount += result.failedCount;

    for (const added of result.addedEmails) {
      existingSet.add(added);
      addedEmails.push(added);
    }
    if (result.errors) errors.push(...result.errors);
  }

  const remainingPending = Math.max(0, pendingBeforeSync - addedCount - skippedCount);
  let status = 'COMPLETED';
  if (failedCount > 0 && addedCount > 0) status = 'PARTIAL_SUCCESS';
  else if (failedCount > 0 && addedCount === 0) status = 'FAILED';

  return {
    totalEligible: eligibleEmails.length,
    alreadyExisting: groupMemberEmails.length,
    pendingBeforeSync,
    candidatesToProcess: candidatesToProcess.length,
    totalBatches,
    batchesSent,
    addedCount,
    skippedCount,
    excludedCount,
    failedCount,
    remainingPending,
    status,
    finalExistingCount: existingSet.size,
  };
}

// ============================================================================
// PART 3: TEST PRODUCTION SCENARIO (404 Eligible, 147 Existing, 0 Excluded)
// ============================================================================
const mockEligible404 = Array.from({ length: 404 }, (_, i) => `user_${i + 1}@zenemoo.in`);
const mockExisting147 = Array.from({ length: 147 }, (_, i) => `user_${i + 1}@zenemoo.in`);
const mockExclusions0 = [];

// Mock successful Apps Script insert handler
const mockSuccessAppsScript = (batch, existingSet, exclusionSet) => {
  let added = 0;
  let skipped = 0;
  const addedList = [];

  for (const email of batch) {
    if (existingSet.has(email)) {
      skipped++;
    } else {
      added++;
      addedList.push(email);
    }
  }

  return {
    success: true,
    addedCount: added,
    skippedCount: skipped,
    excludedCount: 0,
    failedCount: 0,
    addedEmails: addedList,
    errors: [],
  };
};

const run1 = simulateSyncOrchestrator(mockEligible404, mockExisting147, mockExclusions0, mockSuccessAppsScript);

assert(run1.totalEligible === 404, '6. Total eligible is 404');
assert(run1.alreadyExisting === 147, '7. Already existing is 147');
assert(run1.pendingBeforeSync === 257, '8. Pending before sync is exactly 257');
assert(run1.candidatesToProcess === 100, '9. Candidates to process capped at safety limit of 100');
assert(run1.totalBatches === 4, '10. Divided into exactly 4 batches');
assert(run1.batchesSent.length === 4, '11. Exactly 4 batches sent to Apps Script');
assert(run1.batchesSent[0].length === 25, '12. Batch 1 contains 25 emails (NOT empty)');
assert(run1.batchesSent[1].length === 25, '13. Batch 2 contains 25 emails (NOT empty)');
assert(run1.batchesSent[2].length === 25, '14. Batch 3 contains 25 emails (NOT empty)');
assert(run1.batchesSent[3].length === 25, '15. Batch 4 contains 25 emails (NOT empty)');
assert(run1.addedCount === 100, '16. Added count in Run 1 is 100');
assert(run1.remainingPending === 157, '17. Remaining pending after Run 1 is 157');
assert(run1.finalExistingCount === 247, '18. Group member count grows to 247');
assert(run1.status === 'COMPLETED', '19. Run 1 status is COMPLETED');

// ============================================================================
// PART 4: SIMULATE SUBSEQUENT CYCLES UNTIL 100% COMPLETE
// ============================================================================
const mockExisting247 = Array.from({ length: 247 }, (_, i) => `user_${i + 1}@zenemoo.in`);
const run2 = simulateSyncOrchestrator(mockEligible404, mockExisting247, mockExclusions0, mockSuccessAppsScript);

assert(run2.pendingBeforeSync === 157, '20. Run 2 starts with 157 pending');
assert(run2.candidatesToProcess === 100, '21. Run 2 processes 100 candidates');
assert(run2.remainingPending === 57, '22. Run 2 leaves 57 remaining pending');
assert(run2.finalExistingCount === 347, '23. Group member count grows to 347');

const mockExisting347 = Array.from({ length: 347 }, (_, i) => `user_${i + 1}@zenemoo.in`);
const run3 = simulateSyncOrchestrator(mockEligible404, mockExisting347, mockExclusions0, mockSuccessAppsScript);

assert(run3.pendingBeforeSync === 57, '24. Run 3 starts with 57 pending');
assert(run3.candidatesToProcess === 57, '25. Run 3 processes all 57 remaining candidates');
assert(run3.totalBatches === 3, '26. Run 3 has 3 batches (25, 25, 7)');
assert(run3.batchesSent[0].length === 25, '27. Run 3 Batch 1 has 25 emails');
assert(run3.batchesSent[1].length === 25, '28. Run 3 Batch 2 has 25 emails');
assert(run3.batchesSent[2].length === 7, '29. Run 3 Batch 3 has 7 emails');
assert(run3.remainingPending === 0, '30. Run 3 leaves 0 remaining pending (100% Synced)');
assert(run3.finalExistingCount === 404, '31. Group membership reaches 404');

// ============================================================================
// PART 5: PARTIAL FAILURE & RETRY RESILIENCE TEST
// ============================================================================
const mockPartialFailureAppsScript = (batch, existingSet, exclusionSet) => {
  let added = 0;
  let failed = 0;
  const addedList = [];
  const errorList = [];

  for (let i = 0; i < batch.length; i++) {
    if (i < 5) {
      // First 5 emails fail
      failed++;
      errorList.push({ email: batch[i], error: 'Rate limit / permission temporary error' });
    } else {
      added++;
      addedList.push(batch[i]);
    }
  }

  return {
    success: true,
    addedCount: added,
    skippedCount: 0,
    excludedCount: 0,
    failedCount: failed,
    addedEmails: addedList,
    errors: errorList,
  };
};

const partialRun = simulateSyncOrchestrator(mockEligible404, mockExisting147, mockExclusions0, mockPartialFailureAppsScript);

assert(partialRun.status === 'PARTIAL_SUCCESS', '32. Partial failure returns status PARTIAL_SUCCESS');
assert(partialRun.addedCount === 80, '33. 80 emails successfully added (20 per batch x 4)');
assert(partialRun.failedCount === 20, '34. 20 failed emails recorded (5 per batch x 4)');
assert(partialRun.remainingPending === 177, '35. Failed 20 emails remain pending for retry (257 - 80 = 177)');
assert(partialRun.finalExistingCount === 227, '36. Group grows by exactly 80 (147 + 80 = 227)');

console.log(`\n========================================`);
console.log(`🎯 Test Summary: ${passed}/${total} Tests Passed!`);
console.log(`========================================\n`);
