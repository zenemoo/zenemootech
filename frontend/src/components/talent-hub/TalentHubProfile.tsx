import React from 'react';
import {
  User,
  Mail,
  Briefcase,
  Globe2,
  Cpu,
  ShieldCheck,
  Layers,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';

export const TalentHubProfile: React.FC = () => {
  const { talentProfile, languages, experiences, isProfileLoading } = useTalentHubAuth();

  if (isProfileLoading && !talentProfile) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono">Loading verified profile...</p>
      </div>
    );
  }

  if (!talentProfile) {
    return (
      <div className="py-20 text-center text-slate-400">
        <p className="text-sm">No registered contributor details available.</p>
      </div>
    );
  }

  const roleDetails = talentProfile.role_details || {};
  const equipmentResources = talentProfile.equipment_resources || {};
  const workCapabilities = Array.isArray(talentProfile.work_capabilities) ? talentProfile.work_capabilities : [];

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-300 w-full max-w-full min-w-0 overflow-hidden">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-white/10 pb-4 sm:pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>Verified Contributor Record</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
            My Profile
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Your registered credentials and capabilities with Zenemoo
          </p>
        </div>

        {/* Read-Only Status Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2 rounded-2xl bg-[#080d19]/90 border border-cyan-500/30 flex items-center gap-2 shadow-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-mono text-slate-300 font-medium">Status:</span>
            <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wide">
              {talentProfile.status || 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Information Cards Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Personal Information */}
        <div className="p-6 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Full Name</span>
              <p className="text-sm font-semibold text-white mt-0.5">{talentProfile.full_name || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Gender</span>
              <p className="text-sm font-medium text-slate-200 mt-0.5 capitalize">{talentProfile.gender || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Email Address</span>
              <p className="text-sm font-medium text-cyan-400 mt-0.5 truncate font-mono">{talentProfile.email || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Phone Number</span>
              <p className="text-sm font-medium text-slate-200 mt-0.5 font-mono">
                {talentProfile.country_code || '+91'} {talentProfile.phone || '—'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">State</span>
              <p className="text-sm font-medium text-slate-200 mt-0.5">{talentProfile.state || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">City / District</span>
              <p className="text-sm font-medium text-slate-200 mt-0.5">{talentProfile.city_district || '—'}</p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Preferred Contact Channel</span>
              <p className="text-sm font-medium text-slate-200 mt-0.5">{talentProfile.preferred_contact || 'WhatsApp'}</p>
            </div>
          </div>
        </div>

        {/* 2. Professional Information */}
        <div className="p-6 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Professional Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Primary Role</span>
              <p className="text-sm font-semibold text-white mt-0.5">{talentProfile.primary_role || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Availability</span>
              <p className="text-sm font-medium text-slate-200 mt-0.5">{talentProfile.availability || 'Immediately'}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Working Preference</span>
              <p className="text-sm font-medium text-slate-200 mt-0.5">{talentProfile.working_preference || 'Project Basis'}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Previous Experience</span>
              <p className="text-sm font-medium text-slate-200 mt-0.5">
                {talentProfile.has_previous_experience ? 'Yes, experienced in AI data tasks' : 'No previous experience'}
              </p>
            </div>

            {/* Work Capabilities */}
            <div className="sm:col-span-2">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Work Capabilities</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {workCapabilities.length > 0 ? (
                  workCapabilities.map((cap, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-medium text-slate-200"
                    >
                      {cap}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No specific capabilities selected.</span>
                )}
              </div>
            </div>

            {/* Role Details Extra if present */}
            {Object.keys(roleDetails).length > 0 && (
              <div className="sm:col-span-2 pt-2 border-t border-white/5">
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Role Details</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {Object.entries(roleDetails).map(([k, v]) => (
                    <div key={k} className="text-xs">
                      <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}: </span>
                      <span className="text-slate-200 font-medium">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Registered Languages */}
        <div className="p-6 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Globe2 className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Languages</h2>
              <span className="text-xs font-mono text-slate-400">{languages.length} Listed</span>
            </div>
          </div>

          {languages.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">No language records attached.</p>
          ) : (
            <div className="space-y-2.5">
              {languages.map((lang) => (
                <div
                  key={lang.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-sm font-bold text-white">{lang.language}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {lang.speaker_availability || 'Native Speaker'}
                      {lang.capacity > 1 && ` • Capacity: ${lang.capacity} speakers`}
                    </p>
                  </div>
                  <span className="inline-flex items-center self-start sm:self-auto px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold">
                    {lang.proficiency || 'Native'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Experience History */}
        <div className="p-6 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Experience Records</h2>
              <span className="text-xs font-mono text-slate-400">{experiences.length} Listed</span>
            </div>
          </div>

          {experiences.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">No past experience records submitted during registration.</p>
          ) : (
            <div className="space-y-3">
              {experiences.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{exp.project_company_name || 'Project'}</h3>
                    {exp.duration && (
                      <span className="text-[10px] font-mono text-slate-400 font-medium px-2 py-0.5 rounded bg-white/5">
                        {exp.duration}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-500 text-[10px] font-mono block">Type of Work:</span>
                      <span>{exp.type_of_work || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] font-mono block">Languages:</span>
                      <span>{exp.languages_used || '—'}</span>
                    </div>
                  </div>
                  {exp.description && (
                    <p className="text-xs text-slate-400 pt-1 border-t border-white/5">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Equipment & Technical Resources */}
        <div className="p-6 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Equipment &amp; Resources</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {Object.keys(equipmentResources).length > 0 ? (
              Object.entries(equipmentResources).map(([k, v]) => (
                <div key={k} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-500 text-[10px] font-mono uppercase block tracking-wider">
                    {k.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="text-slate-200 font-medium mt-0.5 block">
                    {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v || '—')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 col-span-2 py-2">Standard recording equipment configured.</p>
            )}
          </div>
        </div>

        {/* 6. Registration Credentials */}
        <div className="p-6 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Registration Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Registration Code</span>
              <p className="text-sm font-mono font-bold text-cyan-300 mt-0.5">
                {talentProfile.registration_code || '—'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Registration Date</span>
              <p className="text-sm font-medium text-slate-200 mt-0.5 font-mono">
                {talentProfile.created_at ? new Date(talentProfile.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Account Status</span>
              <div className="mt-1">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-semibold text-xs capitalize">
                  {talentProfile.status || 'Active'}
                </span>
              </div>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Profile Mode</span>
              <p className="text-sm font-medium text-slate-300 mt-0.5">Read-Only Authorized</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact Zenemoo for Updates Banner ── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#080d19] via-[#0f172a]/70 to-[#080d19] border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-display">Need to update your profile information?</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              To maintain candidate record integrity and client verification compliance, talent profile details cannot be modified directly in the portal. Please contact Zenemoo Support with any requested updates.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
          <a
            href="mailto:info@zenemoo.in?subject=Profile%20Update%20Request"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition-all shadow-sm active:scale-95"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Zenemoo Support</span>
          </a>
        </div>
      </div>
    </div>
  );
};
