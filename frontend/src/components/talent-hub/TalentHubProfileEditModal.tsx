import React, { useState, useEffect, useMemo } from 'react';
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
  Lock,
  Cpu,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Award,
  Check,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useTalentHubAuth, TalentProfile, TalentLanguage, TalentExperience } from './TalentHubAuthContext';
import { talentHubApi } from '../../services/talentHubApi';

interface TalentHubProfileEditModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const TalentHubProfileEditModal: React.FC<TalentHubProfileEditModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { talentProfile, languages, experiences, token, updateProfile } = useTalentHubAuth();

  // Dynamic config state
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [supportedLanguagesList, setSupportedLanguagesList] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableCapabilities, setAvailableCapabilities] = useState<string[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [availableEnvironments, setAvailableEnvironments] = useState<string[]>([]);
  const [availableInternetQualities, setAvailableInternetQualities] = useState<string[]>([]);
  const [indianStates, setIndianStates] = useState<string[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);

  // Form State: Personal
  const [fullName, setFullName] = useState<string>(talentProfile?.full_name || '');
  const [gender, setGender] = useState<string>(talentProfile?.gender || 'Male');
  const [phone, setPhone] = useState<string>(talentProfile?.phone || '');
  const [countryCode, setCountryCode] = useState<string>(talentProfile?.country_code || '+91');
  const [state, setState] = useState<string>(talentProfile?.state || '');
  const [cityDistrict, setCityDistrict] = useState<string>(talentProfile?.city_district || '');
  const [preferredContact, setPreferredContact] = useState<string>(talentProfile?.preferred_contact || 'WhatsApp');

  // Form State: Professional
  const [primaryRole, setPrimaryRole] = useState<string>(talentProfile?.primary_role || 'Individual Participant');
  const [roleDetails, setRoleDetails] = useState<Record<string, any>>(talentProfile?.role_details || {});
  const [availability, setAvailability] = useState<string>(talentProfile?.availability || 'Immediately');
  const [workingPreference, setWorkingPreference] = useState<string>(talentProfile?.working_preference || 'Project Basis');
  const [hasPreviousExperience, setHasPreviousExperience] = useState<boolean>(
    Boolean(talentProfile?.has_previous_experience)
  );
  const [workCapabilities, setWorkCapabilities] = useState<string[]>(
    Array.isArray(talentProfile?.work_capabilities) ? talentProfile.work_capabilities : []
  );

  // Form State: Dynamic Answers & Additional Info
  const [additionalInfo, setAdditionalInfo] = useState<Record<string, any>>(talentProfile?.additional_info || {});

  // Form State: Equipment & Resources
  const initialEquipment = talentProfile?.equipment_resources || {};
  const [equipmentList, setEquipmentList] = useState<string[]>(
    Array.isArray(initialEquipment.equipmentList)
      ? initialEquipment.equipmentList
      : Array.isArray(initialEquipment.equipment)
      ? initialEquipment.equipment
      : []
  );
  const [recordingEnvironment, setRecordingEnvironment] = useState<string>(
    initialEquipment.recordingEnvironment || 'Quiet Home/Room'
  );
  const [internetQuality, setInternetQuality] = useState<string>(
    initialEquipment.internetQuality || 'Good (High speed / Broadband)'
  );
  const [equipmentDetails, setEquipmentDetails] = useState<Record<string, any>>({ ...initialEquipment });

  // Form State: Languages
  const [formLanguages, setFormLanguages] = useState<any[]>(
    (languages || []).map((l) => ({
      id: l.id,
      language: l.language || '',
      proficiency: l.proficiency || 'Native',
      speaker_availability: l.speaker_availability || 'I am a native speaker',
      capacity: Number(l.capacity) || 1,
    }))
  );

  // Form State: Experiences
  const [formExperiences, setFormExperiences] = useState<any[]>(
    (experiences || []).map((e) => ({
      id: e.id,
      projectName: e.project_company_name || '',
      typeOfWork: e.type_of_work || '',
      languagesUsed: e.languages_used || '',
      workVolume: e.work_volume || '',
      duration: e.duration || '',
      description: e.description || '',
    }))
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState<boolean>(false);
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);

  // Load Form Config (dynamic questions, supported languages, options)
  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      setIsLoadingConfig(true);
      try {
        if (token) {
          const res = await talentHubApi.getProfileFormConfig(token);
          if (res?.success && isMounted) {
            setDynamicQuestions(res.dynamic_questions || []);
            if (Array.isArray(res.supported_languages)) {
              setSupportedLanguagesList(res.supported_languages.map((l: any) => l.language || l));
            }
            if (Array.isArray(res.roles)) setAvailableRoles(res.roles);
            if (Array.isArray(res.work_capabilities)) setAvailableCapabilities(res.work_capabilities);
            if (Array.isArray(res.equipment_options)) setAvailableEquipment(res.equipment_options);
            if (Array.isArray(res.recording_environments)) setAvailableEnvironments(res.recording_environments);
            if (Array.isArray(res.internet_qualities)) setAvailableInternetQualities(res.internet_qualities);
            if (Array.isArray(res.states)) setIndianStates(res.states);
          }
        }
      } catch (err) {
        console.warn('Profile form config fetch warning:', err);
      } finally {
        if (isMounted) setIsLoadingConfig(false);
      }
    };
    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Calculate Profile Completeness
  const completeness = useMemo(() => {
    let totalScore = 0;
    let maxScore = 7;

    if (fullName.trim()) totalScore += 1;
    if (phone.trim()) totalScore += 1;
    if (state.trim() && cityDistrict.trim()) totalScore += 1;
    if (primaryRole.trim()) totalScore += 1;
    if (formLanguages.some((l) => l.language.trim())) totalScore += 1;
    if (workCapabilities.length > 0) totalScore += 1;
    if (equipmentList.length > 0 || recordingEnvironment) totalScore += 1;

    const percent = Math.round((totalScore / maxScore) * 100);
    return {
      percent,
      completed: totalScore,
      total: maxScore,
    };
  }, [
    fullName,
    phone,
    state,
    cityDistrict,
    primaryRole,
    formLanguages,
    workCapabilities,
    equipmentList,
    recordingEnvironment,
  ]);

  // Check if modified compared to initial
  const isDirty = useMemo(() => {
    if (fullName !== (talentProfile?.full_name || '')) return true;
    if (gender !== (talentProfile?.gender || 'Male')) return true;
    if (phone !== (talentProfile?.phone || '')) return true;
    if (state !== (talentProfile?.state || '')) return true;
    if (cityDistrict !== (talentProfile?.city_district || '')) return true;
    if (preferredContact !== (talentProfile?.preferred_contact || 'WhatsApp')) return true;
    if (primaryRole !== (talentProfile?.primary_role || 'Individual Participant')) return true;
    if (availability !== (talentProfile?.availability || 'Immediately')) return true;
    if (workingPreference !== (talentProfile?.working_preference || 'Project Basis')) return true;
    if (hasPreviousExperience !== Boolean(talentProfile?.has_previous_experience)) return true;
    return true; // Dynamic answers, languages, equipment can change
  }, [
    fullName,
    gender,
    phone,
    state,
    cityDistrict,
    preferredContact,
    primaryRole,
    availability,
    workingPreference,
    hasPreviousExperience,
    talentProfile,
  ]);

  const handleClose = () => {
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const handleToggleCapability = (cap: string) => {
    if (workCapabilities.includes(cap)) {
      setWorkCapabilities(workCapabilities.filter((c) => c !== cap));
    } else {
      setWorkCapabilities([...workCapabilities, cap]);
    }
  };

  const handleToggleEquipment = (eq: string) => {
    if (equipmentList.includes(eq)) {
      setEquipmentList(equipmentList.filter((e) => e !== eq));
    } else {
      setEquipmentList([...equipmentList, eq]);
    }
  };

  // Language Handlers
  const handleAddLanguageRow = () => {
    setFormLanguages([
      ...formLanguages,
      {
        language: '',
        proficiency: 'Native',
        speaker_availability: 'I am a native speaker',
        capacity: 1,
      },
    ]);
  };

  const handleRemoveLanguageRow = (idx: number) => {
    setFormLanguages(formLanguages.filter((_, i) => i !== idx));
  };

  const handleUpdateLanguageField = (idx: number, field: string, value: any) => {
    const next = [...formLanguages];
    next[idx] = { ...next[idx], [field]: value };
    setFormLanguages(next);
  };

  // Experience Handlers
  const handleAddExperienceRow = () => {
    setFormExperiences([
      ...formExperiences,
      {
        projectName: '',
        typeOfWork: '',
        languagesUsed: '',
        workVolume: '',
        duration: '',
        description: '',
      },
    ]);
  };

  const handleRemoveExperienceRow = (idx: number) => {
    setFormExperiences(formExperiences.filter((_, i) => i !== idx));
  };

  const handleUpdateExperienceField = (idx: number, field: string, value: any) => {
    const next = [...formExperiences];
    next[idx] = { ...next[idx], [field]: value };
    setFormExperiences(next);
  };

  // Dynamic Question Answer Handler
  const handleUpdateDynamicAnswer = (key: string, value: any) => {
    setAdditionalInfo({
      ...additionalInfo,
      [key]: value,
    });
  };

  const triggerValidationError = (message: string, fieldId?: string) => {
    setErrorMsg(message);
    if (fieldId) {
      setHighlightedFieldId(fieldId);
      setTimeout(() => setHighlightedFieldId(null), 3500);
      const el = document.getElementById(fieldId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Submit Profile Edits
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      return triggerValidationError('Full Name is required.', 'edit-field-fullName');
    }
    if (!phone.trim()) {
      return triggerValidationError('Phone number is required.', 'edit-field-phone');
    }
    if (!state.trim()) {
      return triggerValidationError('State is required.', 'edit-field-state');
    }
    if (!cityDistrict.trim()) {
      return triggerValidationError('City / District is required.', 'edit-field-city');
    }
    if (!primaryRole.trim()) {
      return triggerValidationError('Primary Role is required.', 'edit-field-role');
    }

    const validLanguages = formLanguages.filter((l) => l.language && l.language.trim() !== '');
    if (validLanguages.length === 0) {
      return triggerValidationError('Please configure at least one language for your contributor profile.');
    }

    // Validate dynamic required questions
    for (const q of dynamicQuestions) {
      if (q.is_required && q.status !== 'inactive') {
        const key = q.field_key || q.id;
        const val = additionalInfo[key];
        if (val === undefined || val === null || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
          return triggerValidationError(`Required field missing: "${q.label}"`, `edit-dynamic-${key}`);
        }
      }
    }

    setIsSaving(true);

    try {
      const payload = {
        full_name: fullName.trim(),
        gender,
        phone: phone.trim(),
        country_code: countryCode.trim(),
        state: state.trim(),
        city_district: cityDistrict.trim(),
        preferred_contact: preferredContact,
        primary_role: primaryRole,
        role_details: roleDetails,
        has_previous_experience: hasPreviousExperience,
        work_capabilities: workCapabilities,
        availability,
        working_preference: workingPreference,
        equipment_resources: {
          ...equipmentDetails,
          equipmentList,
          recordingEnvironment,
          internetQuality,
        },
        additional_info: additionalInfo,
        languages: validLanguages,
        experiences: formExperiences.filter((e) => e.projectName || e.typeOfWork),
      };

      const res = await updateProfile(payload);
      if (res.success) {
        onSuccess(res.message || 'Profile updated successfully!');
        onClose();
      } else {
        throw new Error(res.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#090d16] border-l border-white/15 h-full overflow-y-auto p-4 sm:p-8 space-y-6 text-xs text-slate-200 shadow-2xl relative">
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5 sticky top-0 bg-[#090d16]/95 backdrop-blur-md z-20 -mx-4 -mt-4 px-4 pt-4 sm:-mx-8 sm:-mt-8 sm:px-8 sm:pt-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-bold uppercase tracking-wider mb-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Self-Service Profile Editor</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold font-display text-white tracking-tight">
              Edit Contributor Profile
            </h3>
            <p className="text-[11px] font-mono text-cyan-400 flex items-center gap-2 mt-0.5">
              <span>ID: {talentProfile?.registration_code || 'ZEN-CONTRIBUTOR'}</span>
              <span>•</span>
              <span className="text-slate-400">All updates synchronize directly with your record</span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Profile Completeness Card ── */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-purple-950/30 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white text-xs">Profile Completion Status</span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[11px]">
                {completeness.percent}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {completeness.percent === 100
                ? 'Your contributor profile is 100% complete and ready for project allocation!'
                : `${completeness.completed} of ${completeness.total} core credential sections configured`}
            </p>
          </div>

          <div className="w-full sm:w-44 bg-black/60 rounded-full h-2.5 border border-white/10 overflow-hidden shrink-0">
            <div
              className="bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
        </div>

        {/* ── Error Banner ── */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-200 flex items-start gap-3 animate-in shake">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-xs text-red-300">Validation Notice</div>
              <p className="text-[11px] leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* ── Main Edit Form ── */}
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* ── SECTION 1: PERSONAL INFORMATION ── */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/10 pb-2.5 flex items-center gap-2 font-mono">
              <User className="w-4 h-4" /> 1. Personal &amp; Contact Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div id="edit-field-fullName" className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your complete official name"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-black/80 border text-white font-medium focus:outline-none transition-all ${
                    highlightedFieldId === 'edit-field-fullName'
                      ? 'border-red-500 ring-2 ring-red-500/40'
                      : 'border-white/15 focus:border-cyan-400'
                  }`}
                />
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Email Address (Read-Only Authentication Identity) */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5 text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Account Identity Email
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    <Lock className="w-3 h-3" /> Verified Auth Account (Read-Only)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={talentProfile?.email || ''}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 font-mono cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Your email is locked to your authenticated session to ensure security and prevent identity disruption.
                </p>
              </div>

              {/* Phone / WhatsApp */}
              <div id="edit-field-phone" className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">WhatsApp / Phone Number *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-16 px-2.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-cyan-300 font-bold text-center focus:outline-none"
                  />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-black/80 border text-white font-mono focus:outline-none transition-all ${
                      highlightedFieldId === 'edit-field-phone'
                        ? 'border-red-500 ring-2 ring-red-500/40'
                        : 'border-white/15 focus:border-cyan-400'
                    }`}
                  />
                </div>
              </div>

              {/* Preferred Contact Channel */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">Preferred Contact Channel</label>
                <select
                  value={preferredContact}
                  onChange={(e) => setPreferredContact(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Telegram">Telegram</option>
                </select>
              </div>

              {/* State */}
              <div id="edit-field-state" className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">State / UT *</label>
                {indianStates.length > 0 ? (
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">Select State</option>
                    {indianStates.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Odisha, Karnataka"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                  />
                )}
              </div>

              {/* City / District */}
              <div id="edit-field-city" className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">City / District *</label>
                <input
                  type="text"
                  value={cityDistrict}
                  onChange={(e) => setCityDistrict(e.target.value)}
                  placeholder="e.g. Bhubaneswar, Bangalore"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 2: PROFESSIONAL ROLE & CAPABILITIES ── */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-white/10 pb-2.5 flex items-center gap-2 font-mono">
              <Briefcase className="w-4 h-4" /> 2. Professional Role &amp; Availability
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Primary Role */}
              <div id="edit-field-role" className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">Primary Contributor Role *</label>
                <select
                  value={primaryRole}
                  onChange={(e) => setPrimaryRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  {(availableRoles.length > 0
                    ? availableRoles
                    : [
                        'Individual Participant',
                        'Coordinator',
                        'Speaker Recruiter',
                        'Singer / Vocal Artist',
                        'Recording Team',
                        'Field Agent',
                        'Vendor / Agency',
                        'Community / Organization',
                        'Other',
                      ]
                  ).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">Availability Timeframe</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Immediately">Immediately</option>
                  <option value="Within 1–3 days">Within 1–3 days</option>
                  <option value="Within 1 week">Within 1 week</option>
                  <option value="More than 1 week">More than 1 week</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>

              {/* Working Preference */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">Working Preference</label>
                <select
                  value={workingPreference}
                  onChange={(e) => setWorkingPreference(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Project Basis">Project Basis</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>

              {/* Previous AI Data Task Experience */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">Previous AI Data Task Experience</label>
                <select
                  value={hasPreviousExperience ? 'true' : 'false'}
                  onChange={(e) => setHasPreviousExperience(e.target.value === 'true')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="true">Yes, I have prior experience</option>
                  <option value="false">No, I am new to AI data projects</option>
                </select>
              </div>
            </div>

            {/* Dynamic Role-Specific Fields */}
            {primaryRole === 'Coordinator' && (
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Coordination Capacity:</label>
                  <input
                    type="text"
                    placeholder="e.g. 50–100 participants"
                    value={roleDetails.coordCapacity || ''}
                    onChange={(e) => setRoleDetails({ ...roleDetails, coordCapacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Regional Coverage:</label>
                  <input
                    type="text"
                    placeholder="e.g. Odisha, Andhra Pradesh"
                    value={roleDetails.coordCoverage || ''}
                    onChange={(e) => setRoleDetails({ ...roleDetails, coordCoverage: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs"
                  />
                </div>
              </div>
            )}

            {primaryRole === 'Speaker Recruiter' && (
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Recruiter Capacity:</label>
                  <input
                    type="text"
                    placeholder="e.g. 100+ native speakers"
                    value={roleDetails.recruiterCapacity || ''}
                    onChange={(e) => setRoleDetails({ ...roleDetails, recruiterCapacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Recruitment Timeline:</label>
                  <input
                    type="text"
                    placeholder="e.g. 50 speakers in 3 days"
                    value={roleDetails.recruiterTimeline || ''}
                    onChange={(e) => setRoleDetails({ ...roleDetails, recruiterTimeline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* Work Capabilities Grid */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-slate-300 font-bold block text-[11px]">
                Work Capabilities ({workCapabilities.length} Selected)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-3 rounded-2xl bg-black/50 border border-white/10">
                {(availableCapabilities.length > 0
                  ? availableCapabilities
                  : [
                      'Voice / Audio Recording',
                      'Speech Data Collection',
                      'Video Recording',
                      'Image Collection',
                      'Text Data Collection',
                      'Transcription',
                      'Translation / Localization',
                      'Data Annotation / Labeling',
                      'AI / LLM Evaluation',
                      'Human Feedback / RLHF',
                      'Search Relevance',
                      'OCR / Document Data',
                      'Field Data Collection',
                      'Participant Recruitment',
                      'Singing / Vocal Recording',
                      'Other',
                    ]
                ).map((cap) => {
                  const isSelected = workCapabilities.includes(cap);
                  return (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => handleToggleCapability(cap)}
                      className={`p-2 rounded-xl border text-left font-medium transition-all flex items-center justify-between cursor-pointer text-[11px] ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{cap}</span>
                      {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── SECTION 3: CONFIGURED LANGUAGES ── */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                <Globe className="w-4 h-4" /> 3. Configured Languages &amp; Proficiency ({formLanguages.length})
              </h4>
              <button
                type="button"
                onClick={handleAddLanguageRow}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border border-emerald-500/40 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Language
              </button>
            </div>

            {formLanguages.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                No languages currently configured. Click <strong>"Add Language"</strong> above to attach languages to your profile.
              </div>
            ) : (
              <div className="space-y-3">
                {formLanguages.map((l, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 relative shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-1">Language Name *</label>
                        {supportedLanguagesList.length > 0 ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              list={`lang-list-${idx}`}
                              placeholder="e.g. Odia, Hindi, Kui, Santali, Bengali"
                              value={l.language}
                              onChange={(e) => handleUpdateLanguageField(idx, 'language', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-emerald-400"
                            />
                            <datalist id={`lang-list-${idx}`}>
                              {supportedLanguagesList.map((sl) => (
                                <option key={sl} value={sl} />
                              ))}
                            </datalist>
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="e.g. Odia, Hindi, English"
                            value={l.language}
                            onChange={(e) => handleUpdateLanguageField(idx, 'language', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-emerald-400"
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLanguageRow(idx)}
                        className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors shrink-0 mt-4 cursor-pointer"
                        title="Remove language"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Proficiency:</label>
                        <select
                          value={l.proficiency}
                          onChange={(e) => handleUpdateLanguageField(idx, 'proficiency', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-black border border-white/15 text-white text-[11px]"
                        >
                          <option value="Native">Native</option>
                          <option value="Fluent">Fluent</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Intermediate">Intermediate</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Speaker Availability:</label>
                        <select
                          value={l.speaker_availability}
                          onChange={(e) => handleUpdateLanguageField(idx, 'speaker_availability', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-black border border-white/15 text-white text-[11px]"
                        >
                          <option value="I am a native speaker">I am a native speaker</option>
                          <option value="I can arrange native speakers">I can arrange native speakers</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Arranged Capacity (Speakers):</label>
                        <input
                          type="number"
                          min="1"
                          value={l.capacity}
                          onChange={(e) => handleUpdateLanguageField(idx, 'capacity', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-black border border-white/15 text-emerald-300 font-bold text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── SECTION 4: EXPERIENCE RECORDS ── */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                <Award className="w-4 h-4" /> 4. Experience Records ({formExperiences.length})
              </h4>
              <button
                type="button"
                onClick={handleAddExperienceRow}
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border border-purple-500/40 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience Record
              </button>
            </div>

            {formExperiences.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">
                No past project experiences listed. Click <strong>"Add Experience Record"</strong> if you have prior AI / data experience.
              </p>
            ) : (
              <div className="space-y-3">
                {formExperiences.map((exp, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">Record #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExperienceRow(idx)}
                        className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors cursor-pointer"
                        title="Remove experience"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Project / Company Name"
                        value={exp.projectName}
                        onChange={(e) => handleUpdateExperienceField(idx, 'projectName', e.target.value)}
                        className="px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Type of Work (e.g. Speech Recording, Annotation)"
                        value={exp.typeOfWork}
                        onChange={(e) => handleUpdateExperienceField(idx, 'typeOfWork', e.target.value)}
                        className="px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Languages Used"
                        value={exp.languagesUsed}
                        onChange={(e) => handleUpdateExperienceField(idx, 'languagesUsed', e.target.value)}
                        className="px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Duration / Work Volume"
                        value={exp.duration}
                        onChange={(e) => handleUpdateExperienceField(idx, 'duration', e.target.value)}
                        className="px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs"
                      />
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Briefly describe your responsibilities and volume delivered..."
                      value={exp.description}
                      onChange={(e) => handleUpdateExperienceField(idx, 'description', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── SECTION 5: EQUIPMENT & RESOURCES ── */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-white/10 pb-2.5 flex items-center gap-2 font-mono">
              <Cpu className="w-4 h-4" /> 5. Equipment &amp; Technical Environment
            </h4>

            {/* Equipment Available */}
            <div className="space-y-2">
              <label className="text-slate-300 font-bold block text-[11px]">
                Equipment Available ({equipmentList.length} Selected)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(availableEquipment.length > 0
                  ? availableEquipment
                  : [
                      'Smartphone',
                      'Professional Microphone',
                      'USB Microphone',
                      'Headphones',
                      'Camera',
                      'Laptop/Desktop',
                      'Recording Studio',
                      'Quiet Recording Environment',
                    ]
                ).map((eq) => {
                  const isSelected = equipmentList.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => handleToggleEquipment(eq)}
                      className={`p-2 rounded-xl border text-left font-medium transition-all flex items-center justify-between cursor-pointer text-[11px] ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{eq}</span>
                      {isSelected && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Recording Environment */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">Recording Environment</label>
                <select
                  value={recordingEnvironment}
                  onChange={(e) => setRecordingEnvironment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                >
                  {(availableEnvironments.length > 0
                    ? availableEnvironments
                    : ['Professional Studio', 'Quiet Home/Room', 'Office', 'Outdoor', 'Other']
                  ).map((env) => (
                    <option key={env} value={env}>
                      {env}
                    </option>
                  ))}
                </select>
              </div>

              {/* Internet Quality */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-[11px]">Internet Quality</label>
                <select
                  value={internetQuality}
                  onChange={(e) => setInternetQuality(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                >
                  {(availableInternetQualities.length > 0
                    ? availableInternetQualities
                    : [
                        'Good (High speed / Broadband)',
                        'Average (Stable 4G/Mobile)',
                        'Limited',
                      ]
                  ).map((iq) => (
                    <option key={iq} value={iq}>
                      {iq}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── SECTION 6: REGISTRATION DETAILS (READ-ONLY) ── */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-3 shadow-xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2 font-mono">
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> 6. Protected System Credentials (Read-Only)
            </h4>


            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[9px] font-mono">Registration Code</span>
                <p className="font-mono font-bold text-cyan-300 mt-0.5 truncate">
                  {talentProfile?.registration_code || '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[9px] font-mono">Registration Date</span>
                <p className="font-medium text-slate-300 mt-0.5">
                  {talentProfile?.created_at ? new Date(talentProfile.created_at).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[9px] font-mono">Account Status</span>
                <p className="font-medium text-emerald-300 capitalize mt-0.5">
                  {talentProfile?.status || 'Active'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[9px] font-mono">Profile Mode</span>
                <p className="font-medium text-slate-300 mt-0.5">Self-Service Enabled</p>
              </div>
            </div>
          </div>

          {/* ── Action Footer ── */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-white/10 sticky bottom-0 bg-[#090d16]/95 backdrop-blur-md pb-2 -mx-4 px-4 sm:-mx-8 sm:px-8">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-black" />
              <span>{isSaving ? 'Saving Profile Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>

        {/* ── Unsaved Changes Confirmation Modal ── */}
        {showUnsavedPrompt && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#0e1320] border border-amber-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
                <h4 className="text-base font-bold text-white font-display">Unsaved Changes</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                You have modified information that hasn't been saved yet. If you exit now, your profile edits will be discarded.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUnsavedPrompt(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedPrompt(false);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs cursor-pointer"
                >
                  Discard &amp; Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
