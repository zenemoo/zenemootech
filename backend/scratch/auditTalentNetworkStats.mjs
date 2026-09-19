import { supabase } from '../src/config/supabase.js';

async function runAudit() {
  console.log('====================================================');
  console.log('🔍 READ-ONLY TALENT NETWORK DATA AUDIT');
  console.log('====================================================');

  if (!supabase) {
    console.error('❌ Supabase client not available.');
    return;
  }

  // 1. Total count & status breakdown
  const { count: totalAll, error: errTotal } = await supabase
    .from('talent_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('is_archived', false);

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

  console.log(`Total Non-Archived: ${totalAll}`);
  console.log(`Verified: ${verifiedCount}`);
  console.log(`Pending: ${pendingCount}`);

  // 2. Fetch distinct primary_role values
  const { data: roleData, error: errRoles } = await supabase
    .from('talent_registrations')
    .select('primary_role')
    .eq('is_archived', false);

  if (roleData) {
    const roleCounts = {};
    for (const r of roleData) {
      const role = r.primary_role || 'NULL/EMPTY';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }
    console.log('\n--- PRIMARY ROLE BREAKDOWN ---');
    console.table(roleCounts);
  }

  // 3. Fetch distinct language values in talent_languages
  const { data: langData, error: errLangs } = await supabase
    .from('talent_languages')
    .select('language');

  if (langData) {
    const langCounts = {};
    for (const l of langData) {
      const lang = (l.language || '').trim();
      if (lang) {
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      }
    }
    console.log('\n--- TALENT LANGUAGES BREAKDOWN (talent_languages table) ---');
    console.log(`Total rows in talent_languages: ${langData.length}`);
    console.log(`Total unique raw language strings: ${Object.keys(langCounts).length}`);
    console.table(langCounts);
  }

  // 4. Also check if any languages are in talent_supported_languages
  const { data: supportedLangs } = await supabase
    .from('talent_supported_languages')
    .select('language, status');
  console.log(`\nSupported Languages in talent_supported_languages table: ${supportedLangs?.length || 0}`);
  if (supportedLangs) {
    console.log(supportedLangs.map(s => s.language));
  }
}

runAudit().catch(console.error);
