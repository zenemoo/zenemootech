import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  CreditCard,
  PhoneCall,
  MapPin,
  Briefcase,
  Globe,
  Award,
  Sparkles,
  Save,
  RefreshCw,
  Lock,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  HeartHandshake,
  BookOpen,
} from 'lucide-react';
import { privateProfileApi } from '../services/api';

interface SecurePrivateProfileEditorProps {
  showToast: (text: string, type: 'success' | 'error') => void;
  role?: string;
}

export const SecurePrivateProfileEditor: React.FC<SecurePrivateProfileEditorProps> = ({
  showToast,
  role = 'team_member',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Form State matching all required sections
  const [form, setForm] = useState({
    // Personal Details
    personal_email: '',
    personal_mobile: '',
    alternate_mobile: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    marital_status: '',
    nationality: 'Indian',
    languages_known: '',

    // Address Details
    current_address: '',
    permanent_address: '',
    city: '',
    district: '',
    state: '',
    country: 'India',
    pin_code: '',

    // Professional Details
    professional_bio: '',
    technical_skills: '',
    certifications: '',
    years_of_experience: '',
    current_role_summary: '',
    areas_of_expertise: '',
    portfolio_website: '',
    linkedin_profile: '',
    github_profile: '',
    twitter_profile: '',
    instagram_profile: '',

    // Banking Details (Encrypted)
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    upi_id: '',

    // Identity Metadata (Encrypted)
    pan_number: '',
    aadhaar_number: '',
    passport_number: '',

    // Emergency Contact
    emergency_contact_name: '',
    relationship: '',
    emergency_contact_number: '',

    // Additional Information
    hobbies: '',
    interests: '',
    about_me: '',
    preferred_language: 'English',
    availability: 'Full-Time',
  });

  // Completion & Suggestions State
  const [completion, setCompletion] = useState({
    percentage: 0,
    statusLabel: 'Needs More Information',
    categoryScores: {
      personal: { score: 0, filled: 0, total: 8 },
      address: { score: 0, filled: 0, total: 7 },
      professional: { score: 0, filled: 0, total: 8 },
      banking: { score: 0, filled: 0, total: 6 },
      emergency: { score: 0, filled: 0, total: 5 },
    },
    suggestions: [] as string[],
  });

  const fetchPrivateProfile = async () => {
    setIsLoading(true);
    try {
      const res = await privateProfileApi.getPrivateProfile();
      if (res.data && res.data.success) {
        if (res.data.profile) {
          setForm((prev) => ({ ...prev, ...res.data.profile }));
          if (res.data.profile.last_updated_at) {
            setLastSaved(new Date(res.data.profile.last_updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
        if (res.data.completion) {
          setCompletion(res.data.completion);
        }
      }
    } catch (err: any) {
      console.warn('Failed to fetch private profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivateProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    try {
      const res = await privateProfileApi.updatePrivateProfile(form);
      if (res.data && res.data.success) {
        showToast(res.data.message || '⚡ Self-service profile saved securely!', 'success');
        if (res.data.profile) {
          setForm((prev) => ({ ...prev, ...res.data.profile }));
        }
        if (res.data.completion) {
          setCompletion(res.data.completion);
        }
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        showToast(res.data?.message || 'Failed to save profile.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Profile save failed.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 font-mono text-xs">
      {/* Header & Dynamic Profile Completion Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                Secure Self-Service System
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" /> AES-256 Encrypted
              </span>
            </div>
            <h2 className="text-2xl font-extrabold font-display text-white tracking-tight">
              Edit Private Profile Details
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Manage your personal, address, professional, banking, and emergency details. Sensitive banking and PII data are encrypted server-side and accessible only by you.
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            {lastSaved && (
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-white/[0.04] px-3 py-2 rounded-xl border border-white/10">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Last saved: <strong className="text-white">{lastSaved}</strong>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving || isLoading}
              className={`px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-600 hover:from-purple-400 hover:to-cyan-500 text-black font-bold font-display text-sm transition-all shadow-xl shadow-purple-500/20 flex items-center gap-2 cursor-pointer ${
                isSaving || isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-black" /> Save Profile Details
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Completion Bar & Recommendations */}
        <div className="pt-4 border-t border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-white text-xs">Profile Completion Status</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                  completion.percentage >= 90
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : completion.percentage >= 75
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : completion.percentage >= 50
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {completion.statusLabel}
              </span>
            </div>
            <span className="text-lg font-black text-cyan-300">{completion.percentage}%</span>
          </div>

          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 transition-all duration-700 shadow-md"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>

          {/* Section Breakdown Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 text-center">
              <div className="text-slate-400">Personal</div>
              <div className="font-bold text-purple-300">{completion.categoryScores?.personal?.score || 0}%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 text-center">
              <div className="text-slate-400">Address</div>
              <div className="font-bold text-cyan-300">{completion.categoryScores?.address?.score || 0}%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 text-center">
              <div className="text-slate-400">Professional</div>
              <div className="font-bold text-emerald-300">{completion.categoryScores?.professional?.score || 0}%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 text-center">
              <div className="text-slate-400">Banking</div>
              <div className="font-bold text-amber-300">{completion.categoryScores?.banking?.score || 0}%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 text-center col-span-2 sm:col-span-1">
              <div className="text-slate-400">Emergency</div>
              <div className="font-bold text-rose-300">{completion.categoryScores?.emergency?.score || 0}%</div>
            </div>
          </div>

          {/* Smart Suggestions */}
          {completion.suggestions && completion.suggestions.length > 0 && (
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2 text-xs">
              <div className="font-bold text-purple-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-purple-400" /> Smart Profile Recommendations
              </div>
              <ul className="space-y-1 text-slate-300 pl-6 list-disc text-[11px] leading-relaxed">
                {completion.suggestions.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* SECTION A: PERSONAL INFORMATION */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">A. Personal Information</h3>
            <p className="text-xs text-slate-400">Contact preferences, demographics, and personal identifiers.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-300 mb-1.5 flex items-center gap-1.5">
              Personal Email Address <Lock className="w-3 h-3 text-emerald-400" />
            </label>
            <input
              type="email"
              name="personal_email"
              value={form.personal_email}
              onChange={handleChange}
              placeholder="e.g. john.doe@gmail.com"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 flex items-center gap-1.5">
              Personal Mobile Number <Lock className="w-3 h-3 text-emerald-400" />
            </label>
            <input
              type="tel"
              name="personal_mobile"
              value={form.personal_mobile}
              onChange={handleChange}
              placeholder="e.g. +91 9876543210"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Alternate Mobile Number</label>
            <input
              type="tel"
              name="alternate_mobile"
              value={form.alternate_mobile}
              onChange={handleChange}
              placeholder="e.g. +91 9123456789"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Date of Birth</label>
            <input
              type="date"
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-purple-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Gender</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-white/10 text-white focus:outline-none focus:border-purple-400 text-xs"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-Binary">Non-Binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Blood Group</label>
            <select
              name="blood_group"
              value={form.blood_group}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-white/10 text-white focus:outline-none focus:border-purple-400 text-xs"
            >
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Marital Status</label>
            <select
              name="marital_status"
              value={form.marital_status}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-white/10 text-white focus:outline-none focus:border-purple-400 text-xs"
            >
              <option value="">Select Marital Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Nationality</label>
            <input
              type="text"
              name="nationality"
              value={form.nationality}
              onChange={handleChange}
              placeholder="e.g. Indian"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Languages Known</label>
            <input
              type="text"
              name="languages_known"
              value={form.languages_known}
              onChange={handleChange}
              placeholder="e.g. English, Hindi, Odia"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs"
            />
          </div>
        </div>
      </div>

      {/* SECTION B: ADDRESS INFORMATION */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">B. Address Information</h3>
            <p className="text-xs text-slate-400">Current and permanent residential details.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-slate-300 mb-1.5">Current Address</label>
            <textarea
              name="current_address"
              rows={2}
              value={form.current_address}
              onChange={handleChange}
              placeholder="Enter street, apartment/building, locality..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs resize-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-300 mb-1.5">Permanent Address</label>
            <textarea
              name="permanent_address"
              rows={2}
              value={form.permanent_address}
              onChange={handleChange}
              placeholder="Enter permanent home address..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs resize-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">City</label>
            <input
              type="text"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="e.g. Bhubaneswar"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">District</label>
            <input
              type="text"
              name="district"
              value={form.district}
              onChange={handleChange}
              placeholder="e.g. Khordha"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">State</label>
            <input
              type="text"
              name="state"
              value={form.state}
              onChange={handleChange}
              placeholder="e.g. Odisha"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Country</label>
            <input
              type="text"
              name="country"
              value={form.country}
              onChange={handleChange}
              placeholder="e.g. India"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">PIN Code</label>
            <input
              type="text"
              name="pin_code"
              value={form.pin_code}
              onChange={handleChange}
              placeholder="e.g. 751024"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
            />
          </div>
        </div>
      </div>

      {/* SECTION C: PROFESSIONAL INFORMATION */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">C. Professional Details &amp; Social Links</h3>
            <p className="text-xs text-slate-400">Professional background, skills, certifications, and portfolio links.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-slate-300 mb-1.5">Professional Bio</label>
            <textarea
              name="professional_bio"
              rows={3}
              value={form.professional_bio}
              onChange={handleChange}
              placeholder="Write a brief overview of your background, achievements, and core skills..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1.5">Technical Skills</label>
              <input
                type="text"
                name="technical_skills"
                value={form.technical_skills}
                onChange={handleChange}
                placeholder="e.g. Python, Speech Annotation, NLP, PyTorch"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5">Certifications</label>
              <input
                type="text"
                name="certifications"
                value={form.certifications}
                onChange={handleChange}
                placeholder="e.g. AWS Certified Data Engineer, PMP"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5">Years of Experience</label>
              <input
                type="text"
                name="years_of_experience"
                value={form.years_of_experience}
                onChange={handleChange}
                placeholder="e.g. 4.5 Years"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5">Current Role Summary</label>
              <input
                type="text"
                name="current_role_summary"
                value={form.current_role_summary}
                onChange={handleChange}
                placeholder="e.g. Speech Data Annotator & Quality Lead"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5">LinkedIn Profile URL</label>
              <input
                type="url"
                name="linkedin_profile"
                value={form.linkedin_profile}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5">GitHub Profile URL</label>
              <input
                type="url"
                name="github_profile"
                value={form.github_profile}
                onChange={handleChange}
                placeholder="https://github.com/username"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5">Portfolio Website</label>
              <input
                type="url"
                name="portfolio_website"
                value={form.portfolio_website}
                onChange={handleChange}
                placeholder="https://yourportfolio.com"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5">Twitter / X Profile</label>
              <input
                type="url"
                name="twitter_profile"
                value={form.twitter_profile}
                onChange={handleChange}
                placeholder="https://x.com/username"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION D: BANKING & PAYROLL INFORMATION */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              D. Banking &amp; Payroll Information <Lock className="w-4 h-4 text-emerald-400" />
            </h3>
            <p className="text-xs text-slate-400">Bank account details for salary deposit and reimbursements. Encrypted AES-256.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-300 mb-1.5">Account Holder Name</label>
            <input
              type="text"
              name="account_holder_name"
              value={form.account_holder_name}
              onChange={handleChange}
              placeholder="Full name as per bank account"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Bank Name</label>
            <input
              type="text"
              name="bank_name"
              value={form.bank_name}
              onChange={handleChange}
              placeholder="e.g. State Bank of India"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 flex items-center gap-1.5">
              Account Number <Lock className="w-3 h-3 text-emerald-400" />
            </label>
            <input
              type="text"
              name="account_number"
              value={form.account_number}
              onChange={handleChange}
              placeholder="Enter bank account number"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 flex items-center gap-1.5">
              IFSC Code <Lock className="w-3 h-3 text-emerald-400" />
            </label>
            <input
              type="text"
              name="ifsc_code"
              value={form.ifsc_code}
              onChange={handleChange}
              placeholder="e.g. SBIN0001234"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs uppercase"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Branch Name</label>
            <input
              type="text"
              name="branch_name"
              value={form.branch_name}
              onChange={handleChange}
              placeholder="e.g. Main Branch, Janpath"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 flex items-center gap-1.5">
              UPI ID (VPA) <Lock className="w-3 h-3 text-emerald-400" />
            </label>
            <input
              type="text"
              name="upi_id"
              value={form.upi_id}
              onChange={handleChange}
              placeholder="e.g. name@upi / phone@ybl"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
            />
          </div>
        </div>
      </div>

      {/* SECTION E: EMERGENCY CONTACT */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/30 space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">E. Emergency Contact</h3>
            <p className="text-xs text-slate-400">Immediate family member or guardian contact details for safety.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-300 mb-1.5">Emergency Contact Name</label>
            <input
              type="text"
              name="emergency_contact_name"
              value={form.emergency_contact_name}
              onChange={handleChange}
              placeholder="Full name of contact person"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Relationship</label>
            <input
              type="text"
              name="relationship"
              value={form.relationship}
              onChange={handleChange}
              placeholder="e.g. Father, Spouse, Sister"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 flex items-center gap-1.5">
              Contact Mobile Number <Lock className="w-3 h-3 text-emerald-400" />
            </label>
            <input
              type="tel"
              name="emergency_contact_number"
              value={form.emergency_contact_number}
              onChange={handleChange}
              placeholder="e.g. +91 9876543210"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 text-xs"
            />
          </div>
        </div>
      </div>

      {/* SECTION F: IDENTITY METADATA */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              F. Identity Metadata <Lock className="w-4 h-4 text-emerald-400" />
            </h3>
            <p className="text-xs text-slate-400">Government identity numbers for tax and compliance verification (encrypted, no document uploads).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-300 mb-1.5 flex items-center gap-1.5">
              PAN Number <Lock className="w-3 h-3 text-emerald-400" />
            </label>
            <input
              type="text"
              name="pan_number"
              value={form.pan_number}
              onChange={handleChange}
              placeholder="e.g. ABCDE1234F"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs uppercase"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 flex items-center gap-1.5">
              Aadhaar Number <Lock className="w-3 h-3 text-emerald-400" />
            </label>
            <input
              type="text"
              name="aadhaar_number"
              value={form.aadhaar_number}
              onChange={handleChange}
              placeholder="e.g. 1234 5678 9012"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 flex items-center gap-1.5">
              Passport Number <Lock className="w-3 h-3 text-emerald-400" />
            </label>
            <input
              type="text"
              name="passport_number"
              value={form.passport_number}
              onChange={handleChange}
              placeholder="e.g. A1234567"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs uppercase"
            />
          </div>
        </div>
      </div>

      {/* SECTION G: ADDITIONAL INFORMATION */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">G. Additional Information &amp; Preferences</h3>
            <p className="text-xs text-slate-400">Interests, hobbies, working language, and general information.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 mb-1.5">Hobbies</label>
            <input
              type="text"
              name="hobbies"
              value={form.hobbies}
              onChange={handleChange}
              placeholder="e.g. Reading, Chess, Classical Music"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Interests &amp; Specializations</label>
            <input
              type="text"
              name="interests"
              value={form.interests}
              onChange={handleChange}
              placeholder="e.g. Generative AI, Multilingual Speech Processing"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Preferred Working Language</label>
            <select
              name="preferred_language"
              value={form.preferred_language}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-white/10 text-white focus:outline-none focus:border-cyan-400 text-xs"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Odia">Odia</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5">Availability</label>
            <select
              name="availability"
              value={form.availability}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-white/10 text-white focus:outline-none focus:border-cyan-400 text-xs"
            >
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Contractor">Contractor</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-300 mb-1.5">About Me</label>
            <textarea
              name="about_me"
              rows={2}
              value={form.about_me}
              onChange={handleChange}
              placeholder="Share a short personal note about yourself..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs resize-none"
            />
          </div>
        </div>
      </div>

      {/* Save Button Footer Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="text-xs text-slate-400">
          All changes are saved directly to your private profile table. Sensitive fields remain encrypted.
        </div>
        <button
          type="submit"
          disabled={isSaving || isLoading}
          className={`px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-600 hover:from-purple-400 hover:to-cyan-500 text-black font-bold font-display text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
            isSaving || isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4 text-black" />} Save Profile
        </button>
      </div>
    </form>
  );
};
