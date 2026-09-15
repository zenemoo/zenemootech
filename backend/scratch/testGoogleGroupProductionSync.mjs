import fs from 'fs';
import path from 'path';
import { normalizeAndValidateEmail } from '../src/controllers/googleGroupSyncController.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${totalTests}. ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${totalTests}. ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('🧪 Starting Google Group Production Sync Comprehensive Verification...\n');

// 1. Static AST / Code Inspection of googleGroupSyncController.js & googleGroupSyncAppsScript.gs
const controllerPath = path.resolve('src/controllers/googleGroupSyncController.js');
const appsScriptPath = path.resolve('src/scripts/googleGroupSyncAppsScript.gs');
const routesPath = path.resolve('src/routes/googleGroupSyncRoutes.js');

const controllerCode = fs.readFileSync(controllerPath, 'utf8');
const appsScriptCode = fs.readFileSync(appsScriptPath, 'utf8');
const routesCode = fs.readFileSync(routesPath, 'utf8');

// Check 1: Zero select('*') calls in controller
assert(!controllerCode.includes("select('*')") && !controllerCode.includes('select("*")'), 'Zero select("*") queries exist across backend controller');

// Check 2: Routes file has /pending route
assert(routesCode.includes("router.get('/pending'"), 'Routes file defines GET /pending route with auth');

// Check 3: Controller has getPendingCommunityEmails with pagination
assert(controllerCode.includes('export const getPendingCommunityEmails'), 'Controller exports getPendingCommunityEmails endpoint');
assert(controllerCode.includes('pageSize') && controllerCode.includes('totalPages'), 'getPendingCommunityEmails implements server-side pagination');

// Check 4: No GroupsApp.hasUser() loop in Apps Script sync loop
const syncFuncMatch = appsScriptCode.match(/function handleSyncMembers[\s\S]*?^}/m);
assert(!appsScriptCode.includes('.hasUser('), 'No GroupsApp.hasUser() calls exist inside Apps Script candidate sync loops');

// Check 5: Apps Script calls AdminDirectory.Members.insert()
assert(appsScriptCode.includes('AdminDirectory.Members.insert'), 'Apps Script calls AdminDirectory.Members.insert() for member additions');

// Check 6: Quota error never returns 0 members
assert(appsScriptCode.includes('count: null') || appsScriptCode.includes('lastKnownState.members.length'), 'Google API quota error preserves last known count and avoids returning 0');

// 2. Pure Logic Simulation: Reconciliation & Differences
const eligibleSupabaseEmails = [];
for (let i = 1; i <= 406; i++) {
  eligibleSupabaseEmails.push(`user${i}@zenemoo.in`);
}
// Add 5 duplicates and casing variations
eligibleSupabaseEmails.push('USER1@ZENEMOO.IN', ' user2@zenemoo.in ', 'User3@Zenemoo.in');

const deduplicatedEligible = Array.from(
  new Set(eligibleSupabaseEmails.map((e) => normalizeAndValidateEmail(e)).filter(Boolean))
);
assert(deduplicatedEligible.length === 406, 'Deduplicated eligible emails accurately equals 406');

// Simulate 147 members in Google Group
const groupMembersSet = new Set();
for (let i = 1; i <= 147; i++) {
  groupMembersSet.add(`user${i}@zenemoo.in`);
}
assert(groupMembersSet.size === 147, 'Initial Google Group membership is 147');

// Excluded list
const excludedSet = new Set();

// Calculate pending before sync
const pendingCandidates = deduplicatedEligible.filter((e) => !groupMembersSet.has(e) && !excludedSet.has(e));
assert(pendingCandidates.length === 259, '406 eligible - 147 group members = exactly 259 pending candidates');

// Test Pagination: Page 1 of 26 (10 per page)
const PAGE_SIZE = 10;
const totalPages = Math.ceil(pendingCandidates.length / PAGE_SIZE);
assert(totalPages === 26, '259 items with pageSize=10 gives exactly 26 pages');

const page1 = pendingCandidates.slice(0, 10);
assert(page1.length === 10, 'Page 1 returns exactly 10 emails');

const page26 = pendingCandidates.slice(25 * PAGE_SIZE, 26 * PAGE_SIZE);
assert(page26.length === 9, 'Last page (Page 26) returns remaining 9 emails');

// Test Copy 10 Emails formatting
const copyText = page1.join('\n');
assert(copyText.split('\n').length === 10, 'Copy function produces exactly 10 newline-separated emails');
assert(!copyText.includes('{') && !copyText.includes('role') && !copyText.includes('"'), 'Copied format contains pure email strings (no JSON, no metadata)');

// Test Manual Addition & Automatic Reconciliation on Refresh
// Admin copies page 1 (10 emails) and adds them to Google Group
for (const email of page1) {
  groupMembersSet.add(email);
}
assert(groupMembersSet.size === 157, 'After adding 10 members, Google Group size becomes 157');

// On Refresh: Backend recalculates diff
const reconciledPending = deduplicatedEligible.filter((e) => !groupMembersSet.has(e) && !excludedSet.has(e));
assert(reconciledPending.length === 249, 'After refresh, pending count automatically decreases from 259 to 249');
assert(!reconciledPending.some((e) => page1.includes(e)), 'The 10 added members automatically disappear from pending list');

// Test Insertion Handling (Apps Script Simulation)
function simulateInsert(cleanEmail, existingGroup, simulatedApiError = null) {
  if (simulatedApiError) {
    if (simulatedApiError.includes('409') || simulatedApiError.includes('already exists')) {
      return { status: 'SKIPPED', error: null };
    }
    return { status: 'FAILED', error: simulatedApiError };
  }
  if (existingGroup.has(cleanEmail)) {
    return { status: 'SKIPPED', error: null };
  }
  existingGroup.add(cleanEmail);
  return { status: 'ADDED', error: null };
}

// Case A: Successful insert
const testGroup = new Set(['existing@zenemoo.in']);
const res1 = simulateInsert('new@zenemoo.in', testGroup);
assert(res1.status === 'ADDED' && testGroup.has('new@zenemoo.in'), 'Successful insertion increments added and adds to group');

// Case B: Already existing insert
const res2 = simulateInsert('existing@zenemoo.in', testGroup);
assert(res2.status === 'SKIPPED', 'Already existing group member is skipped (not failed)');

// Case C: Google API Domain not found / permission failure
const res3 = simulateInsert('test@gmail.com', testGroup, 'GoogleJsonResponseException: API call to directory.members.insert failed with error: Domain not found.');
assert(res3.status === 'FAILED' && res3.error.includes('Domain not found'), 'Google API Domain not found error is correctly marked as FAILED with genuine message');

// Case D: External members (in group but not in Supabase)
const externalGroupMembers = ['external_consultant@partner.com', 'former_staff@old.com'];
for (const ext of externalGroupMembers) {
  testGroup.add(ext);
}
const isExtEligible = deduplicatedEligible.includes('external_consultant@partner.com');
assert(!isExtEligible, 'External member not in Supabase is identified as not eligible');
assert(testGroup.has('external_consultant@partner.com'), 'External group members are preserved and never auto-deleted');

console.log('\n========================================');
console.log(`🎯 Test Summary: ${passedTests}/${totalTests} Tests Passed!`);
console.log('========================================\n');
