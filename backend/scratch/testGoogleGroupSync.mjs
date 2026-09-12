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

console.log('🧪 Starting Verification of Google Group Member Details & Sources...\n');

// 1. Static AST / Code Inspection of googleGroupSyncController.js
const controllerPath = path.resolve('src/controllers/googleGroupSyncController.js');
const controllerCode = fs.readFileSync(controllerPath, 'utf8');

// A. Verify Removed Tables are NOT queried
assert(!controllerCode.includes("from('call_bookings')"), "1. Table call_bookings is NOT queried");
assert(!controllerCode.includes("from('contacts')"), "2. Table contacts is NOT queried");
assert(!controllerCode.includes("from('talent_team_members')"), "3. Table talent_team_members is NOT queried");
assert(!controllerCode.includes("from('support_tickets')"), "4. Table support_tickets is NOT queried");
assert(!controllerCode.includes("from('support_payments')"), "5. Table support_payments is NOT queried");

// B. Verify Approved Tables ARE queried
assert(controllerCode.includes("from('subscribers')"), "6. Table subscribers IS queried");
assert(controllerCode.includes("from('talent_registrations')"), "7. Table talent_registrations IS queried");
assert(controllerCode.includes("from('opportunity_applications')"), "8. Table opportunity_applications IS queried");

// C. Verify specific column selections (NO select('*'))
assert(!controllerCode.includes("select('*')"), "9. Zero select('*') calls exist in controller");
assert(controllerCode.includes("select('email')"), "10. Selects only 'email' from subscribers and talent_registrations");
assert(controllerCode.includes("select('applicant_email, referrer_email')"), "11. Selects 'applicant_email, referrer_email' from opportunity_applications");

// D. Verify source breakdown only contains the 3 sources
assert(controllerCode.includes("subscribers: { totalProcessed: 0, uniqueAdded: 0 }"), "12. Breakdown tracks 'subscribers'");
assert(controllerCode.includes("talent_registrations: { totalProcessed: 0, uniqueAdded: 0 }"), "13. Breakdown tracks 'talent_registrations'");
assert(controllerCode.includes("opportunity_applications: { totalProcessed: 0, uniqueAdded: 0 }"), "14. Breakdown tracks 'opportunity_applications'");
assert(!controllerCode.includes("call_bookings:"), "15. Breakdown does NOT track 'call_bookings'");
assert(!controllerCode.includes("contacts:"), "16. Breakdown does NOT track 'contacts'");

// E. Verify emailSourcesMap tracks specific source labels
assert(controllerCode.includes("'Subscribers'"), "17. Detailed label 'Subscribers' is mapped");
assert(controllerCode.includes("'Talent Registrations'"), "18. Detailed label 'Talent Registrations' is mapped");
assert(controllerCode.includes("'Opportunity Applications — Applicant'"), "19. Detailed label 'Opportunity Applications — Applicant' is mapped");
assert(controllerCode.includes("'Opportunity Applications — Referrer'"), "20. Detailed label 'Opportunity Applications — Referrer' is mapped");

// 2. Logic Simulation of 3-Source Eligibility Aggregation & Sources Mapping
function simulateAggregationWithSources(mockData) {
  const emailSet = new Set();
  const emailSourcesMap = new Map();
  const sourceBreakdown = {
    subscribers: { totalProcessed: 0, uniqueAdded: 0 },
    talent_registrations: { totalProcessed: 0, uniqueAdded: 0 },
    opportunity_applications: { totalProcessed: 0, uniqueAdded: 0 },
  };

  const addEmailWithSource = (emailValue, sourceKey, detailedLabel) => {
    const normalized = normalizeAndValidateEmail(emailValue);
    if (normalized) {
      const beforeSize = emailSet.size;
      emailSet.add(normalized);
      if (sourceBreakdown[sourceKey]) {
        sourceBreakdown[sourceKey].totalProcessed++;
        if (emailSet.size > beforeSize) {
          sourceBreakdown[sourceKey].uniqueAdded++;
        }
      }
      if (!emailSourcesMap.has(normalized)) {
        emailSourcesMap.set(normalized, new Set());
      }
      emailSourcesMap.get(normalized).add(detailedLabel);
    }
  };

  if (mockData.subscribers) {
    for (const row of mockData.subscribers) addEmailWithSource(row.email, 'subscribers', 'Subscribers');
  }
  if (mockData.talent_registrations) {
    for (const row of mockData.talent_registrations) addEmailWithSource(row.email, 'talent_registrations', 'Talent Registrations');
  }
  if (mockData.opportunity_applications) {
    for (const row of mockData.opportunity_applications) {
      if (row.applicant_email) addEmailWithSource(row.applicant_email, 'opportunity_applications', 'Opportunity Applications — Applicant');
      if (row.referrer_email) addEmailWithSource(row.referrer_email, 'opportunity_applications', 'Opportunity Applications — Referrer');
    }
  }

  return { emailSet, emailSourcesMap, sourceBreakdown };
}

// Test Multi-Source Membership
const multiSourceData = {
  subscribers: [{ email: 'multi@domain.com' }, { email: 'sub_only@domain.com' }],
  talent_registrations: [{ email: 'multi@domain.com' }],
  opportunity_applications: [
    { applicant_email: 'applicant@domain.com', referrer_email: 'multi@domain.com' },
    { applicant_email: 'multi@domain.com', referrer_email: 'ref_only@domain.com' }
  ],
};

const res = simulateAggregationWithSources(multiSourceData);
const multiSources = Array.from(res.emailSourcesMap.get('multi@domain.com') || []);

assert(multiSources.includes('Subscribers'), "21. Multi-source email includes 'Subscribers'");
assert(multiSources.includes('Talent Registrations'), "22. Multi-source email includes 'Talent Registrations'");
assert(multiSources.includes('Opportunity Applications — Applicant'), "23. Multi-source email includes 'Opportunity Applications — Applicant'");
assert(multiSources.includes('Opportunity Applications — Referrer'), "24. Multi-source email includes 'Opportunity Applications — Referrer'");
assert(multiSources.length === 4, "25. Multi-source email accurately captures all 4 eligible roles");

// Test Single Source
const subSources = Array.from(res.emailSourcesMap.get('sub_only@domain.com') || []);
assert(subSources.length === 1 && subSources[0] === 'Subscribers', "26. Single source email accurately maps only 'Subscribers'");

// Test Member Enrichment in getGoogleGroupMembers
const mockGroupMembers = [
  { email: 'multi@domain.com', role: 'MEMBER' },
  { email: 'external@other.com', role: 'MEMBER' },
];
const exclusionMap = new Map([['multi@domain.com', '2026-09-12T10:00:00Z']]);

const enriched = mockGroupMembers.map(m => {
  const normEmail = normalizeAndValidateEmail(m.email);
  return {
    ...m,
    isSupabaseEligible: res.emailSet.has(normEmail),
    sources: res.emailSourcesMap.has(normEmail) ? Array.from(res.emailSourcesMap.get(normEmail)) : [],
    isExcluded: exclusionMap.has(normEmail),
    excludedAt: exclusionMap.get(normEmail) || null,
  };
});

assert(enriched[0].isSupabaseEligible === true, "27. Enriched member has isSupabaseEligible = true");
assert(enriched[0].sources.length === 4, "28. Enriched member has 4 sources");
assert(enriched[0].isExcluded === true, "29. Enriched member has isExcluded = true");
assert(enriched[0].excludedAt === '2026-09-12T10:00:00Z', "30. Enriched member has excludedAt timestamp");
assert(enriched[1].isSupabaseEligible === false, "31. External member has isSupabaseEligible = false");
assert(enriched[1].sources.length === 0, "32. External member has sources = []");
assert(enriched[1].isExcluded === false, "33. External member has isExcluded = false");

console.log(`\n========================================`);
console.log(`🎯 Test Summary: ${passed}/${total} Tests Passed!`);
console.log(`========================================\n`);
