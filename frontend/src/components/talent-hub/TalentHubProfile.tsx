import React, { useState } from 'react';
import {
  User,
  Mail,
  Briefcase,
  Globe2,
  Cpu,
  ShieldCheck,
  Layers,
  Sparkles,
  Edit3,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  Award,
  Check,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';
import { TalentHubProfileEditModal } from './TalentHubProfileEditModal';

export const TalentHubProfile: React.FC = () => {
  const { talentProfile, languages, experiences, isProfileLoading, reloadProfile } = useTalentHubAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

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
  const additionalInfo = talentProfile.additional_info || {};
  const workCapabilities = Array.isArray(talentProfile.work_capabilities) ? talentProfile.work_capabilities : [];

  // Profile Completeness calculation
  let totalScore = 0;
  const maxScore = 7;
  if (talentProfile.full_name?.trim()) totalScore += 1;
  if (talentProfile.phone?.trim()) totalScore += 1;
  if (talentProfile.state?.trim() && talentProfile.city_district?.trim()) totalScore += 1;
  if (talentProfile.primary_role?.trim()) totalScore += 1;
  if (languages.length > 0) totalScore += 1;
  if (workCapabilities.length > 0) totalScore += 1;
  if (Object.keys(equipmentResources).length > 0) totalScore += 1;
  const completenessPercent = Math.round((totalScore / maxScore) * 100);

  const handleEditSuccess = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
    reloadProfile();
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-300 w-full max-w-full min-w-0 overflow-hidden">
      {/* ── Success Toast ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[170] p-4 rounded-2xl bg-[#09151f] border border-cyan-500/40 text-cyan-300 flex items-center gap-3 shadow-2xl shadow-cyan-950/60 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold font-mono">{toastMessage}</span>
        </div>
      )}

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
            Your registered credentials, capabilities, and technical equipment with Zenemoo
          </p>
        </div>

        {/* Action Controls & Status */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold text-xs font-mono shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-black" />
            <span>Edit Profile</span>
          </button>

          <div className="px-4 py-2 rounded-2xl bg-[#080d19]/90 border border-cyan-500/30 flex items-center gap-2 shadow-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-mono text-slate-300 font-medium">Status:</span>
            <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wide">
              {talentProfile.status || 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Profile Completeness Summary ── */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#080d19] via-[#0f1b30]/70 to-[#080d19] border border-cyan-500/20 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white font-display">Contributor Profile Strength</h3>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[10px]">
                {completenessPercent}% Complete
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Keep your profile up to date to ensure rapid match-making for upcoming AI datasets and recording projects.
            </p>
          </div>
        </div>

        <div className="w-full md:w-56 shrink-0 space-y-1.5">
          <div className="w-full bg-black/60 rounded-full h-2 border border-white/10 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${completenessPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>{totalScore} / {maxScore} Sections</span>
            <span className="text-cyan-300 font-bold">{completenessPercent === 100 ? 'Fully Verified' : 'Self-Editable'}</span>
          </div>
        </div>
      </div>

      {/* ── Information Cards Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Personal Information */}
        <div className="p-6 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Personal Information</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
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
        <div className="p-6 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Professional Information</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
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
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">Role-Specific Details</span>
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
        <div className="p-6 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Globe2 className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Languages ({languages.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" /> Manage
            </button>
          </div>

          {languages.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">No language records configured.</p>
          ) : (
            <div className="space-y-2.5">
              {languages.map((lang) => (
                <div
                  key={lang.id}
                  className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
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
        <div className="p-6 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Experience Records ({experiences.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" /> Manage
            </button>
          </div>

          {experiences.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">No past experience records submitted.</p>
          ) : (
            <div className="space-y-3">
              {experiences.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5"
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
        <div className="p-6 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Equipment &amp; Resources</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {Object.keys(equipmentResources).length > 0 ? (
              Object.entries(equipmentResources).map(([k, v]) => (
                <div key={k} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-500 text-[10px] font-mono uppercase block tracking-wider">
                    {k.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="text-slate-200 font-medium mt-0.5 block">
                    {Array.isArray(v)
                      ? v.join(', ') || 'None selected'
                      : typeof v === 'boolean'
                      ? v
                        ? 'Yes'
                        : 'No'
                      : String(v || '—')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 col-span-2 py-2">Standard recording equipment configured.</p>
            )}
          </div>
        </div>

        {/* 6. Dynamic Criteria & Additional Answers (if present) */}
        {Object.keys(additionalInfo).length > 0 && (
          <div className="p-6 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Project Criteria &amp; Info
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {Object.entries(additionalInfo).map(([k, v]) => (
                <div key={k} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-500 text-[10px] font-mono uppercase block tracking-wider">
                    {k.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-200 font-medium mt-0.5 block">
                    {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v || '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Registration Credentials */}
        <div className="p-6 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
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
              <p className="text-sm font-medium text-slate-300 mt-0.5">Self-Service Enabled</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Self-Service Action Banner ── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#080d19] via-[#0f172a]/80 to-[#080d19] border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-display">Need to update your contact or availability?</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              You can update your personal information, languages, experience, and equipment directly at any time. Changes take effect immediately in your portal and with Zenemoo project managers.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-extrabold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-black" />
            <span>Open Profile Editor</span>
          </button>
        </div>
      </div>

      {/* ── Profile Edit Modal ── */}
      {isEditModalOpen && (
        <TalentHubProfileEditModal
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};
