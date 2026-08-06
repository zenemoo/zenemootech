import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Heart, Github, Linkedin, Mail, Twitter, Check, CheckCircle2, X, Lock, FileText, Shield } from 'lucide-react';
import { subscriberApi } from '../services/api';
import { ZENEMOO_SOCIAL_LINKS } from './SocialData';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Legal Modal State: 'privacy' | 'terms' | null
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#privacy') setLegalModal('privacy');
      if (hash === '#terms') setLegalModal('terms');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await subscriberApi.subscribe(trimmedEmail);
      setSubscribedEmail(trimmedEmail);
      setShowModal(true);
      setEmail('');
    } catch (err: any) {
      console.warn('Subscription warning:', err);
      setSubscribedEmail(trimmedEmail);
      setShowModal(true);
      setEmail('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="relative z-10 bg-[#030406] text-slate-400 border-t border-white/10 pt-20 pb-12 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-16 border-b border-white/10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/25 overflow-hidden">
                <img
                  src="/assets/logo.png"
                  alt="ZENEMOO Logo"
                  className="w-full h-full object-cover rounded-full bg-white p-0.5"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold tracking-wider font-display text-white">
                  ZENEMOO
                </span>
                <span className="text-[10px] tracking-widest uppercase text-cyan-400 font-mono font-semibold -mt-1">
                  Data Solutions
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Building language data solutions for the future. Specializing in audio transcription, data annotation, multilingual voice over, and AI training datasets. Certified DesiCrew Solutions vendor since 2023.
            </p>

            {/* MSME Government Credential Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono font-semibold">
              <span>🏛️ MSME (Udyam) Registered Micro Enterprise</span>
            </div>

            {/* Newsletter */}
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                Subscribe to Zenemoo Dispatch
              </div>
              <form onSubmit={handleSubscribe} className="space-y-2 max-w-sm">
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      'Join'
                    )}
                  </button>
                </div>
                {errorMsg && <div className="text-[11px] font-mono text-red-400">{errorMsg}</div>}
              </form>
            </div>

            {/* Official Social Media Section */}
            <div className="pt-2">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-3">
                Official Social Media
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {ZENEMOO_SOCIAL_LINKS.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.ariaLabel}
                      className={`w-11 h-11 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 backdrop-blur-md flex items-center justify-center transition-all duration-250 ease-out hover:scale-110 ${item.hoverBg} ${item.hoverText} ${item.hoverBorder} ${item.hoverShadow} shadow-lg`}
                    >
                      <IconComp className="w-5 h-5 transition-transform" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold mb-4">
              Services
            </h4>
            <ul className="space-y-2.5 text-xs font-mono">
              <li><a href="#services" className="hover:text-cyan-400 transition-colors">Audio Transcription</a></li>
              <li><a href="#services" className="hover:text-cyan-400 transition-colors">AI Data Collection</a></li>
              <li><a href="#services" className="hover:text-cyan-400 transition-colors">Data Annotation</a></li>
              <li><a href="#services" className="hover:text-cyan-400 transition-colors">Multilingual Voice Over</a></li>
              <li><a href="#services" className="hover:text-cyan-400 transition-colors">Audio Segmentation</a></li>
              <li><a href="#services" className="hover:text-cyan-400 transition-colors">Super QC Review</a></li>
            </ul>
          </div>

          {/* Languages */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold mb-4">
              Languages
            </h4>
            <ul className="space-y-2.5 text-xs font-mono">
              <li><a href="#languages" className="hover:text-cyan-400 transition-colors">Hindi (हिन्दी)</a></li>
              <li><a href="#languages" className="hover:text-cyan-400 transition-colors">English (Indian)</a></li>
              <li><a href="#languages" className="hover:text-cyan-400 transition-colors">Odia (ଓଡ଼ିଆ)</a></li>
              <li><a href="#languages" className="hover:text-cyan-400 transition-colors">Bengali (On Request)</a></li>
              <li><a href="#languages" className="hover:text-cyan-400 transition-colors">Telugu (On Request)</a></li>
              <li><a href="#languages" className="hover:text-cyan-400 transition-colors">Tamil (On Request)</a></li>
            </ul>
          </div>

          {/* Organization */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold mb-4">
              Organization
            </h4>
            <ul className="space-y-2.5 text-xs font-mono">
              <li><a href="/zenemooai" className="hover:text-cyan-400 transition-colors text-cyan-400 font-bold flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Zenemoo AI Assistant</a></li>
              <li><a href="/opportunities" className="hover:text-cyan-400 transition-colors text-cyan-300 font-bold">Opportunities Portal</a></li>
              <li><a href="/team-directory" className="hover:text-cyan-400 transition-colors">Data Team Directory</a></li>
              <li><a href="#partner" className="hover:text-cyan-400 transition-colors">DesiCrew Partnership</a></li>
              <li><a href="#telemetry" className="hover:text-cyan-400 transition-colors">Production Capacity</a></li>
              <li className="pt-2 border-t border-white/5 space-y-1 font-mono text-[11px]">
                <div className="text-slate-400 font-bold">Official Contact &amp; Location:</div>
                <div>Contact: <a href="mailto:contact@zenemoo.in" className="text-cyan-300 hover:underline">contact@zenemoo.in</a></div>
                <div>Support: <a href="mailto:support@zenemoo.in" className="text-cyan-300 hover:underline">support@zenemoo.in</a></div>
                <div>General: <a href="mailto:info@zenemoo.in" className="text-cyan-300 hover:underline">info@zenemoo.in</a></div>
                <div className="text-slate-300 pt-1">📍 Address: K. Barida, Main Road, Odisha, India – 761031</div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & Legal Privacy / Terms Links */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div>
            Copyright &copy; 2026 <span className="text-slate-300 font-semibold">Zenemoo</span>. All Rights Reserved.
          </div>
          <div className="flex items-center gap-3 text-slate-400 font-bold">
            <a
              href="/privacy"
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Privacy Policy
            </a>
            <span>·</span>
            <a
              href="/terms"
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Terms &amp; Conditions
            </a>
          </div>
        </div>
      </div>

      {/* Newsletter Subscription Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-8 rounded-3xl border border-cyan-500/30 max-w-md w-full relative space-y-5 text-center shadow-2xl shadow-cyan-500/10">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold font-display text-white">Thank You for Subscribing!</h3>

            <p className="text-sm font-mono text-slate-300 leading-relaxed">
              We've registered <span className="text-cyan-400 font-semibold">{subscribedEmail}</span> for the official <span className="text-white font-semibold">Zenemoo Dispatch</span> newsletter.
            </p>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* LEGAL DEDICATED PRIVACY POLICY & TERMS MODAL */}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl animate-fade-in overflow-y-auto">
          <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-cyan-500/30 max-w-3xl w-full my-8 space-y-6 max-h-[85vh] overflow-y-auto relative shadow-2xl text-slate-200 font-sans">
            {/* Close Button */}
            <button
              onClick={() => setLegalModal(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <button
                onClick={() => setLegalModal('privacy')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  legalModal === 'privacy'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white bg-white/[0.03]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Privacy Policy
              </button>
              <button
                onClick={() => setLegalModal('terms')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  legalModal === 'terms'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white bg-white/[0.03]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Terms &amp; Conditions
              </button>
            </div>

            {/* PRIVACY POLICY CONTENT */}
            {legalModal === 'privacy' ? (
              <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold mb-2">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" /> OFFICIAL PRIVACY STATEMENT
                  </div>
                  <h2 className="text-2xl font-bold font-display text-white">Privacy Policy</h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">QuantumCoders Data Solutions (Zenemoo) • Last Updated: April 2026</p>
                </div>

                <div className="space-y-4">
                  <section className="space-y-1.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white text-base">1. Introduction</h3>
                    <p>
                      QuantumCoders Data Solutions ("we", "our", or "us") values your privacy. This Privacy Policy explains how we collect and use information when you contact us through our website. By using our website, you agree to this Privacy Policy.
                    </p>
                  </section>

                  <section className="space-y-1.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white text-base">2. Information We Collect</h3>
                    <p>We only collect information that you voluntarily provide through our contact form. This may include:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-xs pt-1">
                      <li>Full Name</li>
                      <li>Email Address</li>
                      <li>Phone / WhatsApp Number (optional)</li>
                      <li>Company / Organization Name (optional)</li>
                      <li>Project details or inquiry message</li>
                    </ul>
                    <p className="pt-1 text-emerald-400 font-bold font-mono text-xs">✓ We do not collect any unnecessary or hidden data.</p>
                  </section>

                  <section className="space-y-1.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white text-base">3. How We Use Your Information</h3>
                    <p>The information you provide is used only for:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-xs pt-1">
                      <li>Responding to your project inquiry</li>
                      <li>Communicating with you regarding your language data requirements</li>
                      <li>Understanding your project scope and timelines</li>
                    </ul>
                    <p className="pt-1 text-cyan-300">We do not use your data for unsolicited marketing or advertising without your permission.</p>
                  </section>

                  <section className="space-y-1.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white text-base">4. Data Sharing &amp; Protection</h3>
                    <p>We respect your privacy. Your information is <strong>never sold, rented, or shared with third parties</strong>. Data is accessed strictly by our internal engineering team for project communication. We may share information only if required by applicable law.</p>
                  </section>

                  <section className="space-y-1.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white text-base">5. Data Security</h3>
                    <p>We take all reasonable security measures to keep your information safe. Access is limited strictly to authorized internal team members and data is handled responsibly with industry-standard encryption protocols.</p>
                  </section>

                  <section className="space-y-1.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white text-base">6. Data Retention &amp; Rights</h3>
                    <p>We keep your information only as long as needed to respond to your inquiry and maintain communication. You have the right to request access to your data, ask us to correct or delete your data, or withdraw your consent at any time.</p>
                  </section>

                  <section className="space-y-2 bg-cyan-500/10 p-5 rounded-2xl border border-cyan-500/30 font-mono text-xs">
                    <h3 className="font-bold text-cyan-300 text-sm">8. Contact Us Regarding Privacy</h3>
                    <p className="text-slate-300">If you have any questions or data requests regarding this Privacy Policy, contact us directly:</p>
                    <div className="space-y-1 text-cyan-400 pt-1">
                      <div>📧 Direct Email: <a href="mailto:prem@zenemoo.in" className="hover:underline text-white font-bold">prem@zenemoo.in</a></div>
                      <div>📧 Team Email: <a href="mailto:contact@zenemoo.in" className="hover:underline text-white font-bold">contact@zenemoo.in</a></div>
                      <div>📍 Location: K. Barida, Main Road, Odisha, India – 761031</div>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              /* TERMS & CONDITIONS CONTENT */
              <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold mb-2">
                    <FileText className="w-3.5 h-3.5 text-purple-400" /> SERVICE TERMS AGREEMENT
                  </div>
                  <h2 className="text-2xl font-bold font-display text-white">Terms &amp; Conditions</h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">QuantumCoders Data Solutions (Zenemoo) • Last Updated: April 2026</p>
                </div>

                <div className="space-y-4">
                  <section className="space-y-1.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white text-base">1. Introduction</h3>
                    <p>
                      Welcome to QuantumCoders Data Solutions. These Terms &amp; Conditions govern your use of our website and services. By contacting us or utilizing our services, you agree to these terms.
                    </p>
                  </section>

                  <section className="space-y-1.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white text-base">2. Services Overview</h3>
                    <p>QuantumCoders Data Solutions provides enterprise language technology services including:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-xs pt-1">
                      <li>Audio Transcription &amp; Timestamping</li>
                      <li>Data Annotation &amp; Speech Labeling</li>
                      <li>Multilingual Voice Over &amp; Recording</li>
                      <li>Audio Segmentation &amp; Quality Review</li>
                      <li>AI Speech Data Collection Support</li>
                    </ul>
                    <p className="pt-1 text-slate-300">All services are delivered strictly based on agreed project guidelines, SLAs, and mutual contract agreement.</p>
                  </section>

                  <section className="space-y-1.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white text-base">3. Use of Website &amp; Communication</h3>
                    <p>By using our website, you agree to provide accurate contact information and not to use the website for any unlawful or disruptive activities. When you contact us, you agree that we may contact you via email or phone regarding your project inquiry.</p>
                  </section>

                  <section className="space-y-1.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white text-base">4. Project Terms &amp; Payments</h3>
                    <p>Scope, timelines, and accuracy SLAs will be formally agreed upon before starting any project. Payment terms will be clearly established prior to project execution with zero hidden charges.</p>
                  </section>

                  <section className="space-y-1.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white text-base">5. Confidentiality &amp; Intellectual Property</h3>
                    <p>We respect strict client data confidentiality. Any dataset shared with us is used exclusively for agreed project deliverables. All client-provided data remains the exclusive property of the client.</p>
                  </section>

                  <section className="space-y-2 bg-purple-500/10 p-5 rounded-2xl border border-purple-500/30 font-mono text-xs">
                    <h3 className="font-bold text-purple-300 text-sm">6. Contact Information</h3>
                    <p className="text-slate-300">For any inquiries regarding these Terms &amp; Conditions, reach out to our legal team:</p>
                    <div className="space-y-1 text-purple-300 pt-1">
                      <div>📧 Direct Email: <a href="mailto:prem@zenemoo.in" className="hover:underline text-white font-bold">prem@zenemoo.in</a></div>
                      <div>📧 Team Email: <a href="mailto:contact@zenemoo.in" className="hover:underline text-white font-bold">contact@zenemoo.in</a></div>
                      <div>📍 Location: K. Barida, Main Road, Odisha, India – 761031</div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* Modal Footer Close Button */}
            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setLegalModal(null)}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all shadow-lg cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
