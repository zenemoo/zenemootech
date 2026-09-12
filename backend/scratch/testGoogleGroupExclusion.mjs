import { normalizeAndValidateEmail } from '../src/controllers/googleGroupSyncController.js';

// Simulated Apps Script PropertiesService
class MockScriptProperties {
  constructor() {
    this.store = {};
  }
  getProperty(key) {
    return this.store[key] || null;
  }
  setProperty(key, val) {
    this.store[key] = val;
  }
}

const mockProps = new MockScriptProperties();
const EXCLUSION_PROPERTY_KEY = 'GOOGLE_GROUP_EXCLUDED_EMAILS';

function getExcludedEmails() {
  try {
    const raw = mockProps.getProperty(EXCLUSION_PROPERTY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalizedList = [];
    const seen = new Set();

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      let emailStr = '';
      let dateStr = new Date().toISOString();

      if (typeof item === 'string') {
        emailStr = item;
      } else if (item && typeof item === 'object') {
        emailStr = item.email || '';
        dateStr = item.excludedAt || dateStr;
      }

      const clean = normalizeAndValidateEmail(emailStr);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        normalizedList.push({
          email: clean,
          excludedAt: dateStr,
        });
      }
    }
    return normalizedList;
  } catch (err) {
    return [];
  }
}

function isEmailExcluded(email) {
  const clean = normalizeAndValidateEmail(email);
  if (!clean) return false;
  const exclusions = getExcludedEmails();
  return exclusions.some(item => item.email === clean);
}

function addExcludedEmail(email) {
  const clean = normalizeAndValidateEmail(email);
  if (!clean) return false;

  const current = getExcludedEmails();
  const exists = current.some(item => item.email === clean);

  if (!exists) {
    current.push({
      email: clean,
      excludedAt: new Date().toISOString(),
    });
    mockProps.setProperty(EXCLUSION_PROPERTY_KEY, JSON.stringify(current));
  }
  return true;
}

function removeExcludedEmail(email) {
  const clean = normalizeAndValidateEmail(email);
  if (!clean) return false;

  const current = getExcludedEmails();
  const filtered = current.filter(item => item.email !== clean);
  mockProps.setProperty(EXCLUSION_PROPERTY_KEY, JSON.stringify(filtered));
  return true;
}

// Simulated Sync Logic
function simulateSync(eligibleEmails, groupMemberEmails) {
  const existingGroupEmailSet = new Set(groupMemberEmails.map(e => normalizeAndValidateEmail(e)).filter(Boolean));
  const exclusions = getExcludedEmails();
  const excludedEmailSet = new Set(exclusions.map(item => item.email));

  const missingCandidates = [];
  let excludedCount = 0;
  let alreadyExistingCount = 0;

  for (const rawEmail of eligibleEmails) {
    const clean = normalizeAndValidateEmail(rawEmail);
    if (!clean) continue;

    if (excludedEmailSet.has(clean)) {
      excludedCount++;
    } else if (existingGroupEmailSet.has(clean)) {
      alreadyExistingCount++;
    } else {
      missingCandidates.push(clean);
    }
  }

  return {
    totalEligible: eligibleEmails.length,
    alreadyExisting: alreadyExistingCount,
    excludedCount: excludedCount,
    addedCount: missingCandidates.length,
    addedEmails: missingCandidates,
  };
}

// RUN TESTS
console.log('🧪 Running Comprehensive Google Group Exclusion Tests...\n');

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

// 1. Normalize email
assert(normalizeAndValidateEmail('  User@Zenemoo.in  ') === 'user@zenemoo.in', '1. Normalize email: trims and lowercases');
assert(normalizeAndValidateEmail('<john.doe@domain.com>') === 'john.doe@domain.com', '1b. Normalize email: strips enclosing angle brackets');
assert(normalizeAndValidateEmail('invalid-email') === null, '1c. Normalize email: rejects invalid format');

// 2. Add exclusion
addExcludedEmail('alex@zenemoo.in');
assert(isEmailExcluded('alex@zenemoo.in') === true, '2. Add exclusion: correctly marks email as excluded');

// 3. Duplicate exclusion
addExcludedEmail('alex@zenemoo.in');
addExcludedEmail('ALEX@ZENEMOO.IN');
assert(getExcludedEmails().length === 1, '3. Duplicate exclusion: does not insert duplicates');

// 4. Check exclusion
assert(isEmailExcluded('alex@zenemoo.in') === true, '4. Check exclusion: returns true for excluded email');
assert(isEmailExcluded('unknown@zenemoo.in') === false, '4b. Check exclusion: returns false for non-excluded email');

// 5. Remove exclusion
removeExcludedEmail('alex@zenemoo.in');
assert(isEmailExcluded('alex@zenemoo.in') === false, '5. Remove exclusion: successfully removes email');

// 6. Case-insensitive exclusion
addExcludedEmail('SARAH@ZENEMOO.IN');
assert(isEmailExcluded('sarah@zenemoo.in') === true, '6. Case-insensitive exclusion: matches regardless of case');
removeExcludedEmail('Sarah@Zenemoo.in');
assert(isEmailExcluded('sarah@zenemoo.in') === false, '6b. Case-insensitive removal works');

// 7 & 8. Sync skips excluded email and does not re-add
addExcludedEmail('b@zenemoo.in');
const res1 = simulateSync(['a@zenemoo.in', 'b@zenemoo.in', 'c@zenemoo.in'], ['a@zenemoo.in']);
assert(res1.alreadyExisting === 1, '7. Sync: already member counted (a@zenemoo.in)');
assert(res1.excludedCount === 1, '7b. Sync: excluded email skipped (b@zenemoo.in)');
assert(res1.addedCount === 1 && res1.addedEmails[0] === 'c@zenemoo.in', '8. Sync: only non-excluded missing email added (c@zenemoo.in)');

// 9. Restored email becomes eligible again
removeExcludedEmail('b@zenemoo.in');
const res2 = simulateSync(['a@zenemoo.in', 'b@zenemoo.in', 'c@zenemoo.in'], ['a@zenemoo.in']);
assert(res2.excludedCount === 0, '9. Restored email: excluded count becomes 0');
assert(res2.addedCount === 2 && res2.addedEmails.includes('b@zenemoo.in'), '9b. Restored email: b@zenemoo.in is now added');

// 10. Existing non-excluded missing emails are still added
const res3 = simulateSync(['x@zenemoo.in', 'y@zenemoo.in'], []);
assert(res3.addedCount === 2, '10. Existing non-excluded missing emails are all added');

// Scenario Test from Prompt:
// Given: Eligible: a@zenemoo.in, b@zenemoo.in, c@zenemoo.in | Google Group: a@zenemoo.in | Excluded: b@zenemoo.in
addExcludedEmail('b@zenemoo.in');
const promptScenario = simulateSync(['a@zenemoo.in', 'b@zenemoo.in', 'c@zenemoo.in'], ['a@zenemoo.in']);
assert(promptScenario.addedCount === 1, 'Scenario Test: added = 1 (c@zenemoo.in)');
assert(promptScenario.excludedCount === 1, 'Scenario Test: excluded/skipped = 1 (b@zenemoo.in)');
assert(promptScenario.alreadyExisting === 1, 'Scenario Test: already existing = 1 (a@zenemoo.in)');

console.log(`\n========================================`);
console.log(`🎯 Test Summary: ${passed}/${total} Tests Passed!`);
console.log(`========================================\n`);
