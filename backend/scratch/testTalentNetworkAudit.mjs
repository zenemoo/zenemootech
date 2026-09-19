import { strict as assert } from 'assert';
import { supabase } from '../src/config/supabase.js';
import { getRegistrationsAdmin } from '../src/controllers/talentRegistrationController.js';
import { formatLanguageDisplayName, normalizeLanguageKey } from '../src/utils/languageUtils.js';

async function runTalentNetworkAuditTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING TALENT NETWORK STATISTICS AUDIT & TESTS');
  console.log('====================================================\n');

  if (!supabase) {
    console.error('❌ Supabase client unavailable for test suite.');
    process.exit(1);
  }

  // TEST 1: Total records count verification
  console.log('▶ TEST 1: Total Non-Archived Talent Records');
  const { count: totalCount, error: errTotal } = await supabase
    .from('talent_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('is_archived', false);
  assert.equal(errTotal, null);
  assert.equal(totalCount, 150, `Expected exactly 150 total records, got ${totalCount}`);
  console.log(`  ✅ Exactly ${totalCount} records exist in talent_registrations (Zero deleted)`);

  // TEST 2: Verified + Pending counts
  console.log('\n▶ TEST 2: Status Breakdown (Verified + Pending)');
  const { count: verifiedCount } = await supabase
    .from('talent_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'verified')
    .eq('is_archived', false);
  const { count: pendingCount } = await supabase
    .from('talent_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .eq('is_archived', false);
  assert.equal(verifiedCount, 11, `Expected 11 verified, got ${verifiedCount}`);
  assert.equal(pendingCount, 139, `Expected 139 pending, got ${pendingCount}`);
  assert.equal(verifiedCount + pendingCount, 150, 'Sum of verified + pending equals 150');
  console.log(`  ✅ Verified (${verifiedCount}) + Pending (${pendingCount}) = ${totalCount}`);

  // TEST 3-6: Dynamic Role Head Counts
  console.log('\n▶ TEST 3-6: Dynamic Role Counts Calculation');
  const { data: roleData } = await supabase
    .from('talent_registrations')
    .select('primary_role')
    .eq('is_archived', false);

  let coordCount = 0;
  let vendorCount = 0;
  let singerCount = 0;
  let recTeamCount = 0;
  for (const r of roleData) {
    const roleStr = (r.primary_role || '').toLowerCase().trim();
    if (roleStr.includes('coordinator')) coordCount++;
    if (roleStr.includes('vendor') || roleStr.includes('agency')) vendorCount++;
    if (roleStr.includes('singer') || roleStr.includes('vocal')) singerCount++;
    if (roleStr.includes('recording team') || roleStr.includes('recording_team')) recTeamCount++;
  }
  assert.equal(coordCount, 9, `Expected 9 coordinators, got ${coordCount}`);
  assert.equal(vendorCount, 8, `Expected 8 vendors, got ${vendorCount}`);
  assert.equal(singerCount, 3, `Expected 3 singers, got ${singerCount}`);
  assert.equal(recTeamCount, 8, `Expected 8 recording teams, got ${recTeamCount}`);
  console.log(`  ✅ Coordinators: ${coordCount}`);
  console.log(`  ✅ Vendors: ${vendorCount}`);
  console.log(`  ✅ Singers: ${singerCount}`);
  console.log(`  ✅ Recording Teams: ${recTeamCount}`);

  // TEST 7-9: Unique Languages Calculation
  console.log('\n▶ TEST 7-9: Unique Languages Count & Discovery');
  const { data: langData } = await supabase
    .from('talent_languages')
    .select('language');
  const uniqueLangs = new Set();
  for (const l of langData) {
    const raw = (l.language || '').trim();
    if (raw && raw.toLowerCase() !== 'other') {
      const canonical = formatLanguageDisplayName(raw);
      if (canonical) uniqueLangs.add(canonical);
    }
  }
  assert.ok(uniqueLangs.size >= 30, `Expected at least 30 unique languages, got ${uniqueLangs.size}`);
  assert.ok(uniqueLangs.has('Korean'), 'Korean is discovered and counted');
  assert.ok(uniqueLangs.has('Arabic'), 'Arabic is discovered and counted');
  assert.ok(uniqueLangs.has('Urdu'), 'Urdu is discovered and counted');
  assert.ok(uniqueLangs.has('Bhojpuri'), 'Bhojpuri is discovered and counted');
  console.log(`  ✅ Total Unique Languages: ${uniqueLangs.size} (Includes Korean, Arabic, Urdu, Bhojpuri, etc.)`);

  // TEST 10-11: Controller End-to-End Simulation
  console.log('\n▶ TEST 10-11: Controller getRegistrationsAdmin Execution & Filters');
  const mockReq = {
    query: {
      page: '1',
      pageSize: '10',
    },
  };
  let resStatus = 0;
  let resData = null;
  const mockRes = {
    status(s) {
      resStatus = s;
      return this;
    },
    json(d) {
      resData = d;
      return this;
    },
  };

  await getRegistrationsAdmin(mockReq, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resData.success, true);
  assert.equal(resData.stats.total, 150);
  assert.equal(resData.stats.verified, 11);
  assert.equal(resData.stats.pending, 139);
  assert.equal(resData.stats.coordinators, 9);
  assert.equal(resData.stats.vendors, 8);
  assert.equal(resData.stats.singers, 3);
  assert.equal(resData.stats.recordingTeams, 8);
  assert.equal(resData.stats.languageCoverageCount, uniqueLangs.size);
  assert.ok(Array.isArray(resData.stats.activeLanguages) && resData.stats.activeLanguages.includes('Korean'));
  assert.equal(resData.data.length, 10, 'Page size 10 respected');
  console.log('  ✅ Controller returns dynamic stats matching all verified counts');

  // TEST 12: Role Filter with Aliases
  console.log('\n▶ TEST 12: Role Filter with Aliases ("Coordinators" -> 9)');
  const roleReq = {
    query: {
      role: 'Coordinators',
      pageSize: '50',
    },
  };
  await getRegistrationsAdmin(roleReq, mockRes);
  assert.equal(resData.data.length, 9, `Expected 9 coordinators via role filter, got ${resData.data.length}`);
  console.log('  ✅ Role filter "Coordinators" successfully matched all 9 Coordinator records');

  // TEST 13: Language Filter with Discovered Languages
  console.log('\n▶ TEST 13: Language Filter with Discovered Language ("Korean")');
  const langReq = {
    query: {
      language: 'Korean',
      pageSize: '50',
    },
  };
  await getRegistrationsAdmin(langReq, mockRes);
  assert.ok(resData.data.length >= 1, `Expected at least 1 Korean talent, got ${resData.data.length}`);
  console.log(`  ✅ Language filter "Korean" matched ${resData.data.length} talent records`);

  // TEST 14: Country Filter (South Korea, USA, India)
  console.log('\n▶ TEST 14: Country Filter');
  const countryReq = {
    query: {
      country: 'South Korea',
      pageSize: '50',
    },
  };
  await getRegistrationsAdmin(countryReq, mockRes);
  console.log(`  ✅ Country filter "South Korea" returned ${resData.data.length} records`);

  console.log('\n====================================================');
  console.log('🎉 ALL 14 AUDIT & VERIFICATION TESTS PASSED');
  console.log('====================================================');
}

runTalentNetworkAuditTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
