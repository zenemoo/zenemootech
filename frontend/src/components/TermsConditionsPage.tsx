import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Scale,
  Shield,
  Lock,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Mic,
  Bell,
  Smartphone,
  Globe,
  ArrowUp,
  Search,
  ChevronRight,
  UserCheck,
  Clock,
  Printer,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { CursorSpotlight } from './CursorSpotlight';
import { ThreeNeuralBackground } from './ThreeNeuralBackground';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface TermsConditionsPageProps {
  onBack?: () => void;
  onOpenAiDrawer?: () => void;
}

export const TermsConditionsPage: React.FC<TermsConditionsPageProps> = ({ onBack, onOpenAiDrawer }) => {
  const [activeSection, setActiveSection] = useState('acceptance');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Monitor scroll for Table of Contents active item and Back-to-Top button
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      setShowBackToTop(totalScroll > 400);

      // Spy on section headers
      const sectionElements = document.querySelectorAll('section[id]');
      let current = 'acceptance';
      sectionElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 180 && rect.bottom >= 100) {
          current = el.id;
        }
      });
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 90;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const sections = useMemo(
    () => [
      { id: 'acceptance', title: '1. Acceptance & Eligibility', icon: Scale },
      { id: 'accounts', title: '2. Accounts & Security', icon: UserCheck },
      { id: 'acceptable-use', title: '3. Acceptable Use Policy', icon: Shield },
      { id: 'prohibited', title: '4. Prohibited Activities', icon: AlertTriangle },
      { id: 'app-terms', title: '5. Android App & Distribution', icon: Smartphone },
      { id: 'opportunities', title: '6. Career Listings & Applications', icon: Briefcase },
      { id: 'ai-terms', title: '7. Zenemoo AI Services Terms', icon: Cpu },
      { id: 'voice-terms', title: '8. Voice & Speech Input Terms', icon: Mic },
      { id: 'notifications-terms', title: '9. Push Notifications & Alerts', icon: Bell },
      { id: 'intellectual-property', title: '10. Intellectual Property Rights', icon: FileText },
      { id: 'user-content', title: '11. User Content & Submissions', icon: Globe },
      { id: 'availability', title: '12. Service Availability & Changes', icon: Clock },
      { id: 'warranties', title: '13. Disclaimer of Warranties', icon: AlertCircle },
      { id: 'liability', title: '14. Limitation of Liability', icon: Lock },
      { id: 'indemnity', title: '15. Indemnification', icon: Shield },
      { id: 'governing-law', title: '16. Governing Law & Jurisdiction', icon: Scale },
      { id: 'miscellaneous', title: '17. Severability & Entire Agreement', icon: FileText },
      { id: 'contact-terms', title: '18. Inquiries & Contact', icon: Mail },
    ],
    []
  );

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    return sections.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [sections, searchQuery]);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-200 font-sans print:bg-white print:text-slate-900">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 16mm 14mm 16mm 14mm;
            @bottom-left {
              content: "Zenemoo Data Solutions • Terms & Conditions • zenemoo.in";
              font-size: 8pt;
              font-family: monospace;
              color: #64748b;
            }
            @bottom-right {
              content: "Page " counter(page);
              font-size: 8pt;
              font-family: monospace;
              color: #64748b;
            }
          }
          body, html, #root {
            background: #ffffff !important;
            color: #0f172a !important;
          }
          nav, .no-print, header.glass-panel, aside, .cursor-spotlight, .bg-noise, .aurora-bg, canvas, button, [role="navigation"], footer {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .grid {
            display: block !important;
          }
          .lg\\:col-span-8 {
            width: 100% !important;
            max-width: 100% !important;
          }
          .glass-panel, section {
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            border-radius: 4px !important;
            color: #0f172a !important;
            padding: 10pt !important;
            margin-bottom: 12pt !important;
          }
          h1, h2, h3, h4 {
            color: #090d16 !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          h2 {
            font-size: 13pt !important;
            border-bottom: 1.5pt solid #cbd5e1 !important;
            padding-bottom: 3pt !important;
            margin-top: 12pt !important;
            margin-bottom: 6pt !important;
          }
          h3 {
            font-size: 10.5pt !important;
            margin-top: 8pt !important;
            margin-bottom: 3pt !important;
          }
          p, li, td, th {
            color: #1e293b !important;
            font-size: 9pt !important;
            line-height: 1.45 !important;
          }
          strong, b {
            color: #000000 !important;
            font-weight: 700 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 6pt 0 !important;
            break-inside: avoid !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 4pt 6pt !important;
            text-align: left !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: 700 !important;
          }
          .bg-amber-950\\/20, .bg-purple-950\\/20, .bg-cyan-950\\/20, .bg-emerald-950\\/20, .bg-red-950\\/20, .bg-slate-900\\/60, .bg-white\\/\\[0\\.02\\], .bg-white\\/\\[0\\.03\\] {
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-left: 3pt solid #7c3aed !important;
            padding: 6pt 8pt !important;
            margin: 6pt 0 !important;
            break-inside: avoid !important;
          }
          .text-cyan-400, .text-cyan-300, .text-purple-400, .text-purple-300, .text-blue-400, .text-emerald-400 {
            color: #6d28d9 !important;
          }
          .text-slate-400, .text-slate-500, .text-slate-300, .text-slate-200 {
            color: #334155 !important;
          }
          .text-white {
            color: #0f172a !important;
          }
          a {
            color: #6d28d9 !important;
            text-decoration: underline !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Interactive Mouse Spotlight (Screen Only) */}
      <div className="no-print">
        <CursorSpotlight />
      </div>

      {/* 3D WebGL Neural Background Canvas (Subtle on Legal Page, Screen Only) */}
      <div className="opacity-20 pointer-events-none fixed inset-0 z-0 overflow-hidden max-w-full no-print">
        <ThreeNeuralBackground />
      </div>

      {/* Sticky Production Navbar (Screen Only) */}
      <div className="no-print">
        <Navbar onOpenAiDrawer={onOpenAiDrawer} onBack={onBack} showBackButton={true} backButtonLabel="Home" />
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full print:pt-0 print:pb-0">
        {/* Formal Production Print Header (Visible ONLY during Print / Save as PDF) */}
        <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-800 print-only">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/assets/logo.png" alt="Zenemoo Official Logo" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">ZENEMOO DATA SOLUTIONS</h1>
                <p className="text-[10px] text-slate-600 font-mono">Bhubaneswar, Odisha, India &bull; https://zenemoo.in &bull; contact@zenemoo.in</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">TERMS &amp; CONDITIONS</div>
              <div className="text-[10px] text-slate-600 font-mono">Version 1.0 &bull; Effective: August 2026</div>
              <div className="text-[10px] text-slate-500 font-mono">Binding Legal Agreement &bull; Governing Law: Odisha, India</div>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation (Screen Only) */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-mono text-slate-400 no-print">
          <a href="/" className="hover:text-purple-400 transition-colors">
            Home
          </a>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-slate-200">Legal Documentation</span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-purple-400 font-semibold">Terms &amp; Conditions</span>
        </nav>

        {/* Hero Header Card (Screen Only) */}
        <header className="glass-panel p-6 sm:p-10 rounded-3xl border border-purple-500/30 mb-10 relative overflow-hidden bg-gradient-to-br from-purple-950/20 via-slate-900/40 to-transparent no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold tracking-wide">
                <Scale className="w-3.5 h-3.5 text-purple-400" /> BINDING LEGAL TERMS
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white tracking-tight">
                Zenemoo Terms &amp; Conditions
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Clear, transparent, and enforceable terms governing your use of Zenemoo's multilingual AI data platform,
                career opportunities, Android application, and AI services.
              </p>
            </div>

            {/* Document Meta Badges */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
              <div className="px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 font-mono text-xs text-slate-300">
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Document Version</span>
                <span className="text-purple-400 font-bold">Version 1.0 (Production)</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 font-mono text-xs text-slate-300">
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Effective & Updated</span>
                <span className="text-slate-200 font-bold">August 2026</span>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>
        </header>

        {/* 2-Column Documentation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Sticky Sidebar: Table of Contents */}
          <aside className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-28 space-y-4">
              {/* Quick Search */}
              <div className="glass-panel p-3 rounded-2xl border border-white/10 flex items-center gap-2 bg-slate-900/60">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter terms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full font-mono"
                />
              </div>

              {/* Navigation Items */}
              <div className="glass-panel p-4 rounded-2xl border border-white/10 max-h-[calc(100vh-220px)] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-3 py-1 font-bold">
                  Contents &bull; 18 Sections
                </div>
                {filteredSections.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer font-medium ${
                        isActive
                          ? 'bg-purple-500/15 border border-purple-500/40 text-purple-300 shadow-sm shadow-purple-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                      <span className="truncate">{sec.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Contact Card */}
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-xs space-y-2">
                <span className="font-mono font-bold text-purple-400 block">Questions on Terms?</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Reach out to the Zenemoo compliance team for contractual, licensing, or opportunity inquiries.
                </p>
                <a
                  href="mailto:contact@zenemoo.in"
                  className="inline-flex items-center gap-1.5 text-purple-300 hover:underline font-mono text-[11px] font-bold"
                >
                  <Mail className="w-3 h-3" /> contact@zenemoo.in
                </a>
              </div>
            </div>
          </aside>

          {/* Right Main Legal Text Body */}
          <article className="lg:col-span-8 space-y-12 text-sm text-slate-300 leading-relaxed font-sans">
            {/* Section 1: Acceptance & Eligibility */}
            <section id="acceptance" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  1
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Acceptance of Terms &amp; Eligibility
                </h2>
              </div>
              <p>
                These Terms &amp; Conditions ("Terms") constitute a legally binding agreement between you ("User", "you", or "your")
                and <strong>Zenemoo Data Solutions</strong> (formerly known as QuantumCoders Data Solution, "Zenemoo", "we", "us", or "our").
              </p>
              <p>
                By visiting, browsing, registering on, downloading the Android application of, or accessing any service of Zenemoo,
                you explicitly accept and agree to be bound by these Terms and our <a href="/privacy" className="text-purple-400 hover:underline">Privacy Policy</a>.
              </p>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-xs">
                <strong className="text-white block font-mono">Eligibility Requirements:</strong>
                <p className="text-slate-400">
                  You represent and warrant that you are at least 18 years of age (or have reached the age of majority in your jurisdiction) and possess full legal capacity to enter into this binding contract. If you are accessing our services on behalf of an enterprise or organization, you represent that you hold full authority to bind that entity.
                </p>
              </div>
            </section>

            {/* Section 2: Accounts & Security */}
            <section id="accounts" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  2
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Account Registration, Credentials &amp; Security
                </h2>
              </div>
              <ul className="list-disc list-inside space-y-2 text-xs text-slate-300">
                <li><strong>Credential Confidentiality:</strong> You are responsible for maintaining the confidentiality of your authentication credentials, session tokens, and passwords. You agree not to share your credentials with unauthorized third parties.</li>
                <li><strong>Notification of Unauthorized Access:</strong> You agree to notify Zenemoo immediately at <a href="mailto:support@zenemoo.in" className="text-purple-400 hover:underline">support@zenemoo.in</a> if you suspect any compromise, theft, or unauthorized use of your account.</li>
                <li><strong>Account Termination:</strong> Zenemoo reserves the right to suspend or terminate accounts that violate these Terms, engage in security tampering, or provide fraudulent identity information.</li>
              </ul>
            </section>

            {/* Section 3: Acceptable Use Policy */}
            <section id="acceptable-use" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  3
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Acceptable Use Policy
                </h2>
              </div>
              <p>
                Zenemoo provides cutting-edge multilingual language data solutions, AI training services, project opportunities, and an interactive AI assistant. You agree to use the platform exclusively for lawful, ethical, and authorized business purposes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-purple-400 font-bold">✓ Truthful Information</span>
                  <p className="text-slate-400 font-sans text-[11px]">Submit accurate talent details, contact inquiries, and skill proficiencies.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-purple-400 font-bold">✓ Respect Intellectual Property</span>
                  <p className="text-slate-400 font-sans text-[11px]">Do not infringe on copyrights, proprietary datasets, or trademarks.</p>
                </div>
              </div>
            </section>

            {/* Section 4: Prohibited Activities */}
            <section id="prohibited" className="glass-panel p-6 sm:p-10 rounded-3xl border border-rose-500/30 space-y-4 bg-gradient-to-br from-rose-950/10 via-slate-900/40 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-mono font-bold text-xs">
                  4
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Prohibited Activities
                </h2>
              </div>
              <p className="text-xs text-rose-200">
                You agree not to engage in any of the following prohibited behaviors:
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                  <span className="text-rose-400 font-bold shrink-0">✕</span>
                  <span><strong>Security Probing &amp; Exploitation:</strong> Attempting to probe, scan, breach, or bypass authentication controls, JWT tokens, or server firewalls.</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                  <span className="text-rose-400 font-bold shrink-0">✕</span>
                  <span><strong>Automated Scraping &amp; Denial of Service:</strong> Launching scraping bots, DDoS attacks, or aggressive request loops against our APIs, database, or AI endpoints.</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                  <span className="text-rose-400 font-bold shrink-0">✕</span>
                  <span><strong>Reverse Engineering:</strong> Decompiling, reverse engineering, or disassembling the Zenemoo Android APK, native bridges, or backend routing algorithms.</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                  <span className="text-rose-400 font-bold shrink-0">✕</span>
                  <span><strong>Harmful or Unlawful Content:</strong> Submitting malicious code, hate speech, defamatory material, or unlawful content into contact forms, applications, or AI prompts.</span>
                </div>
              </div>
            </section>

            {/* Section 5: Android Application & Distribution */}
            <section id="app-terms" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  5
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Android Application &amp; Distribution Terms
                </h2>
              </div>
              <p>
                Zenemoo grants you a revocable, non-exclusive, non-transferable, limited personal license to install and use the Zenemoo Android APK (<code className="text-purple-300 font-mono">in.zenemoo.app</code>) strictly in accordance with these Terms.
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                <li><strong>Official Distribution:</strong> Always download APKs exclusively from the official URL: <code className="text-purple-300 font-mono">https://www.zenemoo.in/app/android</code>. We are not responsible for modified or third-party cloned binaries.</li>
                <li><strong>Automatic Version Check:</strong> The app periodically checks for stable updates to deliver enhanced security and reliability fixes.</li>
              </ul>
            </section>

            {/* Section 6: Career Listings & Applications */}
            <section id="opportunities" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  6
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Opportunities, Project Listings &amp; Applications
                </h2>
              </div>
              <p>
                Zenemoo publishes language data opportunities, audio annotation roles, and specialized AI training projects.
              </p>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
                <strong className="text-amber-300 flex items-center gap-1.5 font-mono">
                  <AlertCircle className="w-4 h-4" /> No Employment or Selection Guarantee
                </strong>
                <p>
                  Publishing an opportunity does not guarantee project selection, employment, ongoing compensation, or freelancer allocation. Submitting an application is an expression of interest. Zenemoo reserves the right to evaluate candidates based on quality benchmarks, test audio accuracy standards, and active client project capacity.
                </p>
              </div>
            </section>

            {/* Section 7: Zenemoo AI Services Terms */}
            <section id="ai-terms" className="glass-panel p-6 sm:p-10 rounded-3xl border border-purple-500/30 space-y-4 bg-gradient-to-br from-purple-950/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  7
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Zenemoo AI Assistant Terms &amp; Limitations
                </h2>
              </div>
              <p>
                Zenemoo AI is an intelligent service assistance feature intended solely for informational, navigation, and productivity support.
              </p>
              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">1. Informational Nature &amp; Disclaimers:</span>
                  <p className="text-slate-400">
                    AI responses must not be treated as formal legal, medical, accounting, financial, employment, or technical architectural advice. You remain solely responsible for any decisions or actions taken based on AI output.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">2. Provider Routing Variability:</span>
                  <p className="text-slate-400">
                    Zenemoo routes prompts across multiple AI providers (Groq, Gemini, Mistral, Cerebras, OpenRouter). Availability, latency, and specific model versions may vary dynamically based on provider health and rate limits.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">3. Confidential Data Prohibition:</span>
                  <p className="text-slate-400">
                    You agree not to input confidential trade secrets, passwords, or personal identity numbers into AI chat prompts.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 8: Voice Features Terms */}
            <section id="voice-terms" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  8
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Voice &amp; Speech Input Terms
                </h2>
              </div>
              <p>
                The 🎙️ Voice button uses standard client-side Web Speech recognition to convert spoken queries to text. Speech recognition accuracy depends on your microphone quality, pronunciation, and background noise. Zenemoo is not responsible for transcription inaccuracies.
              </p>
            </section>

            {/* Section 9: Push Notifications Terms */}
            <section id="notifications-terms" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  9
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Push Notifications &amp; Communications
                </h2>
              </div>
              <p>
                By opting in to browser or Android notifications, you authorize Zenemoo to send administrative notices, opportunity alerts, and platform release announcements. You may disable alerts at any time via your device settings.
              </p>
            </section>

            {/* Section 10: Intellectual Property */}
            <section id="intellectual-property" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  10
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Intellectual Property Rights
                </h2>
              </div>
              <p>
                All proprietary software, code, logos, visual designs, brand names, speech annotation methodologies, UI components, and text on this platform are the exclusive intellectual property of <strong>Zenemoo Data Solutions</strong> or its licensors and are protected under Indian and international copyright and trademark laws.
              </p>
            </section>

            {/* Section 11: User Content */}
            <section id="user-content" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  11
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  User-Submitted Content &amp; Limited License
                </h2>
              </div>
              <p>
                You retain ownership of any portfolio samples, cover letters, or feedback you submit. By submitting content, you grant Zenemoo a worldwide, non-exclusive, royalty-free license to use, evaluate, and process that content strictly for candidate screening, service delivery, or platform improvement.
              </p>
            </section>

            {/* Section 12: Service Availability */}
            <section id="availability" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  12
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Service Availability, Maintenance &amp; Changes
                </h2>
              </div>
              <p>
                While we strive for maximum uptime and reliability, Zenemoo does not guarantee uninterrupted or error-free operation. We may perform scheduled maintenance, update AI provider routing, modify feature sets, or suspend access temporarily without liability.
              </p>
            </section>

            {/* Section 13: Disclaimer of Warranties */}
            <section id="warranties" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  13
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Disclaimer of Warranties
                </h2>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-slate-300 space-y-2">
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ZENEMOO SERVICES, THE WEBSITE, THE ANDROID APPLICATION, AND ZENEMOO AI ARE PROVIDED ON AN <strong>"AS IS"</strong> AND <strong>"AS AVAILABLE"</strong> BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
                </p>
              </div>
            </section>

            {/* Section 14: Limitation of Liability */}
            <section id="liability" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  14
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Limitation of Liability
                </h2>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-slate-300 space-y-2">
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ZENEMOO DATA SOLUTIONS, ITS FOUNDERS, OFFICERS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS OPPORTUNITY) ARISING OUT OF OR IN CONNECTION WITH YOUR ACCESS TO OR INABILITY TO ACCESS THE PLATFORM, AI RESPONSES, OR THIRD-PARTY OUTAGES.
                </p>
              </div>
            </section>

            {/* Section 15: Indemnification */}
            <section id="indemnity" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  15
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Indemnification
                </h2>
              </div>
              <p className="text-xs">
                You agree to defend, indemnify, and hold harmless Zenemoo Data Solutions from and against any claims, liabilities, damages, judgments, awards, losses, costs, or expenses (including reasonable legal fees) arising out of your violation of these Terms or misuse of the platform.
              </p>
            </section>

            {/* Section 16: Governing Law & Jurisdiction */}
            <section id="governing-law" className="glass-panel p-6 sm:p-10 rounded-3xl border border-purple-500/40 space-y-4 bg-gradient-to-br from-purple-950/20 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  16
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Governing Law &amp; Exclusive Jurisdiction
                </h2>
              </div>
              <p>
                These Terms and any disputes arising out of or relating to your use of Zenemoo shall be governed by, construed, and enforced in accordance with the substantive laws of <strong>India</strong>, without giving effect to any conflict of law principles.
              </p>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-mono text-slate-200">
                <strong className="text-white block">Jurisdiction:</strong>
                <p className="text-slate-400 font-sans pt-1">
                  You agree that any legal action, dispute, or proceeding arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts located in <strong>Ganjam / Odisha, India</strong>.
                </p>
              </div>
            </section>

            {/* Section 17: Severability & Entire Agreement */}
            <section id="miscellaneous" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  17
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Severability &amp; Entire Agreement
                </h2>
              </div>
              <p className="text-xs">
                If any provision of these Terms is found to be unlawful, void, or unenforceable, that provision shall be deemed severable and shall not affect the validity and enforceability of any remaining provisions. These Terms, together with our Privacy Policy, constitute the entire agreement between you and Zenemoo regarding platform access.
              </p>
            </section>

            {/* Section 18: Inquiries & Contact Information */}
            <section id="contact-terms" className="glass-panel p-6 sm:p-10 rounded-3xl border border-purple-500/40 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  18
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Legal Inquiries &amp; Contact
                </h2>
              </div>
              <p>
                For questions, licensing requests, or clarifications regarding these Terms &amp; Conditions, please contact:
              </p>
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs font-mono text-slate-200">
                <p className="font-bold text-white text-sm">Zenemoo Compliance &amp; Legal Desk</p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                  Primary Email: <a href="mailto:contact@zenemoo.in" className="text-purple-400 hover:underline">contact@zenemoo.in</a>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                  Support Desk: <a href="mailto:support@zenemoo.in" className="text-purple-400 hover:underline">support@zenemoo.in</a>
                </p>
                <p className="flex items-start gap-2 pt-1">
                  <MapPin className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Address: Main Road, K. Barida, Ganjam, Odisha, India – 761031</span>
                </p>
              </div>
            </section>
          </article>
        </div>

        {/* Formal Production Print Footer (Visible ONLY during Print / Save as PDF) */}
        <div className="hidden print:block mt-10 pt-4 border-t-2 border-slate-800 text-[9pt] text-slate-600 font-mono print-only">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-900">ZENEMOO DATA SOLUTIONS</p>
              <p className="text-[8pt] text-slate-500">Corporate &amp; AI Enterprise Services &bull; Bhubaneswar, Odisha, India &bull; zenemoo.in</p>
            </div>
            <div className="text-right text-[8pt] text-slate-500">
              <p>&copy; 2023&ndash;2026 Zenemoo Data Solutions. All rights reserved.</p>
              <p>Official Legal Document &bull; legal@zenemoo.in</p>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Back to Top Button (Screen Only) */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-purple-500 text-white shadow-lg shadow-purple-500/30 hover:bg-purple-400 transition-all cursor-pointer transform hover:scale-110 no-print"
          aria-label="Back to top"
          title="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Complete Production Shared Footer (Screen Only) */}
      <div className="no-print">
        <Footer />
      </div>
    </div>
  );
};
