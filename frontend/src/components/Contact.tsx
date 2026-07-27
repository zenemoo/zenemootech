import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, ShieldCheck, UserCheck, MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveContactInquiry } from '../lib/adminStore';
import { contactApi } from '../services/api';

export const Contact: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service: 'Audio Transcription',
    language: 'Hindi',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    try {
      await saveContactInquiry(form);
      await contactApi.submit(form);
    } catch (err) {}

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#3b82f6', '#a855f7'],
    });
    setTimeout(() => {
      setSubmitted(false);
      setForm({ name: '', email: '', phone: '', company: '', service: 'Audio Transcription', language: 'Hindi', message: '' });
    }, 4000);
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

            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 animate-bounce">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold font-display text-white">Project Inquiry Submitted!</h4>
                <p className="text-sm font-mono text-slate-300 max-w-md mx-auto">
                  Thank you, <span className="text-cyan-300">{form.name || 'Friend'}</span>. Prem Prasad Pradhan and the Zenemo Tech team will reach out to <span className="text-cyan-300">{form.email || 'your email'}</span> within 24 hours.
                </p>
              </div>
            ) : (
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
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-2">Phone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="+91 9827775230"
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
                    rows={4}
                    required
                    placeholder="We have 50 hours of audio data in Hindi and Odia requiring timestamped verbatim transcription and speaker labeling..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans text-sm transition-all resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 text-cyan-200" />
                  Submit Project Inquiry
                </button>
              </form>
            )}
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
                  <a href="mailto:mr.prem2006@gmail.com" className="text-xs text-slate-300 hover:text-white hover:underline font-mono">
                    mr.prem2006@gmail.com
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
                <a href="mailto:quantumcoderstechlab@gmail.com" className="hover:text-cyan-300 transition-colors">
                  quantumcoderstechlab@gmail.com
                </a>
              </div>
              <div className="text-slate-300">
                <a href="mailto:quantumcoders@zohomail.in" className="hover:text-cyan-300 transition-colors">
                  quantumcoders@zohomail.in
                </a>
              </div>
            </div>

            {/* Phone & WhatsApp */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-[11px] mb-1">
                <Phone className="w-4 h-4" /> Phone &amp; WhatsApp
              </div>
              <div className="text-slate-200 font-bold text-sm">
                <a href="tel:+919827775230" className="hover:text-cyan-300 transition-colors">
                  +91 9827775230
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
    </section>
  );
};
