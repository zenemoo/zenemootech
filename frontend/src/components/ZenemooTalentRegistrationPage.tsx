import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Languages,
  Briefcase,
  Award,
  Clock,
  Mic,
  FileText,
  Info,
  Building,
  Users,
  CheckSquare,
  Lock,
  Copy,
  Check,
  Search,
  X,
  Plus,
} from 'lucide-react';
import { talentRegistrationApi } from '../services/api';
import { SeoImage } from '../seo/components/SeoImage';
import { TurnstileWidget } from './TurnstileWidget';
import { ZenemooSupportPortalModal } from './ZenemooFooterModals';

interface ZenemooTalentRegistrationPageProps {
  onBack?: () => void;
}

const INDIAN_STATES_UT = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const AVAILABLE_LANGUAGES = [
  'Adi',
  'Aka (Hrusso)',
  'Anal',
  'Angami',
  'Angika',
  'Ao',
  'Apatani',
  'Arabic',
  'Assamese',
  'Awadhi',
  'Badaga',
  'Baghelkhandi / Bagheli',
  'Bagri',
  'Balti',
  'Banjari / Lambadi',
  'Beary',
  'Bengali',
  'Bhili / Bhilodi',
  'Bhojpuri',
  'Bhumij',
  'Bhutia',
  'Bishnupriya Manipuri',
  'Bodo',
  'Bundelkhandi / Bundeli',
  'Chakhesang / Chokri',
  'Chakma',
  'Chang',
  'Chhattisgarhi',
  'Coorgi / Kodava',
  'Dangi',
  'Deori',
  'Dhundhari',
  'Dimasa',
  'Dogri',
  'English',
  'Gadaba',
  'Gangte',
  'Garhwali',
  'Garo',
  'Gondi',
  'Gujarati',
  'Hajong',
  'Halbi',
  'Harauti',
  'Haryanvi',
  'Hindi',
  'Hmar',
  'Ho',
  'Jaintia / Pnar',
  'Jaunsari',
  'Juang',
  'Kabui / Rongmei',
  'Kangri',
  'Kannada',
  'Karbi',
  'Kashmiri',
  'Khandeshi',
  'Kharia',
  'Khasi',
  'Khortha',
  'Kinnauri',
  'Kokborok (Tripuri)',
  'Kolami',
  'Kom',
  'Konkani',
  'Konyak',
  'Korku',
  'Koya',
  'Kui',
  'Kumaoni',
  'Kurukh / Oraon',
  'Kuvi',
  'Ladakhi',
  'Lepcha',
  'Limbu',
  'Lotha',
  'Magahi / Magadhi',
  'Maithili',
  'Malayalam',
  'Malto / Paharia',
  'Malvi',
  'Mandeali',
  'Manipuri (Meitei)',
  'Mao',
  'Marathi',
  'Marwari',
  'Mewari',
  'Mewati',
  'Mishmi',
  'Mizo (Lushai)',
  'Monpa',
  'Munda',
  'Mundari',
  'Nagpuri / Sadri',
  'Nepali',
  'Nicobarese',
  'Nimadi',
  'Nishi / Nyishi',
  'Nocte',
  'Odia',
  'Paite',
  'Phom',
  'Punjabi',
  'Rabha',
  'Rajasthani',
  'Rajbanshi / Kamtapuri',
  'Rengma',
  'Sangtam',
  'Sanskrit',
  'Santali',
  'Sherpa',
  'Sindhi',
  'Sora',
  'Sumi / Sema',
  'Tagin',
  'Tamang',
  'Tamil',
  'Tangkhul',
  'Tangsa',
  'Telugu',
  'Thado / Kuki',
  'Tiwa / Lalung',
  'Tulu',
  'Vaiphei',
  'Wagdi',
  'Wancho',
  'Yimkhiung',
  'Zeliang',
  'Other',
];

const ROLE_OPTIONS = [
  'Individual Participant',
  'Coordinator',
  'Speaker Recruiter',
  'Singer / Vocal Artist',
  'Recording Team',
  'Field Agent',
  'Vendor / Agency',
  'Community / Organization',
  'Other',
];

const WORK_TYPES_OPTIONS = [
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
];

interface SelectedLanguageDetail {
  language: string;
  proficiency: 'Native' | 'Fluent' | 'Advanced' | 'Intermediate';
  speakerAvailability: 'I am a native speaker' | 'I can arrange native speakers' | 'Both';
  capacity: number;
}

interface ExperienceDetail {
  projectName: string;
  typeOfWork: string;
  languagesUsed: string;
  workVolume: string;
  duration: string;
  description: string;
}

export const ZenemooTalentRegistrationPage: React.FC<ZenemooTalentRegistrationPageProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showErrorToast, setShowErrorToast] = useState<boolean>(false);
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);
  const [duplicateEmailError, setDuplicateEmailError] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [submittedRegistrationCode, setSubmittedRegistrationCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);

  // Auto-dismiss validation toast after 4.5s
  useEffect(() => {
    if (showErrorToast) {
      const timer = setTimeout(() => {
        setShowErrorToast(false);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [showErrorToast, errorMsg]);

  // Global validation error trigger & smooth scroll to invalid field
  const triggerValidationError = (message: string, fieldId?: string) => {
    setErrorMsg(message);
    setShowErrorToast(true);

    if (fieldId) {
      setHighlightedFieldId(fieldId);
      setTimeout(() => setHighlightedFieldId(null), 4000);

      setTimeout(() => {
        const el = document.getElementById(fieldId);
        if (el) {
          const navHeight = 84;
          const elementPosition = el.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navHeight;

          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth',
          });

          if (
            el.tagName === 'INPUT' ||
            el.tagName === 'SELECT' ||
            el.tagName === 'TEXTAREA' ||
            el.tagName === 'BUTTON'
          ) {
            (el as HTMLElement).focus({ preventScroll: true });
          } else {
            const inner = el.querySelector<HTMLElement>('input, select, textarea, button');
            if (inner) {
              inner.focus({ preventScroll: true });
            }
          }
        }
      }, 60);
    }
  };

  // Step 1: Personal & Contact
  const [fullName, setFullName] = useState<string>('');
  const [gender, setGender] = useState<string>('Male');
  const [email, setEmail] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [phone, setPhone] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [cityDistrict, setCityDistrict] = useState<string>('');
  const [preferredContact, setPreferredContact] = useState<string>('WhatsApp');

  // Step 2: Languages & Searchable Multi-Select
  const [selectedLanguageList, setSelectedLanguageList] = useState<string[]>([]);
  const [languageDetails, setLanguageDetails] = useState<Record<string, SelectedLanguageDetail>>({});
  const [officialLanguagesList, setOfficialLanguagesList] = useState<string[]>(AVAILABLE_LANGUAGES);
  const [languageSearchQuery, setLanguageSearchQuery] = useState<string>('');
  const [customOtherLanguages, setCustomOtherLanguages] = useState<
    Array<{
      id: string;
      name: string;
      proficiency: 'Native' | 'Fluent' | 'Advanced' | 'Intermediate';
      speakerAvailability: 'I am a native speaker' | 'I can arrange native speakers' | 'Both';
      capacity: number;
    }>
  >([]);

  useEffect(() => {
    const fetchSupported = async () => {
      try {
        const res = await talentRegistrationApi.getSupportedLanguages();
        if (res?.data?.success && Array.isArray(res.data.data)) {
          const names = res.data.data
            .filter((item: any) => item.status !== 'inactive')
            .map((item: any) => item.language);
          if (names.length > 0) {
            const combined = Array.from(new Set([...AVAILABLE_LANGUAGES, ...names]));
            const otherIdx = combined.indexOf('Other');
            if (otherIdx > -1) combined.splice(otherIdx, 1);
            combined.sort((a, b) => a.localeCompare(b));
            combined.push('Other');
            setOfficialLanguagesList(combined);
          }
        }
      } catch (err) {}
    };
    fetchSupported();
  }, []);

  // Toggle Official Language Checkbox / Chip
  const handleToggleLanguage = (lang: string) => {
    if (lang === 'Other') {
      if (selectedLanguageList.includes('Other')) {
        setSelectedLanguageList(selectedLanguageList.filter((l) => l !== 'Other'));
        setCustomOtherLanguages([]);
      } else {
        setSelectedLanguageList([...selectedLanguageList, 'Other']);
        if (customOtherLanguages.length === 0) {
          setCustomOtherLanguages([
            {
              id: `custom_${Date.now()}`,
              name: '',
              proficiency: 'Native',
              speakerAvailability: 'I am a native speaker',
              capacity: 1,
            },
          ]);
        }
      }
      return;
    }

    if (selectedLanguageList.includes(lang)) {
      setSelectedLanguageList(selectedLanguageList.filter((l) => l !== lang));
      const nextDetails = { ...languageDetails };
      delete nextDetails[lang];
      setLanguageDetails(nextDetails);
    } else {
      setSelectedLanguageList([...selectedLanguageList, lang]);
      setLanguageDetails({
        ...languageDetails,
        [lang]: {
          language: lang,
          proficiency: 'Native',
          speakerAvailability: 'I am a native speaker',
          capacity: 1,
        },
      });
    }
  };

  const handleAddCustomLanguage = () => {
    setCustomOtherLanguages([
      ...customOtherLanguages,
      {
        id: `custom_${Date.now()}`,
        name: '',
        proficiency: 'Native',
        speakerAvailability: 'I am a native speaker',
        capacity: 1,
      },
    ]);
  };

  const handleUpdateCustomLanguage = (id: string, field: string, value: any) => {
    setCustomOtherLanguages(
      customOtherLanguages.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveCustomLanguage = (id: string) => {
    const updated = customOtherLanguages.filter((item) => item.id !== id);
    setCustomOtherLanguages(updated);
    if (updated.length === 0) {
      setSelectedLanguageList(selectedLanguageList.filter((l) => l !== 'Other'));
    }
  };

  // Step 3: Role & Contribution
  const [primaryRole, setPrimaryRole] = useState<string>('Individual Participant');
  const [roleDetails, setRoleDetails] = useState<Record<string, any>>({});

  // Step 4: Experience
  const [hasPreviousExperience, setHasPreviousExperience] = useState<boolean>(false);
  const [experiences, setExperiences] = useState<ExperienceDetail[]>([
    { projectName: '', typeOfWork: '', languagesUsed: '', workVolume: '', duration: '', description: '' },
  ]);

  // Step 5: Work Capability & Availability
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string>('Immediately');
  const [workingPreference, setWorkingPreference] = useState<string>('Project Basis');

  // Step 6: Equipment
  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [recordingEnvironment, setRecordingEnvironment] = useState<string>('Quiet Home/Room');
  const [internetQuality, setInternetQuality] = useState<string>('Good');

  // Step 7: Additional Info
  const [hearAboutSource, setHearAboutSource] = useState<string>('WhatsApp');
  const [additionalDetailsText, setAdditionalDetailsText] = useState<string>('');

  // Step 8: Consents
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [privacyAccepted, setPrivacyAccepted] = useState<boolean>(false);

  const handleUpdateLanguageDetail = (lang: string, field: keyof SelectedLanguageDetail, value: any) => {
    setLanguageDetails({
      ...languageDetails,
      [lang]: {
        ...languageDetails[lang],
        [field]: value,
      },
    });
  };

  // Toggle Capability Checkbox
  const handleToggleCapability = (cap: string) => {
    if (selectedCapabilities.includes(cap)) {
      setSelectedCapabilities(selectedCapabilities.filter((c) => c !== cap));
    } else {
      setSelectedCapabilities([...selectedCapabilities, cap]);
    }
  };

  // Toggle Equipment Checkbox
  const handleToggleEquipment = (eq: string) => {
    if (equipmentList.includes(eq)) {
      setEquipmentList(equipmentList.filter((e) => e !== eq));
    } else {
      setEquipmentList([...equipmentList, eq]);
    }
  };

  // Validate step progression
  const handleNextStep = () => {
    setErrorMsg('');
    setShowErrorToast(false);

    if (currentStep === 1) {
      if (!fullName.trim()) {
        return triggerValidationError('Please enter your full name.', 'field-fullName');
      }
      if (!email.trim() || !email.includes('@')) {
        return triggerValidationError('Please enter a valid email address.', 'field-email');
      }
      if (!phone.trim()) {
        return triggerValidationError('Please enter your WhatsApp / Phone number.', 'field-phone');
      }
      if (!state.trim()) {
        return triggerValidationError('Please select your state.', 'field-state');
      }
      if (!cityDistrict.trim()) {
        return triggerValidationError('Please enter your city / district.', 'field-cityDistrict');
      }
    }

    if (currentStep === 2) {
      if (selectedLanguageList.length === 0 && customOtherLanguages.length === 0) {
        return triggerValidationError('Please select at least one language you can support.', 'field-languages');
      }

      if (selectedLanguageList.includes('Other') || customOtherLanguages.length > 0) {
        if (customOtherLanguages.length === 0) {
          return triggerValidationError('Please enter the language name before continuing.', 'field-custom-lang');
        }
        for (const customItem of customOtherLanguages) {
          if (!customItem.name.trim()) {
            return triggerValidationError('Please enter the language name before continuing.', 'field-custom-lang');
          }

          // Duplicate check against official languages list
          const cleanName = customItem.name.trim().toLowerCase();
          const matchOfficial = officialLanguagesList.find(
            (l) => l.toLowerCase() === cleanName && l.toLowerCase() !== 'other'
          );
          if (matchOfficial) {
            return triggerValidationError(
              `"${customItem.name.trim()}" is already available in the official language list. Please select "${matchOfficial}" directly from the languages list above.`,
              'field-languages'
            );
          }
        }
      }
    }

    if (currentStep === 3) {
      if (!primaryRole) {
        return triggerValidationError('Please select your primary role.', 'field-primaryRole');
      }
    }

    if (currentStep === 5) {
      if (selectedCapabilities.length === 0) {
        return triggerValidationError('Please select at least one type of work capability.', 'field-capabilities');
      }
    }

    // Skip equipment step if no recording work selected
    const requiresEquipment = selectedCapabilities.some((cap) =>
      ['Voice / Audio Recording', 'Speech Data Collection', 'Video Recording', 'Singing / Vocal Recording'].includes(cap)
    );

    if (currentStep === 5 && !requiresEquipment) {
      setCurrentStep(7); // Jump straight to Additional Info
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 8));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setShowErrorToast(false);
    const requiresEquipment = selectedCapabilities.some((cap) =>
      ['Voice / Audio Recording', 'Speech Data Collection', 'Video Recording', 'Singing / Vocal Recording'].includes(cap)
    );
    if (currentStep === 7 && !requiresEquipment) {
      setCurrentStep(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Execute Submit Registration
  const handleSubmitRegistration = async () => {
    setErrorMsg('');
    setShowErrorToast(false);
    setDuplicateEmailError('');
    if (!termsAccepted || !privacyAccepted) {
      return triggerValidationError('Please agree to the Terms & Conditions and Privacy Policy to register.', 'field-consents');
    }
    if (!turnstileToken) {
      return triggerValidationError('Please complete the Cloudflare security verification check.', 'field-turnstile');
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fullName,
        gender,
        email,
        phone,
        countryCode,
        state,
        cityDistrict,
        preferredContact,
        primaryRole,
        roleDetails,
        hasPreviousExperience,
        workCapabilities: selectedCapabilities,
        availability,
        workingPreference,
        equipmentResources: {
          equipmentList,
          recordingEnvironment,
          internetQuality,
        },
        additionalInfo: {
          hearAboutSource,
          additionalDetailsText,
        },
        consents: {
          termsAccepted,
          privacyAccepted,
        },
        turnstileToken,
        languages: [
          ...selectedLanguageList
            .filter((lang) => lang !== 'Other')
            .map((lang) => ({
              language: lang,
              proficiency: languageDetails[lang]?.proficiency || 'Native',
              speakerAvailability: languageDetails[lang]?.speakerAvailability || 'I am a native speaker',
              capacity: languageDetails[lang]?.capacity || 1,
            })),
          ...customOtherLanguages
            .filter((c) => c.name.trim() !== '')
            .map((c) => ({
              language: c.name.trim(),
              proficiency: c.proficiency || 'Native',
              speakerAvailability: c.speakerAvailability || 'I am a native speaker',
              capacity: c.capacity || 1,
            })),
        ],
        experiences: hasPreviousExperience ? experiences.filter((e) => e.projectName.trim() || e.description.trim()) : [],
      };

      const res = await talentRegistrationApi.register(payload);
      if (res?.data?.success) {
        if (res.data.registrationCode) {
          setSubmittedRegistrationCode(res.data.registrationCode);
        }
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        if (res?.data?.isDuplicate) {
          setDuplicateEmailError(res.data.message);
        } else {
          throw new Error(res?.data?.message || 'Submission failed');
        }
      }
    } catch (err: any) {
      console.error('Registration Error:', err);
      if (err.response?.data?.isDuplicate) {
        setDuplicateEmailError(err.response.data.message);
      } else {
        setErrorMsg(err.response?.data?.message || err.message || 'Unable to submit registration. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 pb-20 sm:pb-28">
      {/* ── FIXED TOP HEADER BRAND BAR ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050508]/90 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/70 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <a
            href="/"
            onClick={(e) => {
              if (onBack) {
                e.preventDefault();
                onBack();
              }
            }}
            className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer min-w-0"
          >
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0">
              <SeoImage src="/assets/logo.png" alt="Zenemoo" className="w-full h-full object-contain rounded-full bg-white p-0.5" />
            </div>
            <div className="min-w-0">
              <span className="text-base sm:text-xl font-extrabold font-display tracking-wider text-white group-hover:text-cyan-300 transition-colors truncate block">ZENEMOO</span>
              <span className="text-[10px] sm:text-xs text-cyan-400 font-mono block leading-none mt-0.5 truncate">AI Data Network Portal</span>
            </div>
          </a>

          <button
            onClick={onBack || (() => { window.location.href = '/'; })}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 text-xs font-mono text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" /> <span className="hidden xs:inline sm:inline">Return</span> Home
          </button>
        </div>
      </header>

      {/* ── GLOBAL FLOATING VALIDATION ERROR TOAST (Always in visible viewport) ── */}
      {showErrorToast && errorMsg && (
        <aside
          role="alert"
          aria-live="assertive"
          className="fixed top-[calc(4.75rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-[420px] animate-in slide-in-from-top-3 fade-in duration-200"
        >
          <div className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-[#1c0808]/95 border border-red-500/50 shadow-[0_10px_30px_rgba(239,68,68,0.3)] backdrop-blur-xl">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="text-xs sm:text-sm font-semibold text-red-100 leading-snug break-words">
                {errorMsg}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowErrorToast(false)}
              className="p-1 rounded-lg text-red-300 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              aria-label="Dismiss error notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Main Content (Offset for Fixed Navbar + Safe Area) */}
      <div className="max-w-4xl mx-auto pt-[calc(4.75rem+env(safe-area-inset-top,0px))] px-3.5 sm:px-6 lg:px-8 space-y-6">
        {/* Form Title & Privacy Disclaimer Header Banner */}
        <div className="glass-panel p-5 sm:p-8 rounded-3xl border border-cyan-500/30 space-y-4 shadow-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Internal Project Network Registration
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-mono font-bold uppercase flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-purple-400" /> Protected Confidential Record
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
            Zenemoo AI Data Talent &amp; Partner Registration
          </h1>

          {/* Privacy Guarantee Box (Only displayed on Step 1) */}
          {currentStep === 1 && (
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono text-slate-300 space-y-2 leading-relaxed animate-in fade-in duration-200">
              <p className="flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>IMPORTANT PRIVACY GUARANTEE:</strong> This registration system is strictly for Zenemoo’s internal project matching, recruitment, coordination, and AI-data requirements. Submitted information will <strong>NEVER</strong> be displayed publicly anywhere on the website or sold to third parties.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* ── SUCCESS VIEW SCREEN ── */}
        {isSubmitted ? (
          <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-emerald-500/40 space-y-6 text-center shadow-2xl animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
                Registration Submitted Successfully!
              </h2>
              <p className="text-sm font-mono text-slate-300 max-w-xl mx-auto leading-relaxed">
                Thank you for joining Zenemoo’s AI Data Network. Your profile and capabilities have been securely recorded into our internal resource database.
              </p>
            </div>

            {/* Generated Unique Registration Tracking ID (ZEN-XXXX-XXXX) */}
            {submittedRegistrationCode && (
              <div className="p-6 rounded-2xl bg-cyan-950/40 border border-cyan-500/50 space-y-3 text-center max-w-lg mx-auto shadow-2xl">
                <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                  Your Unique Registration Tracking ID
                </span>
                <div className="flex items-center justify-center gap-3">
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-widest bg-black/80 py-2.5 px-6 rounded-xl border border-cyan-400/40 shadow-inner">
                    {submittedRegistrationCode}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(submittedRegistrationCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2500);
                    }}
                    className="p-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 cursor-pointer transition-all shrink-0"
                    title="Copy Tracking ID"
                  >
                    {copiedCode ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {copiedCode && (
                  <div className="text-[11px] text-emerald-400 font-mono font-bold animate-pulse">
                    ✓ Tracking ID copied to clipboard!
                  </div>
                )}
                <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                  Please save this Tracking ID for future correspondence regarding project matching and updates.
                </p>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 max-w-lg mx-auto text-left text-xs font-mono text-slate-400 space-y-2">
              <div className="text-white font-bold uppercase tracking-wider text-[11px] border-b border-white/10 pb-2">
                What happens next?
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                <li>A confirmation email with your Tracking ID has been sent to <strong>{email}</strong>.</li>
                <li>Our project operations team reviews registrations based on active client datasets.</li>
                <li>If a matching project in your language/region arises, our team will contact you via your preferred contact method ({preferredContact}).</li>
                <li>Your profile remains private and protected inside Zenemoo's admin system.</li>
              </ul>
            </div>

            {onBack && (
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                Return to Zenemoo Main Site
              </button>
            )}
          </div>
        ) : (
          /* ── 8-STEP WIZARD FORM ── */
          <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-8 shadow-2xl">
            {/* Step Progress Bar Header */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Step {currentStep} of 8 — {
                    currentStep === 1 ? 'Personal & Contact Details' :
                    currentStep === 2 ? 'Language & Regional Capability' :
                    currentStep === 3 ? 'Role & Contribution Type' :
                    currentStep === 4 ? 'Experience & Previous Work' :
                    currentStep === 5 ? 'Work Capability & Availability' :
                    currentStep === 6 ? 'Equipment & Recording Resources' :
                    currentStep === 7 ? 'Additional Information' :
                    'Consent & Terms'
                  }
                </span>
                <span className="text-white font-bold">{Math.round((currentStep / 8) * 100)}% Complete</span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${(currentStep / 8) * 100}%` }}
                />
              </div>
            </div>

            {/* Error Notification Alert */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ── STEP 1: PERSONAL & CONTACT DETAILS ── */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-cyan-400" /> 1. Personal &amp; Contact Details
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Please provide your basic details so our team can contact you regarding relevant Zenemoo projects.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
                  <div className="space-y-2">
                    <label className="text-slate-300 font-bold block">Full Name *</label>
                    <input
                      id="field-fullName"
                      type="text"
                      placeholder="e.g. Rajesh Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl bg-black/60 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                        highlightedFieldId === 'field-fullName'
                          ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                          : 'border-white/15 focus:border-cyan-400'
                      }`}
                    />
                  </div>

                  {/* Gender Selection */}
                  <div className="space-y-2">
                    <label className="text-slate-300 font-bold block">Gender *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Male', 'Female', 'Other'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`py-3 rounded-xl border text-center font-bold font-mono text-xs transition-all cursor-pointer ${
                            gender === g
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10'
                              : 'bg-black/60 border-white/15 text-slate-400 hover:text-white hover:border-white/30'
                          }`}
                        >
                          {g === 'Male' ? '👨 Male' : g === 'Female' ? '👩 Female' : '✨ Other'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-300 font-bold block">Email Address *</label>
                    <input
                      id="field-email"
                      type="email"
                      placeholder="e.g. rajesh@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl bg-black/60 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                        highlightedFieldId === 'field-email'
                          ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                          : 'border-white/15 focus:border-cyan-400'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-300 font-bold block">WhatsApp / Phone Number *</label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="px-3 py-3 rounded-xl bg-black/80 border border-white/15 text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 shrink-0"
                      >
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+971">🇦🇪 +971</option>
                        <option value="+880">🇧🇩 +880</option>
                        <option value="+977">🇳🇵 +977</option>
                        <option value="+94">🇱🇰 +94</option>
                      </select>
                      <input
                        id="field-phone"
                        type="tel"
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl bg-black/60 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                          highlightedFieldId === 'field-phone'
                            ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                            : 'border-white/15 focus:border-cyan-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-300 font-bold block">State *</label>
                    <select
                      id="field-state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl bg-black/80 border text-white focus:outline-none transition-all ${
                        highlightedFieldId === 'field-state'
                          ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                          : 'border-white/15 focus:border-cyan-400'
                      }`}
                    >
                      <option value="">-- Select Indian State / UT --</option>
                      {INDIAN_STATES_UT.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-300 font-bold block">City / District *</label>
                    <input
                      id="field-cityDistrict"
                      type="text"
                      placeholder="e.g. Cuttack / Bhubaneswar / Hyderabad"
                      value={cityDistrict}
                      onChange={(e) => setCityDistrict(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl bg-black/60 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                        highlightedFieldId === 'field-cityDistrict'
                          ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                          : 'border-white/15 focus:border-cyan-400'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-300 font-bold block">Preferred Contact Method *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['WhatsApp', 'Phone Call', 'Email'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPreferredContact(method)}
                          className={`py-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                            preferredContact === method
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: LANGUAGE & REGIONAL CAPABILITY ── */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    <Languages className="w-5 h-5 text-cyan-400" /> 2. Language &amp; Regional Capability
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Tell us which languages you or your network can support. Type to search or select languages below.
                  </p>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  {/* Searchable Language Input Header */}
                  <div id="field-languages" className={`space-y-3 p-1 rounded-2xl transition-all ${
                    highlightedFieldId === 'field-languages' ? 'ring-2 ring-red-500/50 bg-red-950/20' : ''
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-slate-300 font-bold block">
                        Which languages can you support? *
                      </label>
                      <span className="text-[10px] text-cyan-400 font-normal">
                        {officialLanguagesList.length - 1}+ Languages (A-Z Sorted)
                      </span>
                    </div>

                    {/* Search bar */}
                    <div className="relative w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="🔍 Search 120+ languages (e.g. Assamese, Bodo, Dogri, Maithili, Odia, Santhali)..."
                        value={languageSearchQuery}
                        onChange={(e) => setLanguageSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs sm:text-sm"
                      />
                      {languageSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setLanguageSearchQuery('')}
                          className="absolute right-3 top-3 text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Selected Languages Removable Chips Container */}
                  {(selectedLanguageList.length > 0 || customOtherLanguages.length > 0) && (
                    <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                      <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider block">
                        Selected Languages ({selectedLanguageList.filter((l) => l !== 'Other').length + customOtherLanguages.length}):
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        {selectedLanguageList
                          .filter((l) => l !== 'Other')
                          .map((lang) => (
                            <span
                              key={lang}
                              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold text-xs flex items-center gap-2 animate-in fade-in"
                            >
                              <span>{lang}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleLanguage(lang)}
                                className="text-cyan-400 hover:text-white transition-colors cursor-pointer"
                                title={`Remove ${lang}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}

                        {customOtherLanguages.map((c) => (
                          <span
                            key={c.id}
                            className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-400 text-purple-300 font-bold text-xs flex items-center gap-2 animate-in fade-in"
                          >
                            <span>Other: {c.name.trim() || 'Custom Language'}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomLanguage(c.id)}
                              className="text-purple-300 hover:text-white transition-colors cursor-pointer"
                              title="Remove custom language"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filtered Official Languages Selection Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-64 sm:max-h-72 overflow-y-auto p-3 rounded-2xl bg-black/50 border border-white/10">
                    {(() => {
                      const query = languageSearchQuery.toLowerCase().trim();
                      const standardLanguages = officialLanguagesList.filter((l) => l !== 'Other');

                      const filteredStandard = standardLanguages.filter((lang) => {
                        return query === '' || lang.toLowerCase().includes(query);
                      });

                      const matchesOther = query === '' || 'other'.includes(query) || 'custom'.includes(query);
                      const displayList = matchesOther ? [...filteredStandard, 'Other'] : filteredStandard;

                      return displayList.map((lang) => {
                        const isSelected = selectedLanguageList.includes(lang);
                        const displayName = lang === 'Other' ? 'Other / Custom' : lang;

                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => handleToggleLanguage(lang)}
                            className={`p-2.5 min-h-[42px] rounded-xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer touch-manipulation active:scale-[0.98] ${
                              isSelected
                                ? lang === 'Other'
                                  ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-md shadow-purple-500/10'
                                  : 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                                : lang === 'Other'
                                ? 'bg-purple-950/30 border-purple-500/40 text-purple-300 hover:border-purple-400 font-extrabold'
                                : 'bg-white/[0.02] border-white/10 text-slate-300 hover:text-white hover:border-white/20'
                            }`}
                          >
                            <span className="truncate pr-1 text-xs">{displayName}</span>
                            {isSelected && (
                              <CheckCircle className={`w-3.5 h-3.5 shrink-0 ml-1 ${lang === 'Other' ? 'text-purple-400' : 'text-cyan-400'}`} />
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {/* Prominent Quick "Specify Other / Custom Language" Banner Below Language Box */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-purple-950/30 border border-purple-500/40 mt-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-purple-300 block">Can't find your language in the list?</span>
                        <span className="text-[10px] text-slate-400 block">Click to enter your custom language or dialect name</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedLanguageList.includes('Other')) {
                          handleToggleLanguage('Other');
                        } else {
                          handleAddCustomLanguage();
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-md shadow-purple-500/20"
                    >
                      <Plus className="w-4 h-4" /> Specify Other Language
                    </button>
                  </div>

                  {/* DYNAMIC PROFICIENCY & CAPACITY MATRIX PER STANDARD SELECTED LANGUAGE */}
                  {selectedLanguageList.filter((l) => l !== 'Other').length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        Standard Language Proficiency &amp; Availability:
                      </h4>

                      {selectedLanguageList
                        .filter((l) => l !== 'Other')
                        .map((lang) => {
                          const detail = languageDetails[lang] || {
                            language: lang,
                            proficiency: 'Native',
                            speakerAvailability: 'I am a native speaker',
                            capacity: 1,
                          };

                          const canArrangeOthers =
                            detail.speakerAvailability === 'I can arrange native speakers' ||
                            detail.speakerAvailability === 'Both';

                          return (
                            <div key={lang} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <span className="font-bold text-white text-sm flex items-center gap-2">
                                  <Globe className="w-4 h-4 text-cyan-400" /> Language: {lang}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleLanguage(lang)}
                                  className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" /> Remove
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 block text-[11px]">Proficiency Level:</label>
                                  <select
                                    value={detail.proficiency}
                                    onChange={(e) => handleUpdateLanguageDetail(lang, 'proficiency', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                                  >
                                    <option value="Native">Native</option>
                                    <option value="Fluent">Fluent</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="Intermediate">Intermediate</option>
                                  </select>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-slate-400 block text-[11px]">Speaker Availability:</label>
                                  <select
                                    value={detail.speakerAvailability}
                                    onChange={(e) => handleUpdateLanguageDetail(lang, 'speakerAvailability', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                                  >
                                    <option value="I am a native speaker">I am a native speaker</option>
                                    <option value="I can arrange native speakers">I can arrange native speakers</option>
                                    <option value="Both">Both (Native speaker &amp; Can arrange others)</option>
                                  </select>
                                </div>
                              </div>

                              {canArrangeOthers && (
                                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5 animate-in fade-in duration-200">
                                  <label className="text-cyan-300 font-bold block text-[11px]">
                                    How many native speakers can you currently arrange for {lang}?
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={detail.capacity}
                                    onChange={(e) => handleUpdateLanguageDetail(lang, 'capacity', Number(e.target.value))}
                                    className="w-full px-3 py-2 rounded-xl bg-black/80 border border-cyan-400/40 text-cyan-300 font-bold focus:outline-none"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* MULTI-CUSTOM "OTHER" LANGUAGES CARDS SECTION */}
                  {(selectedLanguageList.includes('Other') || customOtherLanguages.length > 0) && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                          <Globe className="w-4 h-4 text-purple-400" /> Custom / Other Languages ({customOtherLanguages.length}):
                        </h4>
                        <button
                          type="button"
                          onClick={handleAddCustomLanguage}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add another language
                        </button>
                      </div>

                      {customOtherLanguages.map((c, idx) => {
                        const canArrangeOthers =
                          c.speakerAvailability === 'I can arrange native speakers' || c.speakerAvailability === 'Both';

                        const cleanTypedName = c.name.trim().toLowerCase();
                        const duplicateMatch = officialLanguagesList.find(
                          (l) => l.toLowerCase() === cleanTypedName && l.toLowerCase() !== 'other'
                        );

                        return (
                          <div
                            key={c.id}
                            className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/40 space-y-4 relative shadow-xl"
                          >
                            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                              <span className="font-bold text-purple-300 text-sm">
                                Custom Language #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomLanguage(c.id)}
                                className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>

                            <div className="space-y-2">
                              <label className="text-slate-200 font-bold block">Other Language Name *</label>
                              <input
                                id="field-custom-lang"
                                type="text"
                                placeholder="Enter custom language name (e.g. Kui, Ho, Santali Variant, Mizo)"
                                value={c.name}
                                onChange={(e) => handleUpdateCustomLanguage(c.id, 'name', e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl bg-black/80 border text-white placeholder-slate-500 focus:outline-none font-bold transition-all ${
                                  highlightedFieldId === 'field-custom-lang'
                                    ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                                    : 'border-purple-500/40 focus:border-purple-400'
                                }`}
                              />

                              {duplicateMatch && (
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
                                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                                  <span>
                                    <strong>"{c.name.trim()}"</strong> is already available in the official list above. Please select <strong>"{duplicateMatch}"</strong> directly from the languages list.
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-slate-400 block text-[11px]">Proficiency Level *</label>
                                <select
                                  value={c.proficiency}
                                  onChange={(e) => handleUpdateCustomLanguage(c.id, 'proficiency', e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-purple-400"
                                >
                                  <option value="Native">Native</option>
                                  <option value="Fluent">Fluent</option>
                                  <option value="Advanced">Advanced</option>
                                  <option value="Intermediate">Intermediate</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-slate-400 block text-[11px]">Speaker Availability *</label>
                                <select
                                  value={c.speakerAvailability}
                                  onChange={(e) => handleUpdateCustomLanguage(c.id, 'speakerAvailability', e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-purple-400"
                                >
                                  <option value="I am a native speaker">I am a native speaker</option>
                                  <option value="I can arrange native speakers">I can arrange native speakers</option>
                                  <option value="Both">Both (Native speaker &amp; Can arrange others)</option>
                                </select>
                              </div>
                            </div>

                            {canArrangeOthers && (
                              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1.5 animate-in fade-in duration-200">
                                <label className="text-purple-300 font-bold block text-[11px]">
                                  How many native speakers can you currently arrange for {c.name.trim() || 'this custom language'}?
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={c.capacity}
                                  onChange={(e) => handleUpdateCustomLanguage(c.id, 'capacity', Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-xl bg-black/80 border border-purple-400/40 text-purple-300 font-bold focus:outline-none"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 3: ROLE & CONTRIBUTION TYPE ── */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-cyan-400" /> 3. Your Role &amp; Contribution
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Select how you would like to support Zenemoo projects.
                  </p>
                </div>

                <div className="space-y-6 font-mono text-xs">
                  <div id="field-primaryRole" className={`space-y-3 p-2 rounded-2xl transition-all ${
                    highlightedFieldId === 'field-primaryRole' ? 'ring-2 ring-red-500/50 bg-red-950/20' : ''
                  }`}>
                    <label className="text-slate-300 font-bold block">What best describes you? *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {ROLE_OPTIONS.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setPrimaryRole(role)}
                          className={`p-3.5 rounded-2xl border text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                            primaryRole === role
                              ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-400 text-white shadow-lg'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          <span>{role}</span>
                          {primaryRole === role && <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DYNAMIC ROLE SPECIFIC QUESTIONS */}
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                      <Building className="w-4 h-4 text-purple-400" /> Role-Specific Configuration ({primaryRole}):
                    </h4>

                    {primaryRole === 'Individual Participant' && (
                      <div className="space-y-2">
                        <label className="text-slate-300 block">What type of work can you personally support?</label>
                        <p className="text-slate-500 text-[11px]">Note: Individual capacity is recorded for personal project tasks.</p>
                      </div>
                    )}

                    {primaryRole === 'Coordinator' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-slate-300 block">How many people can you coordinate?</label>
                          <input
                            type="text"
                            placeholder="e.g. 50–100 participants"
                            value={roleDetails.coordCapacity || ''}
                            onChange={(e) => setRoleDetails({ ...roleDetails, coordCapacity: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-300 block">Which states/cities can you cover?</label>
                          <input
                            type="text"
                            placeholder="e.g. Odisha, Andhra Pradesh"
                            value={roleDetails.coordCoverage || ''}
                            onChange={(e) => setRoleDetails({ ...roleDetails, coordCoverage: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white"
                          />
                        </div>
                      </div>
                    )}

                    {primaryRole === 'Speaker Recruiter' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-slate-300 block">Approximate speakers you can recruit:</label>
                          <input
                            type="text"
                            placeholder="e.g. 100+ native speakers"
                            value={roleDetails.recruiterCapacity || ''}
                            onChange={(e) => setRoleDetails({ ...roleDetails, recruiterCapacity: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-300 block">Typical recruitment timeline:</label>
                          <input
                            type="text"
                            placeholder="e.g. 50 speakers within 3 days"
                            value={roleDetails.recruiterTimeline || ''}
                            onChange={(e) => setRoleDetails({ ...roleDetails, recruiterTimeline: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white"
                          />
                        </div>
                      </div>
                    )}

                    {(primaryRole === 'Vendor / Agency' || primaryRole === 'Community / Organization') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-slate-300 block">Organization / Company Name:</label>
                          <input
                            type="text"
                            placeholder="e.g. Apex Data Services Pvt Ltd"
                            value={roleDetails.orgName || ''}
                            onChange={(e) => setRoleDetails({ ...roleDetails, orgName: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-300 block">Website URL (Optional):</label>
                          <input
                            type="url"
                            placeholder="https://example.com"
                            value={roleDetails.orgWebsite || ''}
                            onChange={(e) => setRoleDetails({ ...roleDetails, orgWebsite: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: EXPERIENCE & PREVIOUS WORK ── */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-cyan-400" /> 4. Experience &amp; Previous Work
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Have you previously worked on AI, data collection, recording, transcription, translation, annotation, or similar projects?
                  </p>
                </div>

                <div className="space-y-6 font-mono text-xs">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setHasPreviousExperience(true)}
                      className={`flex-1 py-3.5 rounded-2xl border font-bold transition-all cursor-pointer ${
                        hasPreviousExperience
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      Yes, I have previous experience
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasPreviousExperience(false)}
                      className={`flex-1 py-3.5 rounded-2xl border font-bold transition-all cursor-pointer ${
                        !hasPreviousExperience
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      No, I am new to AI data projects
                    </button>
                  </div>

                  {hasPreviousExperience && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* Confidentiality Warning Notice */}
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
                        <div className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-400" /> Confidentiality Notice
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          Please do not share confidential client information, private documents, passwords, internal project details, or proprietary information. Mention company or project names only if you are permitted to disclose them.
                        </p>
                      </div>

                      {experiences.map((exp, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                          <div className="font-bold text-white">Experience Record #{idx + 1}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Project / Company Name"
                              value={exp.projectName}
                              onChange={(e) => {
                                const next = [...experiences];
                                next[idx].projectName = e.target.value;
                                setExperiences(next);
                              }}
                              className="px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white"
                            />
                            <input
                              type="text"
                              placeholder="Type of Work (e.g. Speech Data / Annotation)"
                              value={exp.typeOfWork}
                              onChange={(e) => {
                                const next = [...experiences];
                                next[idx].typeOfWork = e.target.value;
                                setExperiences(next);
                              }}
                              className="px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white"
                            />
                          </div>

                          <textarea
                            rows={2}
                            placeholder="Briefly describe your work volume, experience duration, and responsibilities..."
                            value={exp.description}
                            onChange={(e) => {
                              const next = [...experiences];
                              next[idx].description = e.target.value;
                              setExperiences(next);
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 5: WORK CAPABILITY & AVAILABILITY ── */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-cyan-400" /> 5. Work Capability &amp; Availability
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Which types of work can you support? Select all capabilities that apply.
                  </p>
                </div>

                <div className="space-y-6 font-mono text-xs">
                  <div id="field-capabilities" className={`space-y-3 p-2 rounded-2xl transition-all ${
                    highlightedFieldId === 'field-capabilities' ? 'ring-2 ring-red-500/50 bg-red-950/20' : ''
                  }`}>
                    <label className="text-slate-300 font-bold block">Capabilities Supported *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-3 rounded-2xl bg-black/50 border border-white/10">
                      {WORK_TYPES_OPTIONS.map((cap) => {
                        const isSelected = selectedCapabilities.includes(cap);
                        return (
                          <button
                            key={cap}
                            type="button"
                            onClick={() => handleToggleCapability(cap)}
                            className={`p-2.5 rounded-xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                                : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{cap}</span>
                            {isSelected && <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-slate-300 font-bold block">Availability Timeframe *</label>
                      <select
                        value={availability}
                        onChange={(e) => setAvailability(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="Immediately">Immediately</option>
                        <option value="Within 1–3 days">Within 1–3 days</option>
                        <option value="Within 1 week">Within 1 week</option>
                        <option value="More than 1 week">More than 1 week</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-slate-300 font-bold block">Working Preference *</label>
                      <select
                        value={workingPreference}
                        onChange={(e) => setWorkingPreference(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="Project Basis">Project Basis</option>
                        <option value="Part Time">Part Time</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Flexible">Flexible</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 6: EQUIPMENT & RECORDING RESOURCES (CONDITIONAL) ── */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    <Mic className="w-5 h-5 text-cyan-400" /> 6. Equipment &amp; Recording Resources
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Recording hardware &amp; environment capabilities for audio/video data projects.
                  </p>
                </div>

                <div className="space-y-6 font-mono text-xs">
                  <div className="space-y-3">
                    <label className="text-slate-300 font-bold block">Equipment Available:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        'Smartphone',
                        'Professional Microphone',
                        'USB Microphone',
                        'Headphones',
                        'Camera',
                        'Laptop/Desktop',
                        'Recording Studio',
                        'Quiet Recording Environment',
                      ].map((eq) => {
                        const isSelected = equipmentList.includes(eq);
                        return (
                          <button
                            key={eq}
                            type="button"
                            onClick={() => handleToggleEquipment(eq)}
                            className={`p-2.5 rounded-xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                                : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{eq}</span>
                            {isSelected && <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-slate-300 font-bold block">Recording Environment:</label>
                      <select
                        value={recordingEnvironment}
                        onChange={(e) => setRecordingEnvironment(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-black/80 border border-white/15 text-white"
                      >
                        <option value="Professional Studio">Professional Studio</option>
                        <option value="Quiet Home/Room">Quiet Home/Room</option>
                        <option value="Office">Office</option>
                        <option value="Outdoor">Outdoor</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-slate-300 font-bold block">Internet Quality:</label>
                      <select
                        value={internetQuality}
                        onChange={(e) => setInternetQuality(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-black/80 border border-white/15 text-white"
                      >
                        <option value="Good">Good (High speed / Broadband)</option>
                        <option value="Average">Average (Stable 4G/Mobile)</option>
                        <option value="Limited">Limited</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 7: ADDITIONAL INFORMATION ── */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" /> 7. Additional Information
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Optional background information to assist project matching.
                  </p>
                </div>

                <div className="space-y-6 font-mono text-xs">
                  <div className="space-y-2">
                    <label className="text-slate-300 font-bold block">How did you hear about Zenemoo?</label>
                    <select
                      value={hearAboutSource}
                      onChange={(e) => setHearAboutSource(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/80 border border-white/15 text-white"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Referral">Referral</option>
                      <option value="Website">Website</option>
                      <option value="Team Member">Team Member</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-300 font-bold block">
                      Anything else you would like Zenemoo to know about your capabilities?
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Mention any special domain expertise, accents, voice types, or project capabilities..."
                      value={additionalDetailsText}
                      onChange={(e) => setAdditionalDetailsText(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 8: CONSENT & TERMS ── */}
            {currentStep === 8 && (
              <div className="space-y-6 font-mono text-xs">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" /> 8. Consent &amp; Terms
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Review registration terms and confirm submission.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 leading-relaxed text-slate-300 text-[11px]">
                  <p>• By submitting this form, I confirm that the information provided by me is accurate to the best of my knowledge.</p>
                  <p>• I understand that submitting this registration does not guarantee project selection, employment, payment, or participation in any Zenemoo project.</p>
                  <p>• I authorize Zenemoo to securely store and use the submitted information for contacting me regarding relevant AI-data collection, recording, annotation, transcription, translation, research, and project opportunities.</p>
                  <p>• I agree not to submit confidential information, passwords, financial credentials, or information belonging to another person without authorization.</p>
                </div>

                {/* Duplicate Email Security Warning Alert Banner */}
                {duplicateEmailError && (
                  <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-300 space-y-2 font-mono text-xs animate-pulse">
                    <div className="font-bold flex items-center gap-2 text-sm text-red-200">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" /> Security Check: Email Already Registered
                    </div>
                    <p className="leading-relaxed text-red-200/90">{duplicateEmailError}</p>
                  </div>
                )}

                <div id="field-consents" className={`space-y-3 pt-2 p-2 rounded-2xl transition-all ${
                  highlightedFieldId === 'field-consents' ? 'ring-2 ring-red-500/50 bg-red-950/20' : ''
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/50 transition-all">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                    <span className="text-white font-bold">I agree to the Terms &amp; Conditions *</span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/50 transition-all">
                    <input
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                    <span className="text-white font-bold">I agree to the Privacy Policy &amp; Internal Data Protection *</span>
                  </label>
                </div>

                {/* Cloudflare Turnstile Security Captcha Widget */}
                <div id="field-turnstile" className={`p-4 rounded-2xl bg-white/[0.02] border space-y-2 transition-all ${
                  highlightedFieldId === 'field-turnstile' ? 'border-red-500 ring-2 ring-red-500/50 bg-red-950/20' : 'border-white/10'
                }`}>
                  <label className="text-slate-300 font-bold block text-xs flex items-center gap-2">
                    <Lock className="w-4 h-4 text-cyan-400" /> Security Verification Check (Cloudflare Turnstile) *
                  </label>
                  <TurnstileWidget
                    onVerify={(token) => {
                      setTurnstileToken(token);
                      setErrorMsg('');
                    }}
                    onExpire={() => setTurnstileToken('')}
                  />
                </div>
              </div>
            )}

            {/* ── FOOTER WIZARD NAVIGATION CONTROLS ── */}
            <div className="flex items-center justify-between pt-6 border-t border-white/10 font-mono text-xs">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStep === 1 || isSubmitting}
                className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-slate-300 font-bold flex items-center gap-2 cursor-pointer transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>

              {currentStep < 8 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  Next Step <ArrowRight className="w-4 h-4 text-black" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitRegistration}
                  disabled={isSubmitting || !termsAccepted || !privacyAccepted}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:opacity-90 disabled:opacity-50 text-black font-extrabold text-xs shadow-xl shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  {isSubmitting ? (
                    'Submitting Registration...'
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-black" /> Register with Zenemoo
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── COMPACT TALENT PORTAL FOOTER ── */}
        <footer className="mt-12 pt-8 pb-4 border-t border-white/10 text-center space-y-2.5 font-mono text-xs text-slate-400">
          <div className="flex items-center justify-center gap-2">
            <div className="relative h-6 w-6 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[1.5px]">
              <SeoImage src="/assets/logo.png" alt="Zenemoo" className="w-full h-full object-contain rounded-full bg-white p-0.5" />
            </div>
            <span className="font-extrabold font-display text-white tracking-wider text-sm">ZENEMOO</span>
          </div>
          <p className="text-[11px] text-cyan-400 font-mono">AI Data Network Portal</p>
          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} Zenemoo Technologies. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-3 text-xs pt-1 text-slate-400 font-sans">
            <a href="/privacy" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">Privacy</a>
            <span>•</span>
            <a href="/terms" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">Terms</a>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsSupportModalOpen(true)}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Support Portal
            </button>
          </div>
        </footer>
      </div>

      {/* SUPPORT PORTAL MODAL */}
      <ZenemooSupportPortalModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />
    </div>
  );
};

