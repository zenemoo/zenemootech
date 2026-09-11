import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Globe,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { talentTeamApi } from '../services/talentTeamApi';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry'
];

const POPULAR_LANGUAGES = [
  'Hindi', 'English', 'Bengali', 'Marathi', 'Telugu', 'Tamil', 'Gujarati',
  'Urdu', 'Kannada', 'Odia', 'Malayalam', 'Punjabi', 'Assamese', 'Maithili',
  'Bhojpuri', 'Sanskrit', 'Marwari', 'Nepali', 'Santali', 'Kashmiri'
];

interface ZenemooTeamJoinPageProps {
  token?: string;
  onNavigateHome?: () => void;
}

export const ZenemooTeamJoinPage: React.FC<ZenemooTeamJoinPageProps> = ({
  token: propToken,
  onNavigateHome,
}) => {
  // Extract token from prop or URL pathname / hash
  const token = useMemo(() => {
    if (propToken && propToken.trim()) return propToken.trim();
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      let raw = '';
      if (path.includes('/team/join/')) {
        raw = path.split('/team/join/')[1] || '';
      } else if (path.includes('/team-join/')) {
        raw = path.split('/team-join/')[1] || '';
      } else if (hash.includes('#team/join/')) {
        raw = hash.split('#team/join/')[1] || '';
      } else if (hash.includes('#team-join/')) {
        raw = hash.split('#team-join/')[1] || '';
      }
      return raw.split('?')[0].split('#')[0].replace(/\/+$/, '');
    }
    return '';
  }, [propToken]);

  const [loading, setLoading] = useState(true);
  const [vendorInfo, setVendorInfo] = useState<{
    fullName: string;
    primaryRole: string;
    registrationCode: string;
  } | null>(null);
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    country_code: '+91',
    gender: 'Not Specified',
    state: '',
    city_district: '',
    languages: [] as string[],
    preferred_contact: 'WhatsApp',
    availability: 'Immediately',
    skills_notes: '',
  });

  const [customLanguage, setCustomLanguage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Fetch Vendor Invitation Info
  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setInvalidMessage('Invitation link is invalid or missing.');
        setLoading(false);
        return;
      }

      try {
        const res = await talentTeamApi.getPublicInviteInfo(token);
        if (res.success && res.vendor) {
          setVendorInfo(res.vendor);
        } else {
          setInvalidMessage(res.message || 'This team invitation link is invalid or has expired.');
        }
      } catch (err: any) {
        setInvalidMessage(
          err.response?.data?.message || 'This team invitation link is invalid or has expired.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const toggleLanguage = (lang: string) => {
    setFormData((prev) => {
      const exists = prev.languages.includes(lang);
      if (exists) {
        return { ...prev, languages: prev.languages.filter((l) => l !== lang) };
      } else {
        return { ...prev, languages: [...prev.languages, lang] };
      }
    });
  };

  const addCustomLanguage = () => {
    const trimmed = customLanguage.trim();
    if (trimmed && !formData.languages.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, languages: [...prev.languages, trimmed] }));
      setCustomLanguage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formData.full_name.trim()) {
      setErrorMessage('Please enter your Full Name.');
      return;
    }
    if (!formData.email.trim() && !formData.phone.trim()) {
      setErrorMessage('Please provide either an Email Address or Contact Number.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await talentTeamApi.submitPublicMember(token, formData);
      if (res.success) {
        setSubmittedSuccess(true);
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (_) {}
      } else {
        setErrorMessage(res.message || 'Failed to submit registration. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to submit registration. Please check your details.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    if (onNavigateHome) {
      e.preventDefault();
      onNavigateHome();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-medium">Validating team invitation...</p>
      </div>
    );
  }

  if (invalidMessage || !vendorInfo) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Invitation Unavailable</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {invalidMessage || 'This invitation link is not active or could not be found.'}
          </p>
          <a
            href="/"
            onClick={handleHomeClick}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Go to Zenemoo Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 flex items-center justify-center relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full relative z-10">
        {/* ── ZENEMOO LOGO & BANNER ── */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            ZENEMOO TALENT NETWORK
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Join Team</h1>
          <p className="text-xs text-slate-400 mt-1">
            You have been invited to join the vendor team at Zenemoo Data Solutions.
          </p>
        </div>

        {/* ── SUCCESS STATE ── */}
        {submittedSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-100">Details Submitted Successfully!</h2>
              <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
                Your details have been successfully added to{' '}
                <span className="text-sky-400 font-semibold">{vendorInfo.fullName}</span>'s team list.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 max-w-md mx-auto text-left space-y-1.5">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Next Steps:</span>
              </div>
              <p>
                The Vendor / Agency will coordinate with you directly regarding project assignments and field opportunities.
              </p>
            </div>

            <div className="pt-2">
              <a
                href="/"
                onClick={handleHomeClick}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white text-xs font-semibold px-6 py-3 rounded-xl shadow-lg shadow-sky-500/25 transition-all cursor-pointer"
              >
                Visit Zenemoo Home
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        ) : (
          /* ── REGISTRATION FORM ── */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6"
          >
            {/* Vendor Details Banner */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  Invited By Vendor
                </div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">{vendorInfo.fullName}</div>
                <div className="text-[11px] text-slate-400">{vendorInfo.primaryRole}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg self-start sm:self-center">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Registration Code</span>
                <span className="text-xs font-mono font-bold text-sky-400">{vendorInfo.registrationCode}</span>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Please provide your details below</h3>
              <p className="text-xs text-slate-400">
                No password or account creation required. Your contact info helps your vendor assign work.
              </p>
            </div>

            {errorMessage && (
              <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-3.5 text-xs text-rose-200 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter your complete full name"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="yourname@example.com"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contact Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.country_code}
                      onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                      className="w-16 bg-slate-950/80 border border-slate-800 text-center rounded-xl px-2 py-2.5 text-xs text-slate-300 focus:outline-none"
                    />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* State & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    State <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    City / District <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city_district}
                    onChange={(e) => setFormData({ ...formData, city_district: e.target.value })}
                    placeholder="e.g. Pune, Patna, Kolkata"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Languages you speak / transcribe / sing / work in
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5 max-h-28 overflow-y-auto p-1.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  {POPULAR_LANGUAGES.map((lang) => {
                    const isSelected = formData.languages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isSelected ? `✓ ${lang}` : `+ ${lang}`}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    placeholder="Other language..."
                    className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCustomLanguage}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Availability & Preferred Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Availability</label>
                  <select
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="Immediately">Immediately</option>
                    <option value="1 Week Notice">1 Week Notice</option>
                    <option value="15 Days Notice">15 Days Notice</option>
                    <option value="Part-time only">Part-time only</option>
                    <option value="Weekends only">Weekends only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Preferred Contact</label>
                  <select
                    value={formData.preferred_contact}
                    onChange={(e) => setFormData({ ...formData, preferred_contact: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="Email">Email</option>
                  </select>
                </div>
              </div>

              {/* Skills & Experience */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Relevant Experience / Special Skills (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.skills_notes}
                  onChange={(e) => setFormData({ ...formData, skills_notes: e.target.value })}
                  placeholder="e.g. 2 years audio transcription, field surveyor, studio singer, etc."
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 disabled:opacity-50 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Submit Details
                </button>
              </div>

              <div className="text-[11px] text-slate-500 text-center pt-2">
                By submitting, your details will be securely shared with {vendorInfo.fullName} for team allocation.
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};
