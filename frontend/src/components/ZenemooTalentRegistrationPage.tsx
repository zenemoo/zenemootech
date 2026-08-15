import React, { useState } from 'react';
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
} from 'lucide-react';
import { talentRegistrationApi } from '../services/api';
import { SeoImage } from '../seo/components/SeoImage';
import { TurnstileWidget } from './TurnstileWidget';

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
  'Assamese',
  'Bengali',
  'Bodo',
  'Dogri',
  'English',
  'Gujarati',
  'Hindi',
  'Kannada',
  'Kashmiri',
  'Konkani',
  'Maithili',
  'Malayalam',
  'Manipuri',
  'Marathi',
  'Nepali',
  'Odia',
  'Punjabi',
  'Sanskrit',
  'Santali',
  'Sindhi',
  'Tamil',
  'Telugu',
  'Urdu',
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
  const [duplicateEmailError, setDuplicateEmailError] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [submittedRegistrationCode, setSubmittedRegistrationCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Step 1: Personal & Contact
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [phone, setPhone] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [cityDistrict, setCityDistrict] = useState<string>('');
  const [preferredContact, setPreferredContact] = useState<string>('WhatsApp');

  // Step 2: Languages
  const [selectedLanguageList, setSelectedLanguageList] = useState<string[]>([]);
  const [languageDetails, setLanguageDetails] = useState<Record<string, SelectedLanguageDetail>>({});

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

  // Toggle Language Checkbox
  const handleToggleLanguage = (lang: string) => {
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

    if (currentStep === 1) {
      if (!fullName.trim()) return setErrorMsg('Please enter your full name.');
      if (!email.trim() || !email.includes('@')) return setErrorMsg('Please enter a valid email address.');
      if (!phone.trim()) return setErrorMsg('Please enter your WhatsApp / Phone number.');
      if (!state.trim()) return setErrorMsg('Please select your state.');
      if (!cityDistrict.trim()) return setErrorMsg('Please enter your city / district.');
    }

    if (currentStep === 2) {
      if (selectedLanguageList.length === 0) return setErrorMsg('Please select at least one language you can support.');
    }

    if (currentStep === 3) {
      if (!primaryRole) return setErrorMsg('Please select your primary role.');
    }

    if (currentStep === 5) {
      if (selectedCapabilities.length === 0) return setErrorMsg('Please select at least one type of work capability.');
    }

    // Skip equipment step if no recording work selected
    const requiresEquipment = selectedCapabilities.some((cap) =>
      ['Voice / Audio Recording', 'Speech Data Collection', 'Video Recording', 'Singing / Vocal Recording'].includes(cap)
    );

    if (currentStep === 5 && !requiresEquipment) {
      setCurrentStep(7); // Jump straight to Additional Info
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 8));
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    const requiresEquipment = selectedCapabilities.some((cap) =>
      ['Voice / Audio Recording', 'Speech Data Collection', 'Video Recording', 'Singing / Vocal Recording'].includes(cap)
    );
    if (currentStep === 7 && !requiresEquipment) {
      setCurrentStep(5);
      return;
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  // Execute Submit Registration
  const handleSubmitRegistration = async () => {
    setErrorMsg('');
    setDuplicateEmailError('');
    if (!termsAccepted || !privacyAccepted) {
      return setErrorMsg('Please agree to the Terms & Conditions and Privacy Policy to register.');
    }
    if (!turnstileToken) {
      return setErrorMsg('Please complete the Cloudflare security verification check.');
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fullName,
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
        languages: selectedLanguageList.map((lang) => ({
          language: lang,
          proficiency: languageDetails[lang]?.proficiency || 'Native',
          speakerAvailability: languageDetails[lang]?.speakerAvailability || 'I am a native speaker',
          capacity: languageDetails[lang]?.capacity || 1,
        })),
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
    <div className="min-h-screen bg-[#050508] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 py-12 px-4 sm:px-6 lg:px-8">
      {/* ── TOP HEADER BRAND BAR ── */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/20">
              <SeoImage src="/assets/logo.png" alt="Zenemoo" className="w-full h-full object-contain rounded-full bg-white p-0.5" />
            </div>
            <div>
              <span className="text-xl font-extrabold font-display tracking-wider text-white">ZENEMOO</span>
              <span className="text-xs text-cyan-400 font-mono block">AI Data Network Portal</span>
            </div>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" /> Return Home
            </button>
          )}
        </div>

        {/* Form Title & Privacy Disclaimer Header Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 space-y-4 shadow-2xl relative overflow-hidden">
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

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono text-slate-300 space-y-2 leading-relaxed">
            <p className="flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>IMPORTANT PRIVACY GUARANTEE:</strong> This registration system is strictly for Zenemoo’s internal project matching, recruitment, coordination, and AI-data requirements. Submitted information will <strong>NEVER</strong> be displayed publicly anywhere on the website or sold to third parties.
              </span>
            </p>
          </div>
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
                      type="text"
                      placeholder="e.g. Rajesh Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-300 font-bold block">Email Address *</label>
                    <input
                      type="email"
                      placeholder="e.g. rajesh@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
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
                        type="tel"
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-300 font-bold block">State *</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
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
                      type="text"
                      placeholder="e.g. Cuttack / Bhubaneswar / Hyderabad"
                      value={cityDistrict}
                      onChange={(e) => setCityDistrict(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
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
                    Tell us which languages you or your network can support. Select all languages that apply.
                  </p>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <label className="text-slate-300 font-bold block">Which languages can you support? *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-3 rounded-2xl bg-black/50 border border-white/10">
                    {AVAILABLE_LANGUAGES.map((lang) => {
                      const isSelected = selectedLanguageList.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleToggleLanguage(lang)}
                          className={`p-2.5 rounded-xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                              : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>{lang}</span>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* DYNAMIC PROFICIENCY & CAPACITY MATRIX PER SELECTED LANGUAGE */}
                  {selectedLanguageList.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        Language Proficiency &amp; Speaker Availability Details:
                      </h4>

                      {selectedLanguageList.map((lang) => {
                        const detail = languageDetails[lang] || {
                          language: lang,
                          proficiency: 'Native',
                          speakerAvailability: 'I am a native speaker',
                          capacity: 1,
                        };

                        const canArrangeOthers =
                          detail.speakerAvailability === 'I can arrange native speakers' || detail.speakerAvailability === 'Both';

                        return (
                          <div key={lang} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="font-bold text-white text-sm flex items-center gap-2">
                                <Globe className="w-4 h-4 text-purple-400" /> Language: {lang}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Configured
                              </span>
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

                            {/* CONDITIONAL CAPACITY INPUT ONLY IF CAN ARRANGE OTHERS */}
                            {canArrangeOthers && (
                              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5 animate-in fade-in duration-200">
                                <label className="text-cyan-300 font-bold block text-[11px]">
                                  How many native speakers can you currently arrange for {lang}?
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="e.g. 25 or 50"
                                  value={detail.capacity}
                                  onChange={(e) => handleUpdateLanguageDetail(lang, 'capacity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                  className="w-full px-3 py-2 rounded-xl bg-black/80 border border-cyan-500/40 text-white focus:outline-none focus:border-cyan-300 font-bold"
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
                  <div className="space-y-3">
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
                  <div className="space-y-3">
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

                <div className="space-y-3 pt-2">
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
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
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
      </div>
    </div>
  );
};
