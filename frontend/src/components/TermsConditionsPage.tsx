import React from 'react';
import { ArrowLeft, FileText, Mail, MapPin, CheckCircle2 } from 'lucide-react';

interface TermsConditionsPageProps {
  onBack: () => void;
}

export const TermsConditionsPage: React.FC<TermsConditionsPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#050505] light:bg-[#f8fafc] text-slate-100 light:text-slate-900 flex flex-col justify-between relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 light:bg-white/80 backdrop-blur-xl border-b border-white/10 light:border-slate-200 py-4 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-3 group cursor-pointer">
            <img src="/assets/logo.png" alt="ZENEMOO Logo" className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md" />
            <span className="font-display font-extrabold text-base sm:text-lg text-white light:text-slate-900 tracking-wider">ZENEMOO</span>
          </button>

          <button
            onClick={onBack}
            className="px-3 sm:px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] light:bg-slate-100 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-xs font-mono font-bold text-slate-300 light:text-slate-700 flex items-center gap-2 transition-all cursor-pointer"
            title="Return to Main Site"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Return to Main Site</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 sm:py-16 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header Banner */}
          <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-purple-500/30 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold">
              <FileText className="w-4 h-4 text-purple-400" /> SERVICE TERMS AGREEMENT
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
              📜 Terms &amp; Conditions
            </h1>
            <p className="text-xs font-mono text-purple-300">
              QuantumCoders Data Solutions (Zenemoo) &bull; Last Updated: April 2026
            </p>
          </div>

          {/* Terms Content Sections */}
          <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 space-y-8 text-sm text-slate-300 leading-relaxed font-sans">
            {/* 1. Introduction */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-purple-400 font-mono">1.</span> Introduction
              </h2>
              <p>
                Welcome to QuantumCoders Data Solutions. These Terms &amp; Conditions govern your use of our website and services. By contacting us or using our services, you agree to these terms.
              </p>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 2. Services Overview */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-purple-400 font-mono">2.</span> Services Overview
              </h2>
              <p>QuantumCoders Data Solutions provides services including:</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs text-slate-200 pt-1">
                <li className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" /> Audio Transcription
                </li>
                <li className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" /> Data Annotation
                </li>
                <li className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" /> Multilingual Voice Over
                </li>
                <li className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" /> Audio Segmentation
                </li>
                <li className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2 sm:col-span-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" /> AI Speech Data Collection Support
                </li>
              </ul>
              <p className="text-slate-400 text-xs pt-1">
                All services are delivered based on project requirements, guidelines, and mutual agreement.
              </p>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 3. Use of Website */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-purple-400 font-mono">3.</span> Use of Website
              </h2>
              <p>By using our website, you agree:</p>
              <ul className="space-y-2 font-mono text-xs text-slate-300">
                <li className="flex items-center gap-2">&bull; To provide accurate information when filling out the contact form</li>
                <li className="flex items-center gap-2">&bull; Not to use the website for any unlawful or harmful activities</li>
                <li className="flex items-center gap-2">&bull; Not to misuse or attempt to disrupt our services</li>
              </ul>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 4. Communication */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-purple-400 font-mono">4.</span> Communication
              </h2>
              <p>When you contact us through the website:</p>
              <ul className="space-y-2 font-mono text-xs text-slate-300">
                <li className="flex items-center gap-2">&bull; You agree that we may contact you via email or phone regarding your inquiry</li>
                <li className="flex items-center gap-2">&bull; Communication will be limited strictly to project-related discussions only</li>
              </ul>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 5. Project Terms */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-purple-400 font-mono">5.</span> Project Terms
              </h2>
              <p>For any project:</p>
              <ul className="space-y-2 font-mono text-xs text-slate-300">
                <li className="flex items-center gap-2">&bull; Scope, timeline, and requirements will be discussed before starting</li>
                <li className="flex items-center gap-2">&bull; Work will be performed based on provided guidelines</li>
                <li className="flex items-center gap-2">&bull; Both parties must agree on deliverables before execution</li>
              </ul>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 6. Payments */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-purple-400 font-mono">6.</span> Payments (If Applicable)
              </h2>
              <ul className="space-y-2 font-mono text-xs text-slate-300">
                <li className="flex items-center gap-2">&bull; Payment terms will be clearly discussed before starting any project</li>
                <li className="flex items-center gap-2 text-emerald-400">&bull; No hidden charges will be applied</li>
                <li className="flex items-center gap-2">&bull; Work may begin only after agreement on payment terms</li>
              </ul>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 7. Confidentiality */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-purple-400 font-mono">7.</span> Confidentiality
              </h2>
              <p>We respect client data and project confidentiality:</p>
              <ul className="space-y-2 font-mono text-xs text-slate-300">
                <li className="flex items-center gap-2">&bull; Any data shared with us is used only for project purposes</li>
                <li className="flex items-center gap-2">&bull; We do not share or disclose client data without permission</li>
              </ul>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 8. Limitation of Liability */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-purple-400 font-mono">8.</span> Limitation of Liability
              </h2>
              <p>QuantumCoders Data Solutions is not liable for:</p>
              <ul className="space-y-2 font-mono text-xs text-slate-300">
                <li className="flex items-center gap-2">&bull; Any indirect or incidental damages</li>
                <li className="flex items-center gap-2">&bull; Loss caused due to incorrect or incomplete information provided by the client</li>
                <li className="flex items-center gap-2">&bull; Delays caused by external factors beyond our control</li>
              </ul>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 9. Intellectual Property */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-purple-400 font-mono">9.</span> Intellectual Property
              </h2>
              <p>All client-provided data remains the property of the client. Final delivered work will be handled as per mutual agreement.</p>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 10. Termination */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-purple-400 font-mono">10.</span> Termination
              </h2>
              <p>We reserve the right to decline or stop working on a project if terms are violated or refuse service in case of misuse or inappropriate behavior.</p>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 11. Changes to Terms */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-purple-400 font-mono">11.</span> Changes to Terms
              </h2>
              <p>We may update these Terms &amp; Conditions at any time. Updated terms will be posted on this page.</p>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 12. Contact Information */}
            <section className="space-y-4 p-6 rounded-2xl bg-purple-500/10 border border-purple-500/30">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-purple-400 font-mono">12.</span> Contact Information
              </h2>
              <p className="text-slate-300 text-xs">
                For any questions regarding these Terms, contact us directly:
              </p>
              <div className="space-y-2 font-mono text-xs text-purple-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <span>Email:</span>
                  <a href="mailto:mr.prem2006@gmail.com" className="text-white font-bold hover:underline">mr.prem2006@gmail.com</a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <span>Team Email:</span>
                  <a href="mailto:quantumcoderstechlab@gmail.com" className="text-white font-bold hover:underline">quantumcoderstechlab@gmail.com</a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span>Location:</span>
                  <span className="text-slate-200">Berhampur, Odisha, India</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 light:border-slate-200 bg-[#050505]/60 light:bg-white/60 backdrop-blur-md text-center text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          Copyright &copy; 2026 <span className="text-slate-200 font-semibold">Zenemoo</span>. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};
