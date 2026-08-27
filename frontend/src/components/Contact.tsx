import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, Copy, Check, X, Ticket, Globe, ExternalLink, ShieldCheck, Zap, MessageSquare, Sparkles, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import { SeoImage } from '../seo/components/SeoImage';
import confetti from 'canvas-confetti';
import { saveContactInquiry } from '../lib/adminStore';
import { TurnstileWidget } from './TurnstileWidget';

const COUNTRY_CODES = [
  { code: '+91', country: 'India 🇮🇳', flag: '🇮🇳', len: 10 },
  { code: '+1', country: 'US / Canada 🇺🇸', flag: '🇺🇸', len: 10 },
  { code: '+44', country: 'United Kingdom 🇬🇧', flag: '🇬🇧', len: 10 },
  { code: '+971', country: 'UAE 🇦🇪', flag: '🇦🇪', len: 9 },
  { code: '+65', country: 'Singapore 🇸🇬', flag: '🇸🇬', len: 8 },
  { code: '+61', country: 'Australia 🇦🇺', flag: '🇦🇺', len: 9 },
  { code: '+49', country: 'Germany 🇩🇪', flag: '🇩🇪', len: 10 },
  { code: '+966', country: 'Saudi Arabia 🇸🇦', flag: '🇸🇦', len: 9 },
  { code: '+974', country: 'Qatar 🇶🇦', flag: '🇶🇦', len: 8 },
];

type ModalStage = 'idle' | 'verifying' | 'submitting' | 'success' | 'error_turnstile' | 'error_backend';

export const Contact: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalStage, setModalStage] = useState<ModalStage>('idle');
  const [statusText, setStatusText] = useState('Preparing your inquiry...');
  const [backendError, setBackendError] = useState('');

  const [submittedId, setSubmittedId] = useState('');
  const [copied, setCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    service: 'Audio Transcription',
    language: 'Hindi',
    message: '',
  });

  const [submittedDetails, setSubmittedDetails] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service: '',
    language: '',
  });

  const generateInquiryId = () => {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ZEN-${year}-${randomHex}`;
  };

  // Animated status sequence when verification modal opens
  useEffect(() => {
    let t1: NodeJS.Timeout, t2: NodeJS.Timeout;
    if (showModal && modalStage === 'verifying') {
      setStatusText('Preparing your inquiry...');
      t1 = setTimeout(() => setStatusText('Verifying security...'), 900);
      t2 = setTimeout(() => setStatusText('Checking submission...'), 1800);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [showModal, modalStage]);

  // Execute backend submission once Turnstile produces a valid token
  const executeBackendSubmission = async (token: string) => {
    setModalStage('submitting');
    setStatusText('Verification complete. Submitting inquiry...');
    setLoading(true);

    const inquiryId = generateInquiryId();
    setSubmittedId(inquiryId);

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const fullPhone = phoneNumber.trim() ? `${countryCode} ${cleanPhone}` : '';
    const trimmedEmail = form.email.trim().toLowerCase();

    const payload = {
      ...form,
      email: trimmedEmail,
      phone: fullPhone,
      inquiry_id: inquiryId,
      turnstileToken: token,
    };

    try {
      await saveContactInquiry(payload);

      setSubmittedDetails({
        name: form.name,
        email: trimmedEmail,
        phone: fullPhone,
        company: form.company,
        service: form.service,
        language: form.language,
      });

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#3b82f6', '#a855f7'],
      });

      setModalStage('success');
      setForm({
        name: '',
        email: '',
        company: '',
        service: 'Audio Transcription',
        language: 'Hindi',
        message: '',
      });
      setPhoneNumber('');
      setTurnstileToken('');
    } catch (err: any) {
      console.error('Contact submit error:', err);
      setBackendError(err.message || 'We could not submit your inquiry. Please try again.');
      setModalStage('error_backend');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPhoneError('');

    // 1. Email Format Validation
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid corporate or personal email address.');
      return;
    }

    // 2. Phone Number Format Validation (Numbers only)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (phoneNumber.trim() !== '') {
      if (cleanPhone.length === 0 || /\D/.test(phoneNumber.trim().replace(/[\s-]/g, ''))) {
        setPhoneError('Phone number must contain digits only (no letters).');
        return;
      }
      if (countryCode === '+91' && cleanPhone.length !== 10) {
        setPhoneError('Indian mobile number must be exactly 10 digits.');
        return;
      }
      if (cleanPhone.length < 6 || cleanPhone.length > 13) {
        setPhoneError('Please enter a valid phone number (6-13 digits).');
        return;
      }
    }

    // 3. Validation passed -> Open Glossy Security Verification Modal
    setTurnstileToken('');
    setBackendError('');
    setModalStage('verifying');
    setShowModal(true);
  };

  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
    executeBackendSubmission(token);
  };

  const handleRetryTurnstile = () => {
    setTurnstileToken('');
    setBackendError('');
    setModalStage('verifying');
  };

  const copyTicketId = () => {
    navigator.clipboard.writeText(submittedId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText('K. Barida, Main Road, Odisha, India – 761031');
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalStage('idle');
    setTurnstileToken('');
    setBackendError('');
  };

  return (
    <section id="contact" className="py-24 relative z-10 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-4">
            <Mail className="w-4 h-4" />
            START A PROJECT WITH OUR TEAM
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            Get In Touch With Zenemo Tech
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Whether you're an enterprise looking for a reliable language data team, or an organization looking to work with us — we're ready to discuss your requirements.
          </p>
        </div>

        {/* Perfectly Balanced 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Project Inquiry Form (col-span-7) */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-cyan-500/5">
            <div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <h3 className="text-2xl font-bold font-display text-white">Send Us a Project Inquiry</h3>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-semibold">
                  <Zap className="w-3.5 h-3.5" /> &lt; 2h Response SLA
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mb-6">
                This form is exclusively for companies, organizations, and businesses looking for our data, language, annotation, transcription, or AI support services.
              </p>

              {/* Talent Registration Callout Card */}
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-cyan-950/40 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-purple-500/5">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5 font-display tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    Looking for a job or want to join our team?
                  </div>
                  <div className="text-xs text-slate-300 font-sans">
                    Please use our Talent Registration portal.
                  </div>
                </div>
                <a
                  href="/talent-registration"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold font-mono transition-all shrink-0 w-full sm:w-auto text-center shadow-sm cursor-pointer"
                >
                  Add Your Talent &rarr;
                </a>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Prem Prasad"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-2">Corporate Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={(e) => {
                        setForm({ ...form, email: e.target.value });
                        if (emailError) setEmailError('');
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans text-sm transition-all"
                    />
                    {emailError && <div className="text-xs font-mono text-red-400 mt-1">{emailError}</div>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Country Code Selector + Phone Number */}
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-2">Phone / WhatsApp (Digits Only)</label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="px-3 py-3 rounded-xl bg-[#0d0e15] border border-white/10 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400 shrink-0 cursor-pointer"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        placeholder="98000 00000"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          if (phoneError) setPhoneError('');
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-sm transition-all"
                      />
                    </div>
                    {phoneError && <div className="text-xs font-mono text-red-400 mt-1">{phoneError}</div>}
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-2">Company / Organization</label>
                    <input
                      type="text"
                      placeholder="Acme AI Corporation"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-2">Service Required *</label>
                    <select
                      value={form.service}
                      onChange={(e) => setForm({ ...form, service: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400 transition-all cursor-pointer"
                    >
                      <option>Audio Transcription</option>
                      <option>AI Data Collection</option>
                      <option>Data Annotation</option>
                      <option>Voice Over</option>
                      <option>Audio Segmentation</option>
                      <option>Review &amp; Quality Control</option>
                      <option>Bulk Data Projects</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-2">Language(s) Required</label>
                    <select
                      value={form.language}
                      onChange={(e) => setForm({ ...form, language: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400 transition-all cursor-pointer"
                    >
                      <option>Hindi</option>
                      <option>English</option>
                      <option>Odia</option>
                      <option>Bengali</option>
                      <option>Telugu</option>
                      <option>Tamil</option>
                      <option>Multiple Languages</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-2">Project Details &amp; Specifications *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="We have 50 hours of audio data in Hindi and Odia requiring timestamped verbatim transcription and speaker labeling..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans text-sm transition-all resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-bold font-display text-base transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                  Submit Project Inquiry
                </button>
              </form>
            </div>

            {/* Micro Privacy & Encryption footer inside form panel */}
            <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit Encrypted Transmission
              </span>
              <span>🔒 Direct QA Desk Delivery</span>
            </div>
          </div>

          {/* Right Column: High-Impact Consolidated Contact Details (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            {/* Panel A: Founder & Communication Directory */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-5 shadow-xl">
              {/* Founder Header */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-[1.5px] shadow-lg shrink-0 overflow-hidden">
                  <SeoImage
                    src="https://res.cloudinary.com/rwoe0mm9/image/upload/v1785185414/zenemoo/team/huq7bbgg3a5rcjpnah0h.jpg"
                    alt="Prem Prasad Pradhan — Founder & Vendor Manager at Zenemoo"
                    width={56}
                    height={56}
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                </div>
                <div>
                  <div className="text-white font-bold font-display text-base">Prem Prasad Pradhan</div>
                  <div className="text-xs font-mono text-cyan-400">Founder &amp; Vendor Manager</div>
                  <a href="mailto:prem@zenemoo.in" className="text-xs text-slate-300 hover:text-cyan-300 hover:underline font-mono">
                    prem@zenemoo.in
                  </a>
                </div>
              </div>

              {/* Email Directory Grid */}
              <div className="space-y-2.5 font-mono text-xs">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" /> Official Email Channels
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Primary Inquiry</div>
                      <a href="mailto:contact@zenemoo.in" className="text-white font-bold hover:text-cyan-300">
                        contact@zenemoo.in
                      </a>
                    </div>
                    <a
                      href="mailto:contact@zenemoo.in"
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold"
                    >
                      Mail
                    </a>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Support Desk</div>
                      <a href="mailto:support@zenemoo.in" className="text-white font-bold hover:text-purple-300">
                        support@zenemoo.in
                      </a>
                    </div>
                    <a
                      href="mailto:support@zenemoo.in"
                      className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-semibold"
                    >
                      Mail
                    </a>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">General Inquiries</div>
                      <a href="mailto:info@zenemoo.in" className="text-white font-bold hover:text-emerald-300">
                        info@zenemoo.in
                      </a>
                    </div>
                    <a
                      href="mailto:info@zenemoo.in"
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold"
                    >
                      Mail
                    </a>
                  </div>
                </div>
              </div>

              {/* Phone & WhatsApp Helpline */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 font-mono text-xs space-y-2">
                <div className="text-emerald-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Direct Helpline &amp; WhatsApp
                </div>
                <div className="flex items-center justify-between gap-2">
                  <a href="tel:+919827775230" className="text-white font-bold text-sm hover:text-emerald-400">
                    +91 9827775230
                  </a>
                  <a
                    href="https://wa.me/919827775230"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Panel B: Global Headquarters & Operational SLA */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-[11px] font-mono">
                <MapPin className="w-4 h-4" /> Global Delivery Hub / Official Address
              </div>

              {/* Address Box */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 font-mono text-xs">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Official Business Address</div>
                <div className="text-slate-100 font-bold text-sm leading-snug">K. Barida, Main Road</div>
                <div className="text-cyan-300 font-bold text-sm">Odisha, India – 761031</div>
                <div className="text-slate-400 text-[11px] pt-1">Remote-first team, available nationwide &amp; globally</div>
              </div>

              {/* Action Buttons: Copy Address & Google Maps */}
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={copyAddress}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300 border border-white/10 text-xs transition-colors cursor-pointer"
                >
                  {addressCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Address Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Address
                    </>
                  )}
                </button>

                <a
                  href="https://www.google.com/maps/search/?api=1&query=K.+Barida,+Main+Road,+Odisha+761031"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Google Maps
                </a>
              </div>

              {/* Response Hours & SLA Box */}
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 font-mono text-xs space-y-1.5">
                <div className="text-cyan-300 font-bold text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" /> Guaranteed Response SLA &amp; Hours
                </div>
                <div className="text-[11px] text-slate-300 space-y-1">
                  <div>⚡ Response SLA: <strong className="text-emerald-400">&lt; 2 Hours</strong></div>
                  <div>💼 Business Hours: <strong className="text-white">Mon–Sat 9:00 AM – 7:00 PM IST</strong></div>
                  <div>🌐 Enterprise Account: <strong className="text-cyan-300">24/7 Dedicated Managers</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Glossy Enterprise Verification & Success Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 max-w-md w-full relative space-y-5 text-center shadow-2xl shadow-cyan-500/20 overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Stage A & B: Security Verification & Submitting */}
            {(modalStage === 'verifying' || modalStage === 'submitting') && (
              <div className="space-y-4 relative z-10 py-1 flex flex-col items-center">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 border-r-purple-500 animate-spin"></div>
                  <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                    <Lock className="w-6 h-6 animate-pulse" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-display text-white">Securing Your Inquiry</h3>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Please wait while we verify your submission.
                  </p>
                </div>

                {/* Cloudflare Turnstile Challenge Container */}
                <div className="w-full flex justify-center items-center py-0.5 min-h-[68px]">
                  <TurnstileWidget
                    onVerify={handleTurnstileVerify}
                    onExpire={() => setModalStage('error_turnstile')}
                    onError={() => setModalStage('error_turnstile')}
                  />
                </div>

                {/* Status Sequence Display */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-semibold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  {statusText}
                </div>
              </div>
            )}

            {/* Stage C: Success State */}
            {modalStage === 'success' && (
              <div className="space-y-5 relative z-10">
                <button
                  onClick={closeModal}
                  className="absolute top-0 right-0 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-black border border-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/30">
                  <CheckCircle2 className="w-8 h-8 text-black" />
                </div>

                <div>
                  <h3 className="text-xl font-bold font-display text-white">✓ Inquiry Submitted</h3>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Your project inquiry has been securely received.
                  </p>
                </div>

                {/* Reference Ticket ID Badge */}
                <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-cyan-400" /> Reference Ticket ID
                  </div>
                  <div className="text-xl font-black font-mono text-cyan-300 tracking-wider">
                    {submittedId}
                  </div>
                  <button
                    onClick={copyTicketId}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Reference Ticket ID
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs font-mono text-slate-300 space-y-1 text-left bg-white/[0.03] p-3.5 rounded-xl border border-white/5">
                  <div><span className="text-slate-500">Name:</span> <strong className="text-white">{submittedDetails.name}</strong></div>
                  <div><span className="text-slate-500">Corporate Email:</span> <strong className="text-cyan-300">{submittedDetails.email}</strong></div>
                  {submittedDetails.phone && <div><span className="text-slate-500">Phone:</span> <strong className="text-white">{submittedDetails.phone}</strong></div>}
                  <div><span className="text-slate-500">Service:</span> <strong className="text-white">{submittedDetails.service}</strong></div>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-display text-sm transition-all shadow-lg shadow-cyan-500/25 cursor-pointer"
                >
                  Done &amp; Close
                </button>
              </div>
            )}

            {/* Stage D: Cloudflare Turnstile Verification Failed */}
            {modalStage === 'error_turnstile' && (
              <div className="space-y-5 relative z-10 py-2">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                </div>

                <div>
                  <h3 className="text-xl font-bold font-display text-white">Verification Failed</h3>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Please complete the security verification and try again.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-300 text-center">
                  ⚠️ Anti-bot verification was incomplete or expired. Your form data has been preserved.
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="w-1/2 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-bold font-mono transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRetryTurnstile}
                    className="w-1/2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-display text-xs transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Stage E: Backend Submission Failed */}
            {modalStage === 'error_backend' && (
              <div className="space-y-5 relative z-10 py-2">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                </div>

                <div>
                  <h3 className="text-xl font-bold font-display text-white">Submission Failed</h3>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    {backendError || 'Your verification was successful, but we could not submit the inquiry. Please try again.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-300 text-center">
                  💡 Security verification was completed. Click "Try Again" to retry sending your inquiry.
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="w-1/2 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-bold font-mono transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRetryTurnstile}
                    className="w-1/2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-display text-xs transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
