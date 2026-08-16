import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Briefcase,
  Layers,
  Plus,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Save,
} from 'lucide-react';
import { talentRegistrationApi } from '../services/api';

interface AdminCandidateEditModalProps {
  candidate: any;
  onClose: () => void;
  onSuccess: (msg: string, updatedRecord?: any) => void;
}

export const AdminCandidateEditModal: React.FC<AdminCandidateEditModalProps> = ({
  candidate,
  onClose,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState<string>(candidate.full_name || '');
  const [email, setEmail] = useState<string>(candidate.email || '');
  const [phone, setPhone] = useState<string>(candidate.phone || '');
  const [countryCode, setCountryCode] = useState<string>(candidate.country_code || '+91');
  const [gender, setGender] = useState<string>(candidate.gender || 'Male');
  const [state, setState] = useState<string>(candidate.state || '');
  const [cityDistrict, setCityDistrict] = useState<string>(candidate.city_district || '');
  const [preferredContact, setPreferredContact] = useState<string>(candidate.preferred_contact || 'WhatsApp');
  const [primaryRole, setPrimaryRole] = useState<string>(candidate.primary_role || 'Individual Participant');
  const [availability, setAvailability] = useState<string>(candidate.availability || 'Immediately');
  const [workingPreference, setWorkingPreference] = useState<string>(candidate.working_preference || 'Project Basis');

  // Work capabilities string list
  const [workCapabilities, setWorkCapabilities] = useState<string[]>(candidate.work_capabilities || []);

  // Languages list
  const [languages, setLanguages] = useState<any[]>(
    (candidate.languages || []).map((l: any) => ({
      language: typeof l === 'string' ? l : l.language || 'Unspecified',
      proficiency: typeof l === 'object' ? l.proficiency || 'Native' : 'Native',
      speaker_availability: typeof l === 'object' ? l.speaker_availability || l.speakerAvailability || 'I am a native speaker' : 'I am a native speaker',
      capacity: typeof l === 'object' ? Number(l.capacity) || 1 : 1,
    }))
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleAddLanguageRow = () => {
    setLanguages([
      ...languages,
      { language: '', proficiency: 'Native', speaker_availability: 'I am a native speaker', capacity: 1 },
    ]);
  };

  const handleRemoveLanguageRow = (idx: number) => {
    setLanguages(languages.filter((_, i) => i !== idx));
  };

  const handleUpdateLanguageField = (idx: number, field: string, value: any) => {
    const next = [...languages];
    next[idx] = { ...next[idx], [field]: value };
    setLanguages(next);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return setErrorMsg('Full Name is required.');
    if (!email.trim() || !email.includes('@')) return setErrorMsg('Valid Email address is required.');
    if (!phone.trim()) return setErrorMsg('Phone number is required.');

    // Ensure no empty language names
    const validLanguages = languages.filter((l) => l.language.trim() !== '');

    setIsSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        country_code: countryCode.trim(),
        gender,
        state: state.trim(),
        city_district: cityDistrict.trim(),
        preferred_contact: preferredContact,
        primary_role: primaryRole,
        availability,
        working_preference: workingPreference,
        work_capabilities: workCapabilities,
        languages: validLanguages,
      };

      const res = await talentRegistrationApi.adminUpdateCandidateProfile(candidate.id, payload);
      if (res?.data?.success) {
        onSuccess(`Candidate profile updated & audit log recorded.`, res.data.data);
        onClose();
      } else {
        throw new Error(res?.data?.message || 'Unable to save all profile changes. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Unable to save all profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#090b12] border-l border-white/15 h-full overflow-y-auto p-6 sm:p-8 space-y-6 font-mono text-xs text-slate-200 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" /> Edit Candidate Profile
            </h3>
            <p className="text-[11px] text-cyan-400">
              ID: {candidate.registration_code || candidate.id} • Modifying contact details &amp; language capability
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Section 1: Personal & Contact */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> 1. Personal &amp; Contact Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-400 block text-[11px]">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block text-[11px]">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block text-[11px]">Contact Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block text-[11px]">WhatsApp / Phone Number *</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-16 px-2 py-2 rounded-xl bg-black/80 border border-white/15 text-cyan-300 font-bold focus:outline-none"
                  />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block text-[11px]">State *</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block text-[11px]">City / District *</label>
                <input
                  type="text"
                  value={cityDistrict}
                  onChange={(e) => setCityDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Languages & Capacity */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> 2. Configured Languages &amp; Capacity
              </h4>
              <button
                type="button"
                onClick={handleAddLanguageRow}
                className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-cyan-500/40"
              >
                <Plus className="w-3 h-3" /> Add Language
              </button>
            </div>

            {languages.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                No languages currently configured. Click "Add Language" above to assign languages to candidate profile.
              </div>
            ) : (
              languages.map((l, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-3 relative">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder="Language Name (e.g. Odia, Kui, Ho)"
                      value={l.language}
                      onChange={(e) => handleUpdateLanguageField(idx, 'language', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-cyan-400"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveLanguageRow(idx)}
                      className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors shrink-0"
                      title="Remove language"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">Proficiency:</label>
                      <select
                        value={l.proficiency}
                        onChange={(e) => handleUpdateLanguageField(idx, 'proficiency', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-black border border-white/15 text-white text-[11px]"
                      >
                        <option value="Native">Native</option>
                        <option value="Fluent">Fluent</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Intermediate">Intermediate</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">Availability:</label>
                      <select
                        value={l.speaker_availability}
                        onChange={(e) => handleUpdateLanguageField(idx, 'speaker_availability', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-black border border-white/15 text-white text-[11px]"
                      >
                        <option value="I am a native speaker">I am a native speaker</option>
                        <option value="I can arrange native speakers">I can arrange native speakers</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">Speaker Capacity:</label>
                      <input
                        type="number"
                        min="1"
                        value={l.capacity}
                        onChange={(e) => handleUpdateLanguageField(idx, 'capacity', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-black border border-white/15 text-amber-300 font-bold text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Section 3: Role & Availability */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> 3. Primary Role &amp; Availability
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-400 block text-[11px]">Primary Role</label>
                <select
                  value={primaryRole}
                  onChange={(e) => setPrimaryRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Individual Participant">Individual Participant</option>
                  <option value="Coordinator">Coordinator</option>
                  <option value="Speaker Recruiter">Speaker Recruiter</option>
                  <option value="Singer / Vocal Artist">Singer / Vocal Artist</option>
                  <option value="Recording Team">Recording Team</option>
                  <option value="Field Agent">Field Agent</option>
                  <option value="Vendor / Agency">Vendor / Agency</option>
                  <option value="Community / Organization">Community / Organization</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block text-[11px]">Availability Timeframe</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Immediately">Immediately</option>
                  <option value="Within 1 Week">Within 1 Week</option>
                  <option value="Within 2 Weeks">Within 2 Weeks</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <Save className="w-4 h-4 text-black" />
              {isSaving ? 'Saving Profile Updates...' : 'Save Profile & Record Audit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
