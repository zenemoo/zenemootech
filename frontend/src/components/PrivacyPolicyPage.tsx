import React, { useEffect } from 'react';
import { ArrowLeft, Shield, Lock, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import { CursorSpotlight } from './CursorSpotlight';
import { ThreeNeuralBackground } from './ThreeNeuralBackground';
import { ImageWithSkeleton } from './ImageWithSkeleton';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] light:bg-[#f8fafc] text-slate-100 light:text-slate-900 flex flex-col justify-between relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Interactive Mouse Spotlight */}
      <CursorSpotlight />

      {/* 3D WebGL Neural Background Canvas */}
      <ThreeNeuralBackground />

      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 light:bg-white/80 backdrop-blur-xl border-b border-white/10 light:border-slate-200 py-4 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-3 group cursor-pointer">
            <ImageWithSkeleton
              src="/assets/logo.png"
              alt="ZENEMOO Logo"
              className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md"
              fallbackType="logo"
              isAvatar
            />
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
          <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-cyan-500/30 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
              <Shield className="w-4 h-4 text-cyan-400" /> OFFICIAL LEGAL DOCUMENTATION
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
              🔐 Privacy Policy
            </h1>
            <p className="text-xs font-mono text-cyan-400">
              Zenemoo &bull; Last Updated: April 2026
            </p>
          </div>

          {/* Privacy Content Sections */}
          <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 space-y-8 text-sm text-slate-300 leading-relaxed font-sans">
            {/* 1. Introduction */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-cyan-400 font-mono">1.</span> Introduction
              </h2>
              <p>
                Zenemoo ("we", "our", or "us") values your privacy. This Privacy Policy explains how we collect and use information when you contact us through our website.
              </p>
              <p className="text-cyan-300 font-mono text-xs pt-1">
                By using our website, you agree to this Privacy Policy.
              </p>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 2. Information We Collect */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-cyan-400 font-mono">2.</span> Information We Collect
              </h2>
              <p>We only collect information that you voluntarily provide through our contact form. This may include:</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs text-slate-200 pt-1">
                <li className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> Full Name
                </li>
                <li className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> Email Address
                </li>
                <li className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> Phone / WhatsApp Number (optional)
                </li>
                <li className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> Company / Organization Name (optional)
                </li>
              </ul>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                ✓ We do not collect any unnecessary or hidden data.
              </div>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 3. How We Use Your Information */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-cyan-400 font-mono">3.</span> How We Use Your Information
              </h2>
              <p>The information you provide is used only for:</p>
              <ul className="space-y-2 font-mono text-xs text-slate-300">
                <li className="flex items-center gap-2">&bull; Responding to your project inquiry</li>
                <li className="flex items-center gap-2">&bull; Communicating with you regarding your language data requirements</li>
                <li className="flex items-center gap-2">&bull; Understanding your project scope and timelines</li>
              </ul>
              <p className="text-slate-400 text-xs">
                We do not use your data for marketing or advertising without your explicit permission.
              </p>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 4. Data Sharing */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-cyan-400 font-mono">4.</span> Data Sharing
              </h2>
              <p>We respect your privacy.</p>
              <ul className="space-y-2 font-mono text-xs text-slate-300">
                <li className="flex items-center gap-2 text-emerald-400">&bull; Your information is not sold, rented, or shared with third parties</li>
                <li className="flex items-center gap-2">&bull; Data is only accessed by our internal team for communication purposes</li>
                <li className="flex items-center gap-2 text-slate-400">&bull; We may share information only if required by law</li>
              </ul>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 5. Data Security */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-cyan-400 font-mono">5.</span> Data Security
              </h2>
              <p>We take reasonable steps to keep your information safe:</p>
              <ul className="space-y-2 font-mono text-xs text-slate-300">
                <li className="flex items-center gap-2">&bull; Access is limited strictly to authorized team members</li>
                <li className="flex items-center gap-2">&bull; Data is handled securely and responsibly</li>
              </ul>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 6. Data Retention */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-cyan-400 font-mono">6.</span> Data Retention
              </h2>
              <p>We keep your information only for as long as needed to respond to your inquiry or maintain communication. You can request deletion of your data at any time.</p>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 7. Your Rights */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-cyan-400 font-mono">7.</span> Your Rights
              </h2>
              <p>You have the right to:</p>
              <ul className="space-y-2 font-mono text-xs text-cyan-300">
                <li className="flex items-center gap-2">&bull; Request access to your data</li>
                <li className="flex items-center gap-2">&bull; Ask us to correct or delete your data</li>
                <li className="flex items-center gap-2">&bull; Withdraw your consent at any time</li>
              </ul>
            </section>

            <div className="w-full h-px bg-white/10"></div>

            {/* 8. Contact Us */}
            <section className="space-y-4 p-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className="text-cyan-400 font-mono">8.</span> Contact Us
              </h2>
              <p className="text-slate-300 text-xs">
                If you have any questions about this Privacy Policy, you can contact us directly:
              </p>
              <div className="space-y-2 font-mono text-xs text-cyan-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>Team Email:</span>
                  <a href="mailto:contact@zenemoo.in" className="text-white font-bold hover:underline">contact@zenemoo.in</a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>Founder Email:</span>
                  <a href="mailto:prem@zenemoo.in" className="text-white font-bold hover:underline">prem@zenemoo.in</a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>Location:</span>
                  <span className="text-slate-200">Berhampur, Odisha, India</span>
                </div>
              </div>
            </section>

            {/* 9. Updates to This Policy */}
            <section className="space-y-2 pt-2 text-xs font-mono text-slate-400">
              <h3 className="font-bold text-slate-300">9. Updates to This Policy</h3>
              <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page.</p>
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
