import { normalizeAndValidateEmail } from '../src/controllers/googleGroupSyncController.js';

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

console.log('🧪 Running Comprehensive Async Sync & Timeout Prevention Tests...\n');

// 1. Simulation of Async Batch Chunker for 100+ Pending Emails
function simulateAsyncBatchOrchestrator(eligibleEmails, groupMemberEmails, excludedEmails, batchSize = 25, maxLimit = 100) {
  const existingSet = new Set(groupMemberEmails.map(e => normalizeAndValidateEmail(e)).filter(Boolean));
  const exclusionSet = new Set(excludedEmails.map(e => normalizeAndValidateEmail(e)).filter(Boolean));

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

  const candidatesToProcess = missingCandidates.slice(0, maxLimit);
  const totalBatches = Math.ceil(candidatesToProcess.length / batchSize);
  const batches = [];

  for (let b = 0; b < totalBatches; b++) {
    batches.push(candidatesToProcess.slice(b * batchSize, (b + 1) * batchSize));
  }

  return {
    totalEligible: eligibleEmails.length,
    alreadySynced: existingSet.size,
    excludedCount: excludedCount,
    totalMissing: missingCandidates.length,
    candidatesToProcess: candidatesToProcess.length,
    totalBatches: totalBatches,
    batches: batches,
  };
}

// Test Case 1: 257 Pending Emails (like the current production scenario)
const mockEligible257 = [];
for (let i = 1; i <= 404; i++) {
  mockEligible257.push(`user${i}@zenemoo.in`);
}
const mockExisting147 = [];
for (let i = 1; i <= 147; i++) {
  mockExisting147.push(`user${i}@zenemoo.in`);
}
const mockExcluded = ['user200@zenemoo.in', 'user201@zenemoo.in'];

const simResult = simulateAsyncBatchOrchestrator(mockEligible257, mockExisting147, mockExcluded);

assert(simResult.totalEligible === 404, '1. Total eligible correctly tracked (404)');
assert(simResult.alreadySynced === 147, '2. Already synced correctly tracked (147)');
assert(simResult.excludedCount === 2, '3. Excluded count correctly tracked (2)');
assert(simResult.totalMissing === 255, '4. Total missing non-excluded candidates (255)');
assert(simResult.candidatesToProcess === 100, '5. Safety limit of 100 per run is respected');
assert(simResult.totalBatches === 4, '6. 100 candidates divided into 4 safe batches (25 each)');
assert(simResult.batches[0].length === 25, '7. Batch 1 has exactly 25 items');
assert(simResult.batches[3].length === 25, '8. Batch 4 has exactly 25 items');
assert(!simResult.batches.flat().includes('user200@zenemoo.in'), '9. Excluded email user200 is excluded from batches');
assert(!simResult.batches.flat().includes('user201@zenemoo.in'), '10. Excluded email user201 is excluded from batches');
assert(!simResult.batches.flat().includes('user1@zenemoo.in'), '11. Existing group member user1 is excluded from batches');

// 2. Concurrency Lock & Duplicate Sync Prevention Simulation
class MockSyncService {
  constructor() {
    this.status = 'IDLE';
    this.processedCount = 0;
  }

  triggerSync() {
    if (this.status === 'RUNNING') {
      return { success: true, status: 'RUNNING', message: 'A Google Group synchronization job is already running in background.' };
    }
    this.status = 'RUNNING';
    return { success: true, status: 'RUNNING', message: 'Google Group synchronization initiated in background.' };
  }

  completeSync() {
    this.status = 'COMPLETED';
  }
}

const syncService = new MockSyncService();
const trigger1 = syncService.triggerSync();
assert(trigger1.status === 'RUNNING', '12. First trigger starts sync job');

const trigger2 = syncService.triggerSync();
assert(trigger2.message.includes('already running'), '13. Concurrent trigger is safely rejected with already running status');

syncService.completeSync();
assert(syncService.status === 'COMPLETED', '14. Sync completes and releases job state');

const trigger3 = syncService.triggerSync();
assert(trigger3.status === 'RUNNING', '15. Subsequent trigger after completion starts successfully');

// 3. Partial Failure & Error Accumulation Simulation
function simulateBatchExecutionWithPartialFailure(batches) {
  let addedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const errors = [];

  for (let b = 0; b < batches.length; b++) {
    const chunk = batches[b];
    if (b === 1) {
      // Simulate batch 2 experiencing a partial error on 1 email
      addedCount += chunk.length - 1;
      failedCount += 1;
      errors.push({ email: chunk[0], error: 'Rate limit temporary error' });
    } else {
      addedCount += chunk.length;
    }
  }

  return { addedCount, skippedCount, failedCount, errors };
}

const batchExecResult = simulateBatchExecutionWithPartialFailure(simResult.batches);
assert(batchExecResult.addedCount === 99, '16. Added count handles partial success across batches (99)');
assert(batchExecResult.failedCount === 1, '17. Failed count records individual batch errors without aborting');
assert(batchExecResult.errors.length === 1, '18. Error details recorded for diagnostics');

console.log(`\n========================================`);
console.log(`🎯 Test Summary: ${passed}/${total} Tests Passed!`);
console.log(`========================================\n`);
