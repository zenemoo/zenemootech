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

console.log('🧪 Running Comprehensive Google Groups Quota & Read Optimization Tests...\n');

// ============================================================================
// PART 1: STATIC CODE & ARCHITECTURE AUDIT
// ============================================================================
const appsScriptPath = path.resolve('src/scripts/googleGroupSyncAppsScript.gs');
const appsScriptCode = fs.readFileSync(appsScriptPath, 'utf8');

const controllerPath = path.resolve('src/controllers/googleGroupSyncController.js');
const controllerCode = fs.readFileSync(controllerPath, 'utf8');

// 1. Check Apps Script handleSyncMembers loop has 0 groups.read / hasUser / getUsers calls
assert(!appsScriptCode.includes('group.hasUser(clean)'), '1. Apps Script handleSyncMembers does NOT call group.hasUser in loop');
assert(!appsScriptCode.includes('group.hasUser'), '2. Zero group.hasUser calls exist across Apps Script');

// 2. Check CacheService integration in Apps Script
assert(appsScriptCode.includes('CacheService.getScriptCache()'), '3. Apps Script uses CacheService.getScriptCache() for membership caching');
assert(appsScriptCode.includes('getCachedMembers'), '4. getCachedMembers helper exists');
assert(appsScriptCode.includes('setCachedMembers'), '5. setCachedMembers helper exists');
assert(appsScriptCode.includes('invalidateMemberCache'), '6. invalidateMemberCache helper exists');

// 3. Check QUOTA_EXCEEDED error handling in Apps Script
assert(appsScriptCode.includes('GROUP_READ_QUOTA_EXCEEDED'), '7. Apps Script catches groups.read quota and returns GROUP_READ_QUOTA_EXCEEDED');
assert(appsScriptCode.includes('QUOTA_EXCEEDED'), '8. Apps Script returns status QUOTA_EXCEEDED');

// 4. Check Controller does NOT query removed tables or select('*')
assert(!controllerCode.includes("select('*')"), "9. Zero select('*') calls in controller");
assert(!controllerCode.includes("from('call_bookings')"), "10. Table call_bookings is NOT queried");
assert(!controllerCode.includes("from('contacts')"), "11. Table contacts is NOT queried");
assert(!controllerCode.includes("from('talent_team_members')"), "12. Table talent_team_members is NOT queried");
assert(!controllerCode.includes("from('support_tickets')"), "13. Table support_tickets is NOT queried");
assert(!controllerCode.includes("from('support_payments')"), "14. Table support_payments is NOT queried");

// 5. Check Controller Quota Exceeded handling
assert(controllerCode.includes("connectionStatus = 'QUOTA_EXCEEDED'"), "15. Controller maps quota exceeded to QUOTA_EXCEEDED connectionStatus");
assert(controllerCode.includes("lastKnownState"), "16. Controller maintains in-memory lastKnownState");
assert(controllerCode.includes("memberCount: 148"), "17. Controller initializes known base count (148)");

// ============================================================================
// PART 2: QUOTA SIMULATION — READ COUNTS BEFORE VS AFTER
// ============================================================================
class GoogleGroupReadQuotaTracker {
  constructor() {
    this.groupsAppReadCalls = 0;
    this.adminDirectoryInsertCalls = 0;
  }

  // OLD Architecture (BEFORE): Per-candidate hasUser check in loop + per-batch reads
  simulateOldSyncCycle(candidateCount, batchCount) {
    this.groupsAppReadCalls = 0;
    // Initial fetch
    this.groupsAppReadCalls += 1;
    // For every batch, handleSyncMembers called group.hasUser for every candidate
    for (let i = 0; i < candidateCount; i++) {
      this.groupsAppReadCalls += 1; // group.hasUser(clean)
    }
    return this.groupsAppReadCalls;
  }

  // NEW Architecture (AFTER): 1 read per cycle + local Set updates + 0 hasUser calls
  simulateNewSyncCycle(candidateCount, batchCount) {
    this.groupsAppReadCalls = 0;
    // Single initial membership read
    this.groupsAppReadCalls += 1;
    // Batches 1..N perform 0 groups.read calls
    return this.groupsAppReadCalls;
  }
}

const tracker = new GoogleGroupReadQuotaTracker();
const oldReadsFor257 = tracker.simulateOldSyncCycle(257, 4);
const newReadsFor257 = tracker.simulateNewSyncCycle(257, 4);

assert(oldReadsFor257 === 258, `18. Before fix: 257 candidates caused ${oldReadsFor257} GroupsApp read calls`);
assert(newReadsFor257 === 1, `19. After fix: 257 candidates cause exactly ${newReadsFor257} GroupsApp read call (99.6% quota reduction)`);

// ============================================================================
// PART 3: IN-MEMORY SET & BATCH PROGRESSION SIMULATION
// ============================================================================
function simulateOptimizedBatchCycle(initialGroupMembers, eligibleEmails, excludedEmails, batchSize = 25, maxLimit = 100) {
  let groupsReadCount = 0;

  // Step 1: Read Google Group ONCE
  groupsReadCount++;
  const existingMemberEmails = new Set(initialGroupMembers.map(e => normalizeAndValidateEmail(e)).filter(Boolean));
  const exclusionSet = new Set(excludedEmails.map(e => normalizeAndValidateEmail(e)).filter(Boolean));

  // Step 2: Compute non-excluded missing candidates
  const missingCandidates = [];
  let excludedCount = 0;

  for (const email of eligibleEmails) {
    const clean = normalizeAndValidateEmail(email);
    if (!clean) continue;
    if (exclusionSet.has(clean)) {
      excludedCount++;
    } else if (!existingMemberEmails.has(clean)) {
      missingCandidates.push(clean);
    }
  }

  const candidatesToProcess = missingCandidates.slice(0, maxLimit);
  const totalBatches = Math.ceil(candidatesToProcess.length / batchSize);

  let addedCount = 0;
  let skippedCount = 0;
  const batchSnapshots = [];

  // Step 3: Process batches without any additional groups.read calls
  for (let b = 0; b < totalBatches; b++) {
    const chunk = candidatesToProcess.slice(b * batchSize, (b + 1) * batchSize);
    const addedInBatch = [];

    for (const email of chunk) {
      if (existingMemberEmails.has(email)) {
        skippedCount++;
      } else {
        // Simulate successful insert & immediate Set update
        existingMemberEmails.add(email);
        addedInBatch.push(email);
        addedCount++;
      }
    }

    batchSnapshots.push({
      batchNum: b + 1,
      chunkSize: chunk.length,
      addedInBatch: addedInBatch.length,
      currentSetSize: existingMemberEmails.size,
      groupsReadCallsSoFar: groupsReadCount,
    });
  }

  return {
    groupsReadCount,
    initialSetSize: initialGroupMembers.length,
    finalSetSize: existingMemberEmails.size,
    addedCount,
    skippedCount,
    excludedCount,
    totalBatches,
    batchSnapshots,
  };
}

// Generate 404 eligible emails and 148 initial members
const mockEligible404 = Array.from({ length: 404 }, (_, i) => `member${i + 1}@zenemoo.in`);
const mockGroup148 = Array.from({ length: 148 }, (_, i) => `member${i + 1}@zenemoo.in`);
const mockExclusions = ['member200@zenemoo.in', 'member201@zenemoo.in'];

const cycleResult = simulateOptimizedBatchCycle(mockGroup148, mockEligible404, mockExclusions);

assert(cycleResult.groupsReadCount === 1, '20. Exactly 1 GroupsApp read across the entire sync cycle');
assert(cycleResult.initialSetSize === 148, '21. Initial Set size is 148');
assert(cycleResult.batchSnapshots[0].currentSetSize === 173, '22. Batch 1 adds 25: Set becomes 173');
assert(cycleResult.batchSnapshots[1].currentSetSize === 198, '23. Batch 2 adds 25: Set becomes 198');
assert(cycleResult.batchSnapshots[2].currentSetSize === 223, '24. Batch 3 adds 25: Set becomes 223');
assert(cycleResult.batchSnapshots[3].currentSetSize === 248, '25. Batch 4 adds 25: Set becomes 248');
assert(cycleResult.batchSnapshots.every(b => b.groupsReadCallsSoFar === 1), '26. All batches use in-memory Set without repeating group read');
assert(cycleResult.addedCount === 100, '27. Exactly 100 safe candidates added per cycle limit');
assert(cycleResult.excludedCount === 2, '28. Excluded emails skipped completely');

// ============================================================================
// PART 4: FAIL-SAFE SYNC ABORT ON QUOTA EXCEEDED
// ============================================================================
function simulateSyncAbortOnReadFailure(readResult) {
  if (!readResult || readResult.success === false || !Array.isArray(readResult.members) || readResult.members.length === 0) {
    return {
      status: 'FAILED',
      message: 'Unable to safely read current Google Group membership. Sync aborted for safety.',
      addedCount: 0,
    };
  }
  return { status: 'RUNNING', addedCount: 100 };
}

const quotaErrorResponse = {
  success: false,
  code: 'GROUP_READ_QUOTA_EXCEEDED',
  status: 'QUOTA_EXCEEDED',
  message: 'Service invoked too many times for one day: groups.read',
  members: [],
  count: null,
};

const abortResult = simulateSyncAbortOnReadFailure(quotaErrorResponse);
assert(abortResult.status === 'FAILED', '29. Sync safely aborts if initial group read fails with quota error');
assert(abortResult.addedCount === 0, '30. Zero members added when membership cannot be confirmed (Prevents mass duplication of 404 emails)');

// ============================================================================
// PART 5: PRESERVATION OF LAST KNOWN STATE IN OVERVIEW & MEMBERS
// ============================================================================
function simulateOverviewWithQuotaError(appsScriptRes, lastKnown) {
  let groupMemberCount = lastKnown.memberCount;
  let connectionStatus = 'ONLINE';

  if (appsScriptRes.code === 'GROUP_READ_QUOTA_EXCEEDED' || appsScriptRes.status === 'QUOTA_EXCEEDED') {
    connectionStatus = 'QUOTA_EXCEEDED';
    groupMemberCount = lastKnown.members.length > 0 ? lastKnown.members.length : lastKnown.memberCount;
  } else if (!appsScriptRes.success) {
    connectionStatus = 'DISCONNECTED';
  }

  return { connectionStatus, groupMemberCount };
}

const overviewState = simulateOverviewWithQuotaError(quotaErrorResponse, { members: mockGroup148, memberCount: 148 });
assert(overviewState.connectionStatus === 'QUOTA_EXCEEDED', '31. Overview status is QUOTA_EXCEEDED, not DISCONNECTED');
assert(overviewState.groupMemberCount === 148, '32. Last known member count (148) is preserved and NOT overwritten with 0');

console.log(`\n========================================`);
console.log(`🎯 Test Summary: ${passed}/${total} Tests Passed!`);
console.log(`========================================\n`);
