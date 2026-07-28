import React, { useState } from 'react';
import { ArrowLeft, Sparkles, CheckCircle2, ShieldCheck, Calendar, Globe, Award, FileText, Cpu, Clock, Send, Laptop, Headphones, Volume2, UserCheck, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { contactApi } from '../services/api';

interface DesicrewContributorsPageProps {
  onBack: () => void;
  onBackToOpportunities: () => void;
}

export const DesicrewContributorsPage: React.FC<DesicrewContributorsPageProps> = ({
  onBack,
  onBackToOpportunities,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    language: 'Odia',
    experience: '1-2 Years',
    dailyCapacity: '180+ Minutes',
    toolsProficiency: 'Aegisub / Subtitle Edit',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [ticketCode, setTicketCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const generatedCode = `ZNM-DC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      company: 'Individual Contributor',
      service: 'DesiCrew Odia Transcription Contributor',
      language: formData.language,
      inquiry_code: generatedCode,
      message: `[ONBOARDING APPLICATION]\n- Target Language: ${formData.language}\n- Experience: ${formData.experience}\n- Daily Output Capacity: ${formData.dailyCapacity}\n- Software Tools: ${formData.toolsProficiency}\n- Additional Note: ${formData.message || 'Ready for sample test evaluation.'}`,
    };

    try {
      await contactApi.submit(payload);
      setTicketCode(generatedCode);
      setSubmitSuccess(true);
    } catch (err: any) {
      alert('Error submitting application: ' + (err.message || 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] light:bg-[#f8fafc] text-slate-100 light:text-slate-900 flex flex-col justify-between relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/85 light:bg-white/85 backdrop-blur-xl border-b border-white/10 light:border-slate-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-3 cursor-pointer">
            <img src="/assets/logo.png" alt="ZENEMOO Logo" className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md" />
            <div className="flex flex-col text-left">
              <span className="font-display font-extrabold text-base text-white light:text-slate-900 tracking-wider">ZENEMOO</span>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest -mt-0.5">DesiCrew Partner Portal</span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToOpportunities}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] light:bg-slate-100 border border-white/10 text-xs font-mono text-slate-300 light:text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" /> Opportunities
            </button>
            <button
              onClick={onBack}
              className="hidden sm:flex px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-mono font-bold text-xs shadow-lg shadow-emerald-500/20 items-center gap-1.5 cursor-pointer"
            >
              ZENEMOO Home
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                VERIFIED DESICREW SOLUTIONS VENDOR • EST. 2023
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white light:text-slate-900 tracking-tight leading-tight">
                Odia AI Speech &amp; Transcription <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Contributor Program</span>
              </h1>

              <p className="text-slate-300 light:text-slate-600 text-base sm:text-lg leading-relaxed font-sans">
                Onboarding experienced <strong className="text-white light:text-slate-900">Odia (ଓଡ଼ିଆ) transcriptionists &amp; audio annotators</strong> in collaboration with DesiCrew Solutions. Work on enterprise AI speech datasets, audio segmentation, and subtitling deliverables.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-xs text-slate-300 light:text-slate-700">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Primary: Odia (ଓଡ଼ିଆ)</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <Laptop className="w-4 h-4 text-purple-400" />
                  <span>Work From Home</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>180+ Mins Output/Day</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <a
                  href="#application-form"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:opacity-95 text-black font-bold font-mono text-xs sm:text-sm shadow-xl shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Apply for Odia Onboarding
                </a>
                <a
                  href="#requirements"
                  className="px-6 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 font-bold font-mono text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-cyan-400" /> View Eligibility &amp; Guidelines
                </a>
              </div>
            </div>

            {/* Right Poster Showcase Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="glass-panel p-4 rounded-3xl border border-emerald-500/30 shadow-2xl relative max-w-sm w-full">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
                  <img
                    src="/assets/executive.png"
                    alt="DesiCrew x ZENEMOO Contributor Program"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>

                  {/* Poster Overlay Text */}
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 font-mono text-xs text-white space-y-1.5">
                    <div className="text-emerald-400 font-bold text-sm flex items-center justify-between">
                      <span>ZENEMOO × DesiCrew</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">VERIFIED</span>
                    </div>
                    <div className="text-slate-300 font-sans text-xs">Odia AI Speech Dataset &amp; Subtitle Pipeline</div>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-white/10 flex justify-between">
                      <span>Daily Capacity: 180+ Mins</span>
                      <span className="text-cyan-300">Aegisub / Subtitle Edit</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Program Details Grid */}
      <section id="requirements" className="py-16 bg-black/40 light:bg-slate-100 border-y border-white/10 light:border-slate-200 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-widest">
              QUALIFICATION &amp; TECHNICAL REQUIREMENTS
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white light:text-slate-900">
              Contributor Eligibility &amp; Checklist
            </h2>
            <p className="text-slate-400 light:text-slate-600 text-sm">
              Ensure you meet the basic hardware, software, and language proficiency criteria before submitting your onboarding application.
            </p>
          </div>

          {/* Checklist Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="font-bold font-display text-base text-white light:text-slate-900">PC / Laptop Hardware</h3>
              <p className="text-xs font-sans text-slate-300 light:text-slate-600 leading-relaxed">
                Windows 10/11 or Mac OS computer with stable high-speed internet connection for dataset sync.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="font-bold font-display text-base text-white light:text-slate-900">Aegisub / Subtitle Edit</h3>
              <p className="text-xs font-sans text-slate-300 light:text-slate-600 leading-relaxed">
                Familiarity with timestamp alignment, audio waveform segmentation, and SRT file formatting tools.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="font-bold font-display text-base text-white light:text-slate-900">Native Odia Speaker</h3>
              <p className="text-xs font-sans text-slate-300 light:text-slate-600 leading-relaxed">
                Native Odia listening and typing accuracy with strong command over regional Odia grammar &amp; spellings.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold font-display text-base text-white light:text-slate-900">Daily Production Target</h3>
              <p className="text-xs font-sans text-slate-300 light:text-slate-600 leading-relaxed">
                Ability to deliver 180+ minutes of transcribed audio daily following project guideline SLAs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form Section */}
      <section id="application-form" className="py-20 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-emerald-500/30 relative overflow-hidden shadow-2xl">
            <div className="text-center max-w-xl mx-auto space-y-3 mb-10">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-widest">
                OFFICIAL ONBOARDING FORM
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white light:text-slate-900">
                Submit Your Contributor Application
              </h2>
              <p className="text-xs sm:text-sm font-sans text-slate-300 light:text-slate-600">
                Fill in your details below to receive test sample files and onboarding guidelines from our team lead.
              </p>
            </div>

            {submitSuccess ? (
              <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4 font-mono">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-xl font-bold text-white font-display">Application Submitted Successfully!</h3>
                <p className="text-xs text-slate-300 font-sans max-w-md mx-auto">
                  Thank you for applying to the ZENEMOO × DesiCrew Odia Contributor Program. Your application reference code is:
                </p>
                <div className="inline-block px-4 py-2 rounded-xl bg-black/60 border border-emerald-500/40 text-emerald-300 text-sm font-bold">
                  Ref Code: #{ticketCode}
                </div>
                <p className="text-[11px] text-slate-400 font-sans pt-2">
                  Our operations team will review your application and contact you via Email / WhatsApp with sample test files within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitSuccess(false)}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-bold cursor-pointer"
                >
                  Submit Another Application
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 light:text-slate-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Chandra Sahoo"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 light:text-slate-700 mb-2">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="ramesh@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 light:text-slate-700 mb-2">Phone / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 light:text-slate-700 mb-2">Native Language *</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0d0e15] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-emerald-400"
                    >
                      <option value="Odia">Odia (ଓଡ଼ିଆ)</option>
                      <option value="Hindi">Hindi (हिंदी)</option>
                      <option value="Indian English">Indian English</option>
                      <option value="Bengali">Bengali (বাংলা)</option>
                      <option value="Telugu">Telugu (తెలుగు)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 light:text-slate-700 mb-2">Transcription Experience</label>
                    <select
                      value={formData.experience}
                      onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0d0e15] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-emerald-400"
                    >
                      <option value="Beginner (0-6 Months)">Beginner (0-6 Months)</option>
                      <option value="Intermediate (1-2 Years)">Intermediate (1-2 Years)</option>
                      <option value="Expert (2+ Years)">Expert (2+ Years)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 light:text-slate-700 mb-2">Daily Audio Output Capacity</label>
                    <select
                      value={formData.dailyCapacity}
                      onChange={(e) => setFormData({ ...formData, dailyCapacity: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0d0e15] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-emerald-400"
                    >
                      <option value="120-180 Minutes/Day">120-180 Minutes/Day</option>
                      <option value="180+ Minutes/Day (Recommended)">180+ Minutes/Day (Recommended)</option>
                      <option value="250+ Minutes/Day (Full Time)">250+ Minutes/Day (Full Time)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 light:text-slate-700 mb-2">Software Proficiency</label>
                    <input
                      type="text"
                      placeholder="e.g. Aegisub, Subtitle Edit, Audacity"
                      value={formData.toolsProficiency}
                      onChange={(e) => setFormData({ ...formData, toolsProficiency: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 light:text-slate-700 mb-2">Additional Experience / Notes (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Mention any past projects, speech dataset work, or specific dialects you specialize in..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:opacity-95 text-black font-bold font-mono text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Submitting Application...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Contributor Onboarding Application
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 light:border-slate-200 bg-[#050505]/60 light:bg-white/60 backdrop-blur-md text-center text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          &copy; 2026 ZENEMOO Data Solutions. All Rights Reserved. Vendor Partner with DesiCrew Solutions.
        </div>
      </footer>
    </div>
  );
};
