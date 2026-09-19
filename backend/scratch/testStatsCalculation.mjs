import { supabase } from '../src/config/supabase.js';
import { formatLanguageDisplayName, normalizeLanguageKey } from '../src/utils/languageUtils.js';

async function testStatsCalculation() {
  console.log('--- TESTING UPDATED STATS CALCULATION LOGIC ---');

  const [verCountRes, pendCountRes, totalAllRes, rolesRes, langsRes] = await Promise.all([
    supabase.from('talent_registrations').select('id', { count: 'exact', head: true }).eq('status', 'verified').eq('is_archived', false),
    supabase.from('talent_registrations').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('is_archived', false),
    supabase.from('talent_registrations').select('id', { count: 'exact', head: true }).eq('is_archived', false),
    supabase.from('talent_registrations').select('primary_role').eq('is_archived', false),
    supabase.from('talent_languages').select('language'),
  ]);

  const stats = {
    total: totalAllRes.count || 0,
    verified: verCountRes.count || 0,
    pending: pendCountRes.count || 0,
    coordinators: 0,
    vendors: 0,
    singers: 0,
    recordingTeams: 0,
    languageCoverageCount: 0,
    activeLanguages: [],
  };

  if (Array.isArray(rolesRes.data)) {
    let coordCount = 0;
    let vendorCount = 0;
    let singerCount = 0;
    let recTeamCount = 0;

    for (const r of rolesRes.data) {
      const roleStr = (r.primary_role || '').toLowerCase().trim();
      if (roleStr.includes('coordinator')) coordCount++;
      if (roleStr.includes('vendor') || roleStr.includes('agency')) vendorCount++;
      if (roleStr.includes('singer') || roleStr.includes('vocal')) singerCount++;
      if (roleStr.includes('recording team') || roleStr.includes('recording_team')) recTeamCount++;
    }
    stats.coordinators = coordCount;
    stats.vendors = vendorCount;
    stats.singers = singerCount;
    stats.recordingTeams = recTeamCount;
  }

  if (Array.isArray(langsRes.data)) {
    const uniqueLangs = new Set();
    for (const l of langsRes.data) {
      const rawName = (l.language || '').trim();
      if (rawName && rawName.toLowerCase() !== 'other') {
        const canonical = formatLanguageDisplayName(rawName);
        if (canonical) uniqueLangs.add(canonical);
      }
    }
    stats.languageCoverageCount = uniqueLangs.size;
    stats.activeLanguages = Array.from(uniqueLangs).sort();
  }

  console.log('Calculated Stats:', JSON.stringify(stats, null, 2));
}

testStatsCalculation().catch(console.error);
