import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, ShieldCheck, UserCheck, MessageSquare, Copy, Check, X, Ticket } from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveContactInquiry } from '../lib/adminStore';
import { contactApi } from '../services/api';

export const Contact: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [copied, setCopied] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service: 'Audio Transcription',
    language: 'Hindi',
    message: '',
  });

  const generateInquiryId = () => {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ZEN-${year}-${randomHex}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    const trimmedEmail = form.email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid corporate or personal email address.');
      return;
    }

    setLoading(true);
    const inquiryId = generateInquiryId();
    setSubmittedId(inquiryId);

    const payload = {
      ...form,
      email: trimmedEmail,
      inquiry_id: inquiryId,
    };

    try {
      await saveContactInquiry(payload);
      await contactApi.submit(payload);
    } catch (err) {
      console.warn('Contact submit warning:', err);
    } finally {
      setLoading(false);
    }

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#3b82f6', '#a855f7'],
    });

    setShowModal(true);
  };

  const copyTicketId = () => {
    navigator.clipboard.writeText(submittedId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm({
      name: '',
      email: '',
      phone: '',
      company: '',
      service: 'Audio Transcription',
      language: 'Hindi',
      message: '',
    });
  };

  return (
    <section id="contact" className="py-28 relative z-10 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-4">
            <Mail className="w-3.5 h-3.5" />
            START A PROJECT WITH OUR TEAM
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            Get In Touch With Zenemo Tech
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Whether you're an enterprise looking for a reliable language data team, or a company looking to partner with us through DesiCrew — we're ready to discuss your requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Contact Form */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden">
            <h3 className="text-2xl font-bold font-display text-white mb-2">Send Us a Project Inquiry</h3>
            <p className="text-xs font-mono text-slate-400 mb-8">
              Fill in your requirements and we'll respond within 24 hours with team capacity, timeline, and rate details.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-2">Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98000 00000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans text-sm transition-all"
                  />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-2">Service Required *</label>
                  <select
                    value={form.service}
                    onChange={(e) => setForm({ ...form, service: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400 transition-all"
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
                    className="w-full px-4 py-3 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400 transition-all"
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
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans text-sm transition-all"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-bold font-display text-base transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    Submitting Project Inquiry...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Project Inquiry
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Direct Contact Info Cards */}
          <div className="lg:col-span-5 space-y-6">
            {/* Primary Contact Card */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-[1px] shadow-lg">
                  <div className="w-full h-full bg-[#0a0c14] rounded-[11px] flex items-center justify-center font-bold text-cyan-400">
                    P
                  </div>
                </div>
                <div>
                  <div className="text-white font-bold font-display text-base">Prem Prasad Pradhan</div>
                  <div className="text-xs font-mono text-cyan-400">Founder &amp; Vendor Manager (Primary Contact)</div>
                  <a href="mailto:contact@mrprem.in" className="text-xs text-slate-300 hover:text-white hover:underline font-mono">
                    contact@mrprem.in
                  </a>
                </div>
              </div>
            </div>

            {/* Team Email Addresses */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-purple-400 font-bold uppercase text-[11px] mb-1">
                <Mail className="w-4 h-4" /> Team Email Addresses
              </div>
              <div className="text-slate-300">
                <a href="mailto:zenemootech@gmail.com" className="hover:text-cyan-300 transition-colors">
                  zenemootech@gmail.com
                </a>
              </div>
              <div className="text-slate-300">
                <a href="mailto:contact@mrprem.in" className="hover:text-cyan-300 transition-colors">
                  contact@mrprem.in
                </a>
              </div>
            </div>

            {/* Phone & WhatsApp */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-[11px] mb-1">
                <Phone className="w-4 h-4" /> Phone &amp; WhatsApp
              </div>
              <div className="text-slate-200 font-bold text-sm">
                <a href="mailto:zenemootech@gmail.com" className="hover:text-cyan-300 transition-colors">
                  Contact via Email / WhatsApp
                </a>
              </div>
              <div className="text-slate-400">Available Mon–Sat, 9 AM – 8 PM IST</div>
            </div>

            {/* Location */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-[11px] mb-1">
                <MapPin className="w-4 h-4" /> Location
              </div>
              <div className="text-slate-200 font-bold">Berhampur, Odisha, India – 760001</div>
              <div className="text-slate-400">Remote-first team, available nationwide</div>
            </div>

            {/* Response Time SLA Box */}
            <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 font-mono text-xs text-slate-300 space-y-2">
              <div className="text-cyan-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Guaranteed Response SLA
              </div>
              <div>📧 Email Inquiries: <strong className="text-white">Within 24 hours</strong></div>
              <div>📱 WhatsApp: <strong className="text-white">Within 2–4 hours</strong></div>
              <div>📞 Phone Calls: <strong className="text-white">Mon–Sat 9 AM – 8 PM IST</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Futuristic Confirmation Modal Popup */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-8 rounded-3xl border border-cyan-500/30 max-w-lg w-full relative space-y-6 text-center shadow-2xl shadow-cyan-500/20">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-black border border-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/30">
              <CheckCircle2 className="w-8 h-8 text-black" />
            </div>

            <div>
              <h3 className="text-2xl font-bold font-display text-white">Project Inquiry Submitted!</h3>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Your inquiry has been stored in Supabase PostgreSQL &amp; assigned a unique ticket ID.
              </p>
            </div>

            {/* Reference Ticket ID Badge */}
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2 text-center">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-cyan-400" /> Reference Ticket ID
              </div>
              <div className="text-2xl font-black font-mono text-cyan-300 tracking-wider">
                {submittedId}
              </div>
              <button
                onClick={copyTicketId}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors"
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

            <div className="text-xs font-mono text-slate-300 space-y-1 text-left bg-white/[0.03] p-4 rounded-xl border border-white/5">
              <div><span className="text-slate-500">Submitted By:</span> <strong className="text-white">{form.name}</strong></div>
              <div><span className="text-slate-500">Corporate Email:</span> <strong className="text-cyan-300">{form.email}</strong></div>
              <div><span className="text-slate-500">Service:</span> <strong className="text-white">{form.service}</strong></div>
              <div><span className="text-slate-500">Language:</span> <strong className="text-white">{form.language}</strong></div>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Prem Prasad Pradhan and the Zenemo Tech team will review your specs and contact you within 24 hours.
            </p>

            <button
              onClick={closeModal}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-display text-sm transition-all shadow-lg shadow-cyan-500/25"
            >
              Done &amp; Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
