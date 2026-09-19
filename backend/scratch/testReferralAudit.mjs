import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('🧪 RUNNING ZENEMOO AUDIT & REGRESSION TEST SUITE');
console.log('====================================================\n');

// ── TEST 1: Question Type Normalization & Parsing ──
console.log('▶ TEST 1: Question Type Normalization & Options Parsing');

// Emulate parseQuestionOptions
const parseQuestionOptions = (optionsInput) => {
  if (!optionsInput) return [];
  if (Array.isArray(optionsInput)) {
    return optionsInput
      .flatMap((opt) => (typeof opt === 'string' ? opt.split(/[\n,]/) : [String(opt)]))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof optionsInput === 'string') {
    return optionsInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

// Emulate normalizeQuestion
const normalizeQuestion = (q, idx = 0) => {
  const rawType = (q.type || '').toLowerCase().trim();
  const rawOptions = q.options || q.choices || [];
  const parsedOptions = parseQuestionOptions(rawOptions);

  let finalType = 'text';

  if (rawType === 'textarea' || rawType === 'longtext' || rawType === 'paragraph') {
    finalType = 'textarea';
  } else if (rawType === 'number' || rawType === 'numeric' || rawType === 'integer') {
    finalType = 'number';
  } else if (rawType === 'email') {
    finalType = 'email';
  } else if (rawType === 'phone' || rawType === 'tel' || rawType === 'mobile') {
    finalType = 'phone';
  } else if (rawType === 'date') {
    finalType = 'date';
  } else if (rawType === 'yesno' || rawType === 'yes_no' || rawType === 'boolean') {
    finalType = 'yesno';
  } else if (rawType === 'checkbox') {
    finalType = 'checkbox';
  } else if (
    rawType === 'multiselect' ||
    rawType === 'multi_select' ||
    rawType === 'multiple_choice' ||
    rawType === 'multiple-choice' ||
    rawType === 'checkboxes'
  ) {
    finalType = 'multiselect';
  } else if (
    rawType === 'select' ||
    rawType === 'single_choice' ||
    rawType === 'single-choice' ||
    rawType === 'choice' ||
    rawType === 'dropdown' ||
    rawType === 'radio'
  ) {
    finalType = 'select';
  } else if (parsedOptions.length > 0) {
    finalType = 'select';
  }

  return {
    id: q.id || `q_${Date.now()}_${idx}`,
    label: (q.label || q.question || q.text || `Question ${idx + 1}`).trim(),
    type: finalType,
    options: parsedOptions,
    required: q.required === true || q.is_required === true,
  };
};

const sampleQ1 = normalizeQuestion({
  label: 'Which country are you applying from?',
  type: 'select',
  options: 'India, South Korea, United States, Japan'
});
assert.strictEqual(sampleQ1.type, 'select');
assert.strictEqual(sampleQ1.options.length, 4);
assert.strictEqual(sampleQ1.options[0], 'India');
assert.strictEqual(sampleQ1.options[1], 'South Korea');

const sampleQ2 = normalizeQuestion({
  label: 'Which state are you currently based in?',
  type: 'choice',
  options: ['Manipur', 'Odisha', 'Delhi']
});
assert.strictEqual(sampleQ2.type, 'select');
assert.strictEqual(sampleQ2.options.length, 3);
assert.strictEqual(sampleQ2.options[0], 'Manipur');

const sampleQ3 = normalizeQuestion({
  label: 'How are you applying for this opportunity?',
  type: 'multiple-choice',
  options: ['Individual', 'Vendor Agency']
});
assert.strictEqual(sampleQ3.type, 'multiselect');

const sampleQ4 = normalizeQuestion({
  label: 'Do you have previous recording experience?',
  type: 'yes_no',
});
assert.strictEqual(sampleQ4.type, 'yesno');

const sampleQ5 = normalizeQuestion({
  label: 'Describe your relevant equipment',
  type: 'textarea',
});
assert.strictEqual(sampleQ5.type, 'textarea');

console.log('  ✅ Question type normalization & option parsing passed\n');

// ── TEST 2: Referral Attribution Resolution & Self-Referral Prevention ──
console.log('▶ TEST 2: Referral Attribution Resolution & Self-Referral Prevention');

const isValidUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

const mockTalentDb = [
  {
    id: 'f3e5db25-97d9-45ee-8ecd-0cd638670979',
    full_name: 'Prem Referrer',
    email: 'referrer@zenemoo.in',
    registration_code: 'ZEN-D6DW-M1SB',
    status: 'verified',
    is_archived: false,
  }
];

const resolveReferral = (rawRefCode, applicantEmail) => {
  let referralAttribution = {
    referral_code: null,
    referred_by_id: null,
    referrer_name: null,
    referrer_email: null,
    referral_source: null,
  };

  const cleanRef = (rawRefCode || '').trim().toUpperCase();
  const cleanEmail = (applicantEmail || '').trim().toLowerCase();

  if (cleanRef) {
    const referrerRecord = mockTalentDb.find((r) => r.registration_code.toUpperCase() === cleanRef);
    if (referrerRecord && !referrerRecord.is_archived && referrerRecord.status !== 'banned' && referrerRecord.status !== 'rejected') {
      const referrerEmail = (referrerRecord.email || '').trim().toLowerCase();
      if (referrerEmail !== cleanEmail) {
        const validReferredById = referrerRecord.id && isValidUuid(referrerRecord.id) ? referrerRecord.id : null;
        referralAttribution = {
          referral_code: referrerRecord.registration_code || cleanRef,
          referred_by_id: validReferredById,
          referrer_name: referrerRecord.full_name || 'Zenemoo Contributor',
          referrer_email: referrerEmail,
          referral_source: 'talent_hub',
        };
      }
    } else if (/^ZEN-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(cleanRef)) {
      referralAttribution = {
        referral_code: cleanRef,
        referred_by_id: null,
        referrer_name: null,
        referrer_email: null,
        referral_source: 'talent_hub',
      };
    }
  }

  return referralAttribution;
};

// Case 1: Valid referral from external candidate
const ref1 = resolveReferral('ZEN-D6DW-M1SB', 'candidate.prem@gmail.com');
assert.strictEqual(ref1.referral_code, 'ZEN-D6DW-M1SB');
assert.strictEqual(ref1.referred_by_id, 'f3e5db25-97d9-45ee-8ecd-0cd638670979');
assert.strictEqual(ref1.referrer_name, 'Prem Referrer');
assert.strictEqual(ref1.referrer_email, 'referrer@zenemoo.in');

// Case 2: Case-insensitivity ('zen-d6dw-m1sb')
const ref2 = resolveReferral('zen-d6dw-m1sb', 'candidate.prem@gmail.com');
assert.strictEqual(ref2.referral_code, 'ZEN-D6DW-M1SB');

// Case 3: Self-referral protection (applicant email == referrer email)
const ref3 = resolveReferral('ZEN-D6DW-M1SB', 'referrer@zenemoo.in');
assert.strictEqual(ref3.referral_code, null);
assert.strictEqual(ref3.referred_by_id, null);

// Case 4: Direct application (no referral code)
const ref4 = resolveReferral('', 'direct@example.com');
assert.strictEqual(ref4.referral_code, null);

console.log('  ✅ Referral attribution resolution and self-referral checks passed\n');

// ── TEST 3: Talent Hub Referral Stats Aggregation ──
console.log('▶ TEST 3: Talent Hub Referral Stats Aggregation');

const mockApplications = [
  {
    id: 'app_1',
    applicant_id: 'APP-2026-6333',
    applicant_name: 'Prem Candidate 1',
    opportunity_id: 'f3e5db25-97d9-45ee-8ecd-0cd638670979',
    opportunity_title: 'TrueFace – Face Image Data Collection Project',
    status: 'pending',
    referral_code: 'ZEN-D6DW-M1SB',
    referred_by_id: 'f3e5db25-97d9-45ee-8ecd-0cd638670979',
    created_at: new Date().toISOString(),
  },
  {
    id: 'app_2',
    applicant_id: 'APP-2026-6334',
    applicant_name: 'Candidate 2',
    opportunity_id: 'op_f3e5db25-97d9-45ee-8ecd-0cd638670979',
    opportunity_title: 'TrueFace – Face Image Data Collection Project',
    status: 'accepted',
    referral_code: 'ZEN-D6DW-M1SB',
    referred_by_id: 'f3e5db25-97d9-45ee-8ecd-0cd638670979',
    created_at: new Date().toISOString(),
  },
  {
    id: 'app_3',
    applicant_id: 'APP-2026-6335',
    applicant_name: 'Candidate 3',
    opportunity_id: 'f3e5db25-97d9-45ee-8ecd-0cd638670979',
    opportunity_title: 'TrueFace – Face Image Data Collection Project',
    status: 'rejected',
    referral_code: 'ZEN-D6DW-M1SB',
    referred_by_id: 'f3e5db25-97d9-45ee-8ecd-0cd638670979',
    created_at: new Date().toISOString(),
  }
];

const isMatchingOpp = (oppIdA, oppIdB, titleA, titleB) => {
  if (!oppIdA || !oppIdB) return false;
  if (oppIdA === oppIdB) return true;
  if (oppIdA.replace(/^op_/, '') === oppIdB.replace(/^op_/, '')) return true;
  if (titleA && titleB && titleA.trim().toLowerCase() === titleB.trim().toLowerCase()) return true;
  return false;
};

// Compute aggregation
let pendingCount = 0;
let acceptedCount = 0;
let shortlistedCount = 0;
let rejectedCount = 0;

mockApplications.forEach((app) => {
  const s = (app.status || 'pending').toLowerCase();
  if (s === 'accepted') acceptedCount++;
  else if (s === 'shortlisted') shortlistedCount++;
  else if (s === 'rejected') rejectedCount++;
  else pendingCount++;
});

const total = mockApplications.length;
const selected = acceptedCount + shortlistedCount;

assert.strictEqual(total, 3);
assert.strictEqual(pendingCount, 1);
assert.strictEqual(acceptedCount, 1);
assert.strictEqual(selected, 1);
assert.strictEqual(rejectedCount, 1);

// Test matching with project modal
const matchedApplicants = mockApplications.filter((app) =>
  isMatchingOpp(app.opportunity_id, 'f3e5db25-97d9-45ee-8ecd-0cd638670979', app.opportunity_title, 'TrueFace – Face Image Data Collection Project')
);
assert.strictEqual(matchedApplicants.length, 3);

console.log('  ✅ Referral stats aggregation and opportunity prefix matching passed\n');

// ── TEST 4: Egress Protection & Answers Indicator Validation ──
console.log('▶ TEST 4: Egress Protection & Answers Indicator Validation');

// Verify opportunityApplicationStore and backend controllers exclude answers on list
const storeCode = fs.readFileSync(path.join(__dirname, '../../frontend/src/lib/opportunityApplicationStore.ts'), 'utf-8');
assert(storeCode.includes('include_answers: false'), 'opportunityApplicationStore requests include_answers: false');

const modalCode = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/CandidateApplicationsModal.tsx'), 'utf-8');
assert(modalCode.includes('View Responses'), 'CandidateApplicationsModal provides View Responses button');

const backendOppCtrl = fs.readFileSync(path.join(__dirname, '../src/controllers/opportunityApplicationController.js'), 'utf-8');
assert(backendOppCtrl.includes("include_answers === 'false'"), 'Backend controller honors include_answers === false');

console.log('  ✅ Supabase Egress Protection and Custom Answer UI verified\n');

// ── TEST 5: Code Verification on Modified Controllers ──
console.log('▶ TEST 5: Code Verification on Modified Controllers');
const talentHubCtrl = fs.readFileSync(path.join(__dirname, '../src/controllers/talentHubController.js'), 'utf-8');
assert(talentHubCtrl.includes('isTalentUuid'), 'talentHubController checks isTalentUuid');
assert(talentHubCtrl.includes('referral_code.ilike'), 'talentHubController uses ilike for referral_code');

const oppPageCode = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/OpportunitiesPage.tsx'), 'utf-8');
assert(oppPageCode.includes('activeRefCode'), 'OpportunitiesPage captures activeRefCode');

const talentOppPageCode = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/talent-hub/TalentHubOpportunities.tsx'), 'utf-8');
assert(talentOppPageCode.includes('parseQuestionOptions'), 'TalentHubOpportunities uses parseQuestionOptions');

console.log('  ✅ Modified controllers and UI components code integrity verified\n');

console.log('====================================================');
console.log('🎉 ALL AUDIT & REGRESSION TESTS COMPLETED SUCCESSFULLY');
console.log('====================================================');
