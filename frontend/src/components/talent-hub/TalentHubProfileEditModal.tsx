import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Cloud,
  FileText,
  Monitor,
  Camera,
  Lightbulb,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';
import { talentHubApi } from '../../services/talentHubApi';

interface TalentHubProfileEditModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

type SectionKey = 'personal' | 'professional' | 'languages' | 'experience' | 'equipment';

interface SectionDef {
  key: SectionKey;
  number: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: SectionDef[] = [
  {
    key: 'personal',
    number: 1,
    title: 'Personal Information',
    subtitle: 'Basic details & contact info',
    icon: User,
  },
  {
    key: 'professional',
    number: 2,
    title: 'Professional Information',
    subtitle: 'Role, skills & availability',
    icon: Briefcase,
  },
  {
    key: 'languages',
    number: 3,
    title: 'Languages',
    subtitle: 'Languages you speak',
    icon: Globe,
  },
  {
    key: 'experience',
    number: 4,
    title: 'Experience Records',
    subtitle: 'Past work experience',
    icon: FileText,
  },
  {
    key: 'equipment',
    number: 5,
    title: 'Equipment & Resources',
    subtitle: 'Your setup & environment',
    icon: Monitor,
  },
];

export const TalentHubProfileEditModal: React.FC<TalentHubProfileEditModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { user, talentProfile, languages, experiences, token, updateProfile } = useTalentHubAuth();
  const [isMounted, setIsMounted] = useState(false);

  // Lock body scroll and mount portal
  useEffect(() => {
    setIsMounted(true);
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Active section state
  const [activeSection, setActiveSection] = useState<SectionKey>('personal');

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
  const [isDraftRestored, setIsDraftRestored] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Storage key for device draft caching
  const draftStorageKey = useMemo(() => {
    const uid = user?.id || talentProfile?.id || 'contributor';
    return `zenemoo_talent_profile_draft_${uid}`;
  }, [user?.id, talentProfile?.id]);

  // Load Form Config (dynamic questions, supported languages, options)
  useEffect(() => {
    let isMountedLocal = true;
    const fetchConfig = async () => {
      setIsLoadingConfig(true);
      try {
        if (token) {
          const res = await talentHubApi.getProfileFormConfig(token);
          if (res?.success && isMountedLocal) {
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
        if (isMountedLocal) setIsLoadingConfig(false);
      }
    };
    fetchConfig();
    return () => {
      isMountedLocal = false;
    };
  }, [token]);

  // Restore Draft on initial mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(draftStorageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          if (parsed.fullName !== undefined) setFullName(parsed.fullName);
          if (parsed.gender !== undefined) setGender(parsed.gender);
          if (parsed.phone !== undefined) setPhone(parsed.phone);
          if (parsed.countryCode !== undefined) setCountryCode(parsed.countryCode);
          if (parsed.state !== undefined) setState(parsed.state);
          if (parsed.cityDistrict !== undefined) setCityDistrict(parsed.cityDistrict);
          if (parsed.preferredContact !== undefined) setPreferredContact(parsed.preferredContact);
          if (parsed.primaryRole !== undefined) setPrimaryRole(parsed.primaryRole);
          if (parsed.roleDetails !== undefined) setRoleDetails(parsed.roleDetails);
          if (parsed.availability !== undefined) setAvailability(parsed.availability);
          if (parsed.workingPreference !== undefined) setWorkingPreference(parsed.workingPreference);
          if (parsed.hasPreviousExperience !== undefined) setHasPreviousExperience(parsed.hasPreviousExperience);
          if (Array.isArray(parsed.workCapabilities)) setWorkCapabilities(parsed.workCapabilities);
          if (parsed.additionalInfo !== undefined) setAdditionalInfo(parsed.additionalInfo);
          if (Array.isArray(parsed.equipmentList)) setEquipmentList(parsed.equipmentList);
          if (parsed.recordingEnvironment !== undefined) setRecordingEnvironment(parsed.recordingEnvironment);
          if (parsed.internetQuality !== undefined) setInternetQuality(parsed.internetQuality);
          if (parsed.equipmentDetails !== undefined) setEquipmentDetails(parsed.equipmentDetails);
          if (Array.isArray(parsed.formLanguages)) setFormLanguages(parsed.formLanguages);
          if (Array.isArray(parsed.formExperiences)) setFormExperiences(parsed.formExperiences);
          if (parsed.activeSection && SECTIONS.some((s) => s.key === parsed.activeSection)) {
            setActiveSection(parsed.activeSection);
          }
          setIsDraftRestored(true);
          setHasUnsavedChanges(true);
        }
      }
    } catch (e) {
      console.warn('Failed to restore profile draft from localStorage:', e);
    }
  }, [draftStorageKey]);

  // Sync draft to localStorage when values change
  const saveDraftToStorage = useCallback(() => {
    try {
      const draftPayload = {
        fullName,
        gender,
        phone,
        countryCode,
        state,
        cityDistrict,
        preferredContact,
        primaryRole,
        roleDetails,
        availability,
        workingPreference,
        hasPreviousExperience,
        workCapabilities,
        additionalInfo,
        equipmentList,
        recordingEnvironment,
        internetQuality,
        equipmentDetails,
        formLanguages,
        formExperiences,
        activeSection,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftStorageKey, JSON.stringify(draftPayload));
      setHasUnsavedChanges(true);
    } catch (e) {
      console.warn('Failed to save profile draft to localStorage:', e);
    }
  }, [
    draftStorageKey,
    fullName,
    gender,
    phone,
    countryCode,
    state,
    cityDistrict,
    preferredContact,
    primaryRole,
    roleDetails,
    availability,
    workingPreference,
    hasPreviousExperience,
    workCapabilities,
    additionalInfo,
    equipmentList,
    recordingEnvironment,
    internetQuality,
    equipmentDetails,
    formLanguages,
    formExperiences,
    activeSection,
  ]);

  // Trigger draft save on edits
  useEffect(() => {
    saveDraftToStorage();
  }, [saveDraftToStorage]);

  // Calculate Profile Completeness (Dynamic from current state)
  const completeness = useMemo(() => {
    let totalScore = 0;
    const maxScore = 7;

    if (fullName.trim()) totalScore += 1;
    if (phone.trim()) totalScore += 1;
    if (state.trim() && cityDistrict.trim()) totalScore += 1;
    if (primaryRole.trim()) totalScore += 1;
    if (formLanguages.some((l) => l.language && l.language.trim())) totalScore += 1;
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

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const handleDiscardChanges = () => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch (e) {
      // ignore
    }
    setShowUnsavedPrompt(false);
    onClose();
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

  const triggerValidationError = (message: string, fieldId?: string, targetSection?: SectionKey) => {
    setErrorMsg(message);
    if (targetSection) {
      setActiveSection(targetSection);
    }
    if (fieldId) {
      setHighlightedFieldId(fieldId);
      setTimeout(() => setHighlightedFieldId(null), 3500);
      setTimeout(() => {
        const el = document.getElementById(fieldId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // Submit Profile Edits
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      return triggerValidationError('Full Name is required.', 'edit-field-fullName', 'personal');
    }
    if (!phone.trim()) {
      return triggerValidationError('Phone number is required.', 'edit-field-phone', 'personal');
    }
    if (!state.trim()) {
      return triggerValidationError('State is required.', 'edit-field-state', 'personal');
    }
    if (!cityDistrict.trim()) {
      return triggerValidationError('City / District is required.', 'edit-field-city', 'personal');
    }
    if (!primaryRole.trim()) {
      return triggerValidationError('Primary Role is required.', 'edit-field-role', 'professional');
    }

    const validLanguages = formLanguages.filter((l) => l.language && l.language.trim() !== '');
    if (validLanguages.length === 0) {
      return triggerValidationError(
        'Please configure at least one language for your contributor profile.',
        undefined,
        'languages'
      );
    }

    // Validate dynamic required questions
    for (const q of dynamicQuestions) {
      if (q.is_required && q.status !== 'inactive') {
        const key = q.field_key || q.id;
        const val = additionalInfo[key];
        if (
          val === undefined ||
          val === null ||
          (typeof val === 'string' && !val.trim()) ||
          (Array.isArray(val) && val.length === 0)
        ) {
          return triggerValidationError(`Required field missing: "${q.label}"`, `edit-dynamic-${key}`, 'personal');
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
        // Clear local storage draft on successful save
        try {
          localStorage.removeItem(draftStorageKey);
        } catch (err) {
          // ignore
        }
        setHasUnsavedChanges(false);
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

  const displayName =
    fullName.trim() ||
    talentProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    'Zenemoo Contributor';

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const registrationCode = talentProfile?.registration_code || 'ZEN-CONTRIBUTOR';

  if (!isMounted || typeof document === 'undefined') {
    return null;
  }

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-[#060911] flex flex-col h-screen w-screen overflow-hidden text-slate-200 antialiased">
      {/* ── Top Workspace Header (Fixed, zero gap from viewport top) ── */}
      <header className="shrink-0 bg-[#080d1a] border-b border-white/10 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between shadow-2xl z-50">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg lg:text-xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
              <span>Edit Your Profile</span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Keep your information updated to get better opportunities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-mono">
            <Cloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>All changes sync with your record</span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer"
            title="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Mobile Horizontal Section Scroller (Mobile only) ── */}
      <div className="lg:hidden bg-[#0a0f1d] border-b border-white/10 px-3 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.key;
          return (
            <button
              key={sec.key}
              type="button"
              onClick={() => setActiveSection(sec.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                  isActive ? 'bg-cyan-400 text-black' : 'bg-white/10 text-slate-300'
                }`}
              >
                {sec.number}
              </span>
              <span>{sec.title}</span>
            </button>
          );
        })}
      </div>

      {/* ── Main Scrollable Body (Scrolls seamlessly between Header and Footer) ── */}
      <main className="flex-1 overflow-y-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto flex flex-col min-h-full">
          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-200 flex items-start gap-3 animate-in shake shrink-0">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-xs text-red-300">Validation Notice</div>
                <p className="text-xs leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* 3-Column Desktop Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch flex-1">
            {/* ══════════════════════════════════════════════════════ */}
            {/* ── COLUMN 1: LEFT SECTION NAVIGATION (Desktop) ── */}
            {/* ══════════════════════════════════════════════════════ */}
            <aside className="hidden lg:flex lg:col-span-3 flex-col justify-between gap-3.5 h-full">
              <div className="p-3 rounded-2xl bg-[#090e1b] border border-white/10 shadow-xl space-y-1">
                {SECTIONS.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.key;
                  return (
                    <button
                      key={sec.key}
                      type="button"
                      onClick={() => setActiveSection(sec.key)}
                      className={`w-full p-3 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500/15 border border-cyan-500/40 text-white shadow-md'
                          : 'bg-transparent border border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-white/5 text-slate-400 group-hover:text-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`text-xs font-bold truncate ${
                              isActive ? 'text-cyan-300' : 'text-slate-200'
                            }`}
                          >
                            {sec.title}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">{sec.subtitle}</div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                          isActive
                            ? 'bg-cyan-400 text-black shadow-sm'
                            : 'bg-white/5 text-slate-400 group-hover:bg-white/10'
                        }`}
                      >
                        {sec.number}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Need Help? Card (Pinned neatly to bottom of left column) */}
              <div className="p-3.5 rounded-2xl bg-[#090e1b] border border-white/10 shadow-xl space-y-2.5 mt-auto">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Need Help?</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Facing any issues? Contact Zenemoo Support anytime.</p>
                  </div>
                </div>
                <a
                  href="mailto:support@zenemoo.com?subject=Talent%20Hub%20Profile%20Assistance"
                  className="w-full py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact Support</span>
                </a>
              </div>
            </aside>

            {/* ══════════════════════════════════════════════════════ */}
            {/* ── COLUMN 2: MAIN FORM AREA (Center) ── */}
            {/* ══════════════════════════════════════════════════════ */}
            <section className="lg:col-span-6 flex flex-col h-full">
              {/* ── SECTION 1: PERSONAL INFORMATION ── */}
              {activeSection === 'personal' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-[#090e1b] border border-white/10 shadow-2xl flex flex-col justify-between h-full min-h-[480px] animate-in fade-in">
                  <div className="space-y-4 sm:space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/10 pb-3">
                      <h2 className="text-xs sm:text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                        <User className="w-4 h-4 text-cyan-400" /> 1. Personal &amp; Contact Details
                      </h2>
                      <span className="text-[11px] text-slate-400">Update your basic information and contact preferences.</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      {/* Full Name */}
                      <div id="edit-field-fullName" className="space-y-1">
                        <label className="text-slate-300 font-bold block text-xs">Full Name *</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your complete official name"
                          className={`w-full px-3.5 py-2 rounded-xl bg-black/80 border text-white font-medium text-xs focus:outline-none transition-all ${
                            highlightedFieldId === 'edit-field-fullName'
                              ? 'border-red-500 ring-2 ring-red-500/40'
                              : 'border-white/15 focus:border-cyan-400'
                          }`}
                        />
                      </div>

                      {/* Gender */}
                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold block text-xs">Gender *</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Email Address (Read-Only Authentication Identity) */}
                      <div className="space-y-1 sm:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-slate-300 font-bold flex items-center gap-1.5 text-xs">
                            <Mail className="w-3.5 h-3.5 text-slate-400" /> Account Identity Email
                          </label>
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" /> Verified Auth Account (Read-Only)
                          </span>
                        </div>
                        <input
                          type="email"
                          value={talentProfile?.email || user?.email || ''}
                          disabled
                          className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 font-mono text-xs cursor-not-allowed select-none"
                        />
                        <p className="text-[10px] text-slate-500">
                          Your email is locked to your authenticated session to ensure security and prevent identity disruption.
                        </p>
                      </div>

                      {/* Phone / WhatsApp */}
                      <div id="edit-field-phone" className="space-y-1">
                        <label className="text-slate-300 font-bold block text-xs">WhatsApp / Phone Number *</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="w-16 px-2 py-2 rounded-xl bg-black/80 border border-white/15 text-cyan-300 font-bold text-center text-xs focus:outline-none"
                          />
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="10-digit mobile number"
                            className={`w-full px-3.5 py-2 rounded-xl bg-black/80 border text-white font-mono text-xs focus:outline-none transition-all ${
                              highlightedFieldId === 'edit-field-phone'
                                ? 'border-red-500 ring-2 ring-red-500/40'
                                : 'border-white/15 focus:border-cyan-400'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Preferred Contact Channel */}
                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold block text-xs">Preferred Contact Channel *</label>
                        <select
                          value={preferredContact}
                          onChange={(e) => setPreferredContact(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                        >
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Email">Email</option>
                          <option value="Phone Call">Phone Call</option>
                          <option value="Telegram">Telegram</option>
                        </select>
                      </div>

                      {/* State */}
                      <div id="edit-field-state" className="space-y-1">
                        <label className="text-slate-300 font-bold block text-xs">State / UT *</label>
                        {indianStates.length > 0 ? (
                          <select
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
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
                            className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                          />
                        )}
                      </div>

                      {/* City / District */}
                      <div id="edit-field-city" className="space-y-1">
                        <label className="text-slate-300 font-bold block text-xs">City / District *</label>
                        <input
                          type="text"
                          value={cityDistrict}
                          onChange={(e) => setCityDistrict(e.target.value)}
                          placeholder="e.g. Bhubaneswar, Bangalore"
                          className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      {/* How did you hear about Zenemoo */}
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-slate-300 font-bold block text-xs">
                          How did you hear about Zenemoo? (Optional)
                        </label>
                        <select
                          value={additionalInfo.hear_about_zenemoo || ''}
                          onChange={(e) =>
                            setAdditionalInfo({ ...additionalInfo, hear_about_zenemoo: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                        >
                          <option value="">Select an option</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Instagram">Instagram / Social Media</option>
                          <option value="Friend / Referral">Friend or Colleague Referral</option>
                          <option value="WhatsApp Group">WhatsApp / Telegram Community</option>
                          <option value="Google Search">Google / Web Search</option>
                          <option value="College / University">College / Campus Event</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Additional Notes */}
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-slate-300 font-bold block text-xs">
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={additionalInfo.additional_notes || ''}
                          onChange={(e) =>
                            setAdditionalInfo({ ...additionalInfo, additional_notes: e.target.value })
                          }
                          placeholder="Tell us something about yourself..."
                          className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      {/* Dynamic Questions if any */}
                      {dynamicQuestions.map((q) => {
                        const key = q.field_key || q.id;
                        return (
                          <div key={key} id={`edit-dynamic-${key}`} className="space-y-1 sm:col-span-2">
                            <label className="text-slate-300 font-bold block text-xs">
                              {q.label} {q.is_required ? '*' : '(Optional)'}
                            </label>
                            {q.question_type === 'textarea' ? (
                              <textarea
                                rows={2}
                                value={additionalInfo[key] || ''}
                                onChange={(e) =>
                                  setAdditionalInfo({ ...additionalInfo, [key]: e.target.value })
                                }
                                className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                              />
                            ) : q.question_type === 'select' && Array.isArray(q.options) ? (
                              <select
                                value={additionalInfo[key] || ''}
                                onChange={(e) =>
                                  setAdditionalInfo({ ...additionalInfo, [key]: e.target.value })
                                }
                                className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                              >
                                <option value="">Select an option</option>
                                {q.options.map((opt: any) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={additionalInfo[key] || ''}
                                onChange={(e) =>
                                  setAdditionalInfo({ ...additionalInfo, [key]: e.target.value })
                                }
                                className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step navigation */}
                  <div className="pt-3.5 mt-4 border-t border-white/10 flex justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveSection('professional')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <span>Next: Professional Information</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── SECTION 2: PROFESSIONAL INFORMATION ── */}
              {activeSection === 'professional' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-[#090e1b] border border-white/10 shadow-2xl flex flex-col justify-between h-full min-h-[480px] animate-in fade-in">
                  <div className="space-y-4 sm:space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/10 pb-3">
                      <h2 className="text-xs sm:text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                        <Briefcase className="w-4 h-4 text-blue-400" /> 2. Professional Role &amp; Availability
                      </h2>
                      <span className="text-[11px] text-slate-400">Configure your primary contributor profile.</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      {/* Primary Role */}
                      <div id="edit-field-role" className="space-y-1">
                        <label className="text-slate-300 font-bold block text-xs">Primary Contributor Role *</label>
                        <select
                          value={primaryRole}
                          onChange={(e) => setPrimaryRole(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
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
                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold block text-xs">Availability Timeframe</label>
                        <select
                          value={availability}
                          onChange={(e) => setAvailability(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                        >
                          <option value="Immediately">Immediately</option>
                          <option value="Within 1–3 days">Within 1–3 days</option>
                          <option value="Within 1 week">Within 1 week</option>
                          <option value="More than 1 week">More than 1 week</option>
                          <option value="Flexible">Flexible</option>
                        </select>
                      </div>

                      {/* Working Preference */}
                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold block text-xs">Working Preference</label>
                        <select
                          value={workingPreference}
                          onChange={(e) => setWorkingPreference(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                        >
                          <option value="Project Basis">Project Basis</option>
                          <option value="Part Time">Part Time</option>
                          <option value="Full Time">Full Time</option>
                          <option value="Flexible">Flexible</option>
                        </select>
                      </div>

                      {/* Previous AI Experience */}
                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold block text-xs">Previous AI Data Task Experience</label>
                        <select
                          value={hasPreviousExperience ? 'true' : 'false'}
                          onChange={(e) => setHasPreviousExperience(e.target.value === 'true')}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                        >
                          <option value="true">Yes, I have prior experience</option>
                          <option value="false">No, I am new to AI data projects</option>
                        </select>
                      </div>
                    </div>

                    {/* Dynamic Role-Specific Fields */}
                    {primaryRole === 'Coordinator' && (
                      <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-medium">Coordination Capacity:</label>
                          <input
                            type="text"
                            placeholder="e.g. 50–100 participants"
                            value={roleDetails.coordCapacity || ''}
                            onChange={(e) => setRoleDetails({ ...roleDetails, coordCapacity: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-medium">Regional Coverage:</label>
                          <input
                            type="text"
                            placeholder="e.g. Odisha, Andhra Pradesh"
                            value={roleDetails.coordCoverage || ''}
                            onChange={(e) => setRoleDetails({ ...roleDetails, coordCoverage: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-cyan-400"
                          />
                        </div>
                      </div>
                    )}

                    {primaryRole === 'Speaker Recruiter' && (
                      <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-medium">Recruiter Capacity:</label>
                          <input
                            type="text"
                            placeholder="e.g. 100+ native speakers"
                            value={roleDetails.recruiterCapacity || ''}
                            onChange={(e) => setRoleDetails({ ...roleDetails, recruiterCapacity: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-medium">Recruitment Timeline:</label>
                          <input
                            type="text"
                            placeholder="e.g. 50 speakers in 3 days"
                            value={roleDetails.recruiterTimeline || ''}
                            onChange={(e) => setRoleDetails({ ...roleDetails, recruiterTimeline: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-cyan-400"
                          />
                        </div>
                      </div>
                    )}

                    {/* Work Capabilities Grid */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <label className="text-slate-300 font-bold block text-xs">
                        Work Capabilities ({workCapabilities.length} Selected)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-2.5 rounded-2xl bg-black/50 border border-white/10">
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
                              {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Step navigation */}
                  <div className="pt-3.5 mt-4 border-t border-white/10 flex items-center justify-between shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveSection('personal')}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back: Personal Info</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('languages')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <span>Next: Languages</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── SECTION 3: LANGUAGES ── */}
              {activeSection === 'languages' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-[#090e1b] border border-white/10 shadow-2xl flex flex-col justify-between h-full min-h-[480px] animate-in fade-in">
                  <div className="space-y-4 sm:space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <h2 className="text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                          <Globe className="w-4 h-4 text-emerald-400" /> 3. Configured Languages &amp; Proficiency ({formLanguages.length})
                        </h2>
                        <span className="text-[11px] text-slate-400">Add all the languages you speak or can recruit speakers for.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddLanguageRow}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-emerald-500/40 transition-all shrink-0 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Language
                      </button>
                    </div>

                    {formLanguages.length === 0 ? (
                      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center space-y-2">
                        <p>No languages currently configured.</p>
                        <button
                          type="button"
                          onClick={handleAddLanguageRow}
                          className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold border border-amber-500/40 cursor-pointer"
                        >
                          + Add Your Primary Language
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {formLanguages.map((l, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 sm:p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 relative shadow-md"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1">
                                <label className="text-xs text-slate-300 font-bold block mb-1">
                                  Language Name *
                                </label>
                                {supportedLanguagesList.length > 0 ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      list={`lang-list-${idx}`}
                                      placeholder="e.g. Odia, Hindi, Kui, Santali, Bengali"
                                      value={l.language}
                                      onChange={(e) => handleUpdateLanguageField(idx, 'language', e.target.value)}
                                      className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-emerald-400"
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
                                    className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-emerald-400"
                                  />
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveLanguageRow(idx)}
                                className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors shrink-0 mt-5 cursor-pointer"
                                title="Remove language"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-medium">Proficiency:</label>
                                <select
                                  value={l.proficiency}
                                  onChange={(e) => handleUpdateLanguageField(idx, 'proficiency', e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-black border border-white/15 text-white text-xs"
                                >
                                  <option value="Native">Native</option>
                                  <option value="Fluent">Fluent</option>
                                  <option value="Advanced">Advanced</option>
                                  <option value="Intermediate">Intermediate</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-medium">Speaker Availability:</label>
                                <select
                                  value={l.speaker_availability}
                                  onChange={(e) => handleUpdateLanguageField(idx, 'speaker_availability', e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-black border border-white/15 text-white text-xs"
                                >
                                  <option value="I am a native speaker">I am a native speaker</option>
                                  <option value="I can arrange native speakers">I can arrange native speakers</option>
                                  <option value="Both">Both</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-medium">Arranged Capacity:</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={l.capacity}
                                  onChange={(e) => handleUpdateLanguageField(idx, 'capacity', Number(e.target.value))}
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-black border border-white/15 text-emerald-300 font-bold text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step navigation */}
                  <div className="pt-3.5 mt-4 border-t border-white/10 flex items-center justify-between shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveSection('professional')}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back: Professional</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('experience')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <span>Next: Experience Records</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── SECTION 4: EXPERIENCE RECORDS ── */}
              {activeSection === 'experience' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-[#090e1b] border border-white/10 shadow-2xl flex flex-col justify-between h-full min-h-[480px] animate-in fade-in">
                  <div className="space-y-4 sm:space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <h2 className="text-xs sm:text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                          <Award className="w-4 h-4 text-purple-400" /> 4. Experience Records ({formExperiences.length})
                        </h2>
                        <span className="text-[11px] text-slate-400">List past projects, speech recordings, or annotation work.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddExperienceRow}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-purple-500/40 transition-all shrink-0 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Experience Record
                      </button>
                    </div>

                    {formExperiences.length === 0 ? (
                      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 text-slate-400 text-xs text-center space-y-2">
                        <p>No past project experiences currently listed.</p>
                        <button
                          type="button"
                          onClick={handleAddExperienceRow}
                          className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 font-bold border border-purple-500/40 cursor-pointer"
                        >
                          + Add Past Project Experience
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {formExperiences.map((exp, idx) => (
                          <div key={idx} className="p-3.5 sm:p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 shadow-md">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center font-mono text-[10px]">
                                  {idx + 1}
                                </span>
                                <span>Record #{idx + 1}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveExperienceRow(idx)}
                                className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors cursor-pointer"
                                title="Remove experience"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-medium">Company / Project Name:</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Project Vani / AI Data Co"
                                  value={exp.projectName}
                                  onChange={(e) => handleUpdateExperienceField(idx, 'projectName', e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-purple-400"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-medium">Type of Work:</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Speech Recording, Audio Annotation"
                                  value={exp.typeOfWork}
                                  onChange={(e) => handleUpdateExperienceField(idx, 'typeOfWork', e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-purple-400"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-medium">Languages Used:</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Odia, Hindi"
                                  value={exp.languagesUsed}
                                  onChange={(e) => handleUpdateExperienceField(idx, 'languagesUsed', e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-purple-400"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-medium">Duration / Work Volume:</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 3 Months / 50 Hours"
                                  value={exp.duration}
                                  onChange={(e) => handleUpdateExperienceField(idx, 'duration', e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-purple-400"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-medium">Description (Optional):</label>
                              <textarea
                                rows={2}
                                placeholder="Briefly describe your responsibilities and volume delivered..."
                                value={exp.description}
                                onChange={(e) => handleUpdateExperienceField(idx, 'description', e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-purple-400"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step navigation */}
                  <div className="pt-3.5 mt-4 border-t border-white/10 flex items-center justify-between shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveSection('languages')}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back: Languages</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('equipment')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <span>Next: Equipment &amp; Resources</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── SECTION 5: EQUIPMENT & RESOURCES ── */}
              {activeSection === 'equipment' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-[#090e1b] border border-white/10 shadow-2xl flex flex-col justify-between h-full min-h-[480px] animate-in fade-in">
                  <div className="space-y-4 sm:space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/10 pb-3">
                      <h2 className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                        <Monitor className="w-4 h-4 text-amber-400" /> 5. Equipment &amp; Technical Setup
                      </h2>
                      <span className="text-[11px] text-slate-400">Your hardware, environment, and network connectivity.</span>
                    </div>

                    {/* Available Equipment Multi-Select */}
                    <div className="space-y-2.5">
                      <label className="text-slate-300 font-bold block text-xs">
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
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      {/* Recording Environment */}
                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold block text-xs">Recording Environment</label>
                        <select
                          value={recordingEnvironment}
                          onChange={(e) => setRecordingEnvironment(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400"
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
                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold block text-xs">Internet Quality</label>
                        <select
                          value={internetQuality}
                          onChange={(e) => setInternetQuality(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400"
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

                    {/* Read-Only System Details Card */}
                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-mono font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Protected System Credentials (Read-Only)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-slate-500 uppercase text-[10px] font-mono block">Registration Code</span>
                          <span className="font-mono font-bold text-cyan-300 text-xs">{registrationCode}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase text-[10px] font-mono block">Account Status</span>
                          <span className="font-semibold text-emerald-300 capitalize text-xs">
                            {talentProfile?.status || 'Active'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase text-[10px] font-mono block">Profile Mode</span>
                          <span className="text-slate-300 text-xs">Self-Service Enabled</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step navigation */}
                  <div className="pt-3.5 mt-4 border-t border-white/10 flex items-center justify-between shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveSection('experience')}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back: Experience</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Saving...' : 'Finish & Save Profile'}</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* ══════════════════════════════════════════════════════ */}
            {/* ── COLUMN 3: RIGHT SIDEBAR (Desktop & Mobile) ── */}
            {/* ══════════════════════════════════════════════════════ */}
            <aside className="lg:col-span-3 flex flex-col justify-between gap-3.5 h-full">
              {/* Contributor Profile Card */}
              <div className="p-4 rounded-2xl bg-[#090e1b] border border-white/10 shadow-xl space-y-3 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-3.5">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 overflow-hidden flex items-center justify-center text-cyan-300 font-display font-extrabold text-lg shadow-md">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-md">
                      <Camera className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate font-display">{displayName}</h3>
                    <p className="text-xs font-mono font-bold text-cyan-400 mt-0.5">{registrationCode}</p>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-semibold">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Verified Contributor</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Completion Card */}
              <div className="p-4 rounded-2xl bg-[#090e1b] border border-cyan-500/20 shadow-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <span className="font-bold text-white text-xs">Profile Completion</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs">
                    {completeness.percent}%
                  </span>
                </div>

                <div className="w-full bg-black/60 rounded-full h-2 border border-white/10 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${completeness.percent}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {completeness.percent === 100
                    ? 'Your profile is 100% complete and ready for project allocation!'
                    : `${completeness.completed} of ${completeness.total} sections configured. Complete more to boost your match rate.`}
                </p>
              </div>

              {/* Quick Tips Card */}
              <div className="p-4 rounded-2xl bg-[#090e1b] border border-white/10 shadow-xl space-y-2.5 mt-auto">
                <div className="flex items-center gap-2 text-amber-400">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <h4 className="font-bold text-[11px] text-white uppercase tracking-wider font-mono">Quick Tips</h4>
                </div>

                <ul className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 text-sm leading-none">•</span>
                    <span>Keep your profile updated to get better opportunities.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 text-sm leading-none">•</span>
                    <span>Complete all sections for higher visibility with project managers.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 text-sm leading-none">•</span>
                    <span>Your information is secure and only used for genuine opportunities.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 text-sm leading-none">•</span>
                    <span>You can update your profile anytime without losing your contributor ID.</span>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* ── Fixed Bottom Action Bar (Non-overlapping, cleanly docked at footer) ── */}
      <footer className="shrink-0 bg-[#080d1a] border-t border-white/10 px-4 sm:px-6 lg:px-8 py-3 shadow-2xl z-50">
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-3">
          {/* Discard Button */}
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Discard Changes</span>
            <span className="sm:hidden">Discard</span>
          </button>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {isDraftRestored || hasUnsavedChanges ? (
              <span className="inline-flex items-center gap-1.5 text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="hidden md:inline">Draft saved on this device</span>
                <span className="md:hidden">Draft saved</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>No unsaved changes</span>
              </span>
            )}
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="px-5 sm:px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-black" />
            <span>
              {isSaving ? 'Saving...' : (
                <>
                  <span className="hidden sm:inline">Save Profile Changes</span>
                  <span className="sm:hidden">Save Changes</span>
                </>
              )}
            </span>
          </button>
        </div>
      </footer>

      {/* ── Unsaved Changes Confirmation Modal ── */}
      {showUnsavedPrompt && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0e1320] border border-amber-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-base font-bold text-white font-display">Unsaved Changes</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You have draft changes on this device that haven't been saved to your profile record yet. What would you like to do?
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
                onClick={handleDiscardChanges}
                className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs cursor-pointer"
              >
                Leave &amp; Discard Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
