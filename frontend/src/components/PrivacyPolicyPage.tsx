import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Lock,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Cpu,
  Mic,
  Bell,
  Smartphone,
  Database,
  Globe,
  ArrowUp,
  Search,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Scale,
  Clock,
  Printer,
  Sparkles,
} from 'lucide-react';
import { CursorSpotlight } from './CursorSpotlight';
import { ThreeNeuralBackground } from './ThreeNeuralBackground';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface PrivacyPolicyPageProps {
  onBack?: () => void;
  onOpenAiDrawer?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack, onOpenAiDrawer }) => {
  const [activeSection, setActiveSection] = useState('intro');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Monitor scroll for Table of Contents active item and Back-to-Top button
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      setShowBackToTop(totalScroll > 400);

      // Spy on section headers
      const sectionElements = document.querySelectorAll('section[id]');
      let current = 'intro';
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
      { id: 'intro', title: '1. Introduction & Scope', icon: Shield },
      { id: 'fiduciary', title: '2. Identity of Data Fiduciary', icon: Scale },
      { id: 'collection', title: '3. Information We Collect', icon: Database },
      { id: 'usage', title: '4. How We Use Information', icon: CheckCircle2 },
      { id: 'ai-processing', title: '5. AI Processing & Provider Routing', icon: Cpu },
      { id: 'voice-privacy', title: '6. Voice Input & Speech Recognition', icon: Mic },
      { id: 'notifications-privacy', title: '7. Push Notifications & Subscriptions', icon: Bell },
      { id: 'android-privacy', title: '8. Android App & APK Telemetry', icon: Smartphone },
      { id: 'third-parties', title: '9. Sub-Processors & Cloud Services', icon: Globe },
      { id: 'retention', title: '10. Data Retention & Deletion', icon: Clock },
      { id: 'security', title: '11. Data Security & Technical Safeguards', icon: Lock },
      { id: 'dpdp-rights', title: '12. Digital Personal Data Rights (DPDP)', icon: UserCheck },
      { id: 'permissions', title: '13. Device & Browser Permissions', icon: Smartphone },
      { id: 'children', title: '14. Children’s Privacy', icon: Shield },
      { id: 'updates', title: '15. Policy Changes & Versioning', icon: FileText },
      { id: 'contact-grievance', title: '16. Grievance Redressal & Contact', icon: Mail },
    ],
    []
  );

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    return sections.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [sections, searchQuery]);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 font-sans print:bg-white print:text-slate-900">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 16mm 14mm 16mm 14mm;
            @bottom-left {
              content: "Zenemoo Data Solutions • Privacy Policy • zenemoo.in";
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
            border-left: 3pt solid #0284c7 !important;
            padding: 6pt 8pt !important;
            margin: 6pt 0 !important;
            break-inside: avoid !important;
          }
          .text-cyan-400, .text-cyan-300, .text-purple-400, .text-purple-300, .text-blue-400, .text-emerald-400 {
            color: #0369a1 !important;
          }
          .text-slate-400, .text-slate-500, .text-slate-300, .text-slate-200 {
            color: #334155 !important;
          }
          .text-white {
            color: #0f172a !important;
          }
          a {
            color: #0369a1 !important;
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
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">OFFICIAL PRIVACY POLICY</div>
              <div className="text-[10px] text-slate-600 font-mono">Version 1.0 &bull; Effective: August 2026</div>
              <div className="text-[10px] text-slate-500 font-mono">Compliance: India DPDP Act 2023 &amp; Rules 2025</div>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation (Screen Only) */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-mono text-slate-400 no-print">
          <a href="/" className="hover:text-cyan-400 transition-colors">
            Home
          </a>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-slate-200">Legal Documentation</span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-cyan-400 font-semibold">Privacy Policy</span>
        </nav>

        {/* Hero Header Card (Screen Only) */}
        <header className="glass-panel p-6 sm:p-10 rounded-3xl border border-cyan-500/30 mb-10 relative overflow-hidden bg-gradient-to-br from-cyan-950/20 via-slate-900/40 to-transparent no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold tracking-wide">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> OFFICIAL LEGAL COMPLIANCE
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white tracking-tight">
                Zenemoo Privacy Policy
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Transparency, user control, and rigorous data protection practices across the Zenemoo Website,
                Enterprise Portals, Zenemoo AI, and the Zenemoo Android Application.
              </p>
            </div>

            {/* Document Meta Badges */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
              <div className="px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 font-mono text-xs text-slate-300">
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Document Version</span>
                <span className="text-cyan-400 font-bold">Version 1.0 (Production)</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 font-mono text-xs text-slate-300">
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Effective & Updated</span>
                <span className="text-slate-200 font-bold">August 2026</span>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20"
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
                  placeholder="Filter sections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full font-mono"
                />
              </div>

              {/* Navigation Items */}
              <div className="glass-panel p-4 rounded-2xl border border-white/10 max-h-[calc(100vh-220px)] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-3 py-1 font-bold">
                  Contents &bull; 16 Sections
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
                          ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span className="truncate">{sec.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Contact Card */}
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs space-y-2">
                <span className="font-mono font-bold text-cyan-400 block">Privacy Questions?</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Contact the Zenemoo data protection desk for consent withdrawal, data queries, or correction.
                </p>
                <a
                  href="mailto:contact@zenemoo.in"
                  className="inline-flex items-center gap-1.5 text-cyan-300 hover:underline font-mono text-[11px] font-bold"
                >
                  <Mail className="w-3 h-3" /> contact@zenemoo.in
                </a>
              </div>
            </div>
          </aside>

          {/* Right Main Legal Text Body */}
          <article className="lg:col-span-8 space-y-12 text-sm text-slate-300 leading-relaxed font-sans">
            {/* Section 1: Introduction & Scope */}
            <section id="intro" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  1
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Introduction &amp; Scope of this Policy
                </h2>
              </div>
              <p>
                This Privacy Policy ("Privacy Policy") governs the collection, processing, storage, disclosure, and protection of
                personal and technical information by <strong>Zenemoo Data Solutions</strong> (formerly known as QuantumCoders Data
                Solution, herein referred to as "Zenemoo", "we", "us", or "our").
              </p>
              <p>
                This policy applies across all digital surfaces operated by Zenemoo, including:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-200">
                <li className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>The official website: <strong>https://www.zenemoo.in</strong></span>
                </li>
                <li className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>The Zenemoo Android App (Package: <strong>in.zenemoo.app</strong>)</span>
                </li>
                <li className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Zenemoo AI Assistant & Voice Interface</span>
                </li>
                <li className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Enterprise Dashboards, Opportunities & Talent Registration</span>
                </li>
              </ul>
              <p className="text-xs text-slate-400 pt-2 border-t border-white/5">
                By accessing, browsing, registering on, or interacting with our services, you acknowledge that you have read, understood,
                and agreed to the collection and handling practices described in this document.
              </p>
            </section>

            {/* Section 2: Identity of Data Fiduciary */}
            <section id="fiduciary" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  2
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Identity of the Data Fiduciary
                </h2>
              </div>
              <p>
                Under applicable Indian privacy jurisprudence, including the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>,
                the designated Data Fiduciary responsible for determining the purposes and means of personal data processing is:
              </p>
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 text-xs font-mono text-slate-200">
                <p className="font-bold text-white text-sm">Zenemoo Data Solutions</p>
                <p className="text-slate-400">Enterprise AI Language &amp; Multilingual Speech Annotation Services</p>
                <p className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  Main Road, K. Barida, Ganjam, Odisha, India – 761031
                </p>
                <p className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  Official Contact: <a href="mailto:contact@zenemoo.in" className="text-cyan-400 hover:underline">contact@zenemoo.in</a>
                </p>
                <div className="pt-2 text-[11px] text-cyan-300/80">
                  🏛️ Registered Micro Enterprise under MSME (Udyam), Ministry of Micro, Small and Medium Enterprises, Government of India.
                </div>
              </div>
            </section>

            {/* Section 3: Information We Collect */}
            <section id="collection" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  3
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Information We Collect
                </h2>
              </div>
              <p>
                We adhere strictly to data minimization principles. We do not collect unnecessary data. Depending on which feature of
                Zenemoo you utilize, we process the following categories of information:
              </p>

              {/* 3.1 Directly Provided */}
              <div className="space-y-2 border-l-2 border-cyan-500/40 pl-4">
                <h3 className="text-base font-bold text-white font-display">3.1 Information You Provide Directly</h3>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                  <li><strong>Contact Inquiries:</strong> Full name, email address, message body, optional company/organization name.</li>
                  <li><strong>Dispatch Newsletter:</strong> Email address for receiving platform updates.</li>
                  <li><strong>Reviews & Feedback:</strong> Name, role, rating, feedback text, project domain.</li>
                </ul>
              </div>

              {/* 3.2 Account & Auth */}
              <div className="space-y-2 border-l-2 border-purple-500/40 pl-4">
                <h3 className="text-base font-bold text-white font-display">3.2 Account &amp; Authentication Credentials</h3>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                  <li><strong>Authorized Portal Accounts (Admin, HR, Team, User):</strong> Name, designated email address, cryptographically hashed passwords (using industry-standard bcrypt hashing; raw passwords are never saved or accessible to anyone), employee ID, assigned role.</li>
                  <li><strong>Session Tokens:</strong> Cryptographically signed JSON Web Tokens (JWT) stored in your browser's local storage (<code className="text-cyan-300 font-mono">zenemoo_jwt_token</code>) to maintain your secure authenticated session.</li>
                </ul>
              </div>

              {/* 3.3 Opportunities */}
              <div className="space-y-2 border-l-2 border-blue-500/40 pl-4">
                <h3 className="text-base font-bold text-white font-display">3.3 Career &amp; Opportunity Applications</h3>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                  <li><strong>Application Submissions:</strong> Full name, contact email, phone/WhatsApp number, current location, educational background, years of experience, target language proficiencies (e.g., Odia, Hindi, Bengali, Tamil, Telugu), resume/portfolio URLs, and custom cover notes.</li>
                </ul>
              </div>

              {/* 3.4 AI Interaction */}
              <div className="space-y-2 border-l-2 border-emerald-500/40 pl-4">
                <h3 className="text-base font-bold text-white font-display">3.4 AI Interaction &amp; Query Prompts</h3>
                <p className="text-xs text-slate-300">
                  When you submit prompts, text queries, or questions to <strong>Zenemoo AI</strong>, the text of your prompt and conversation
                  context is transmitted to our backend router to generate real-time AI responses.
                </p>
              </div>

              {/* 3.5 Device & Telemetry */}
              <div className="space-y-2 border-l-2 border-amber-500/40 pl-4">
                <h3 className="text-base font-bold text-white font-display">3.5 Device, Network &amp; Technical Telemetry</h3>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                  <li><strong>Standard Technical Headers:</strong> IP addresses (processed transiently for rate limiting, DDoS mitigation, and geographical routing), browser type and version, operating system, device platform (<code className="text-cyan-300 font-mono">web</code> or <code className="text-cyan-300 font-mono">android</code>), and access timestamps.</li>
                  <li><strong>App Version Telemetry:</strong> Installed app version code (e.g., v2.0.4) used exclusively to check for security updates and new official release availability.</li>
                </ul>
              </div>
            </section>

            {/* Section 4: How We Use Information */}
            <section id="usage" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  4
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  How We Use Collected Information
                </h2>
              </div>
              <p>
                We use information solely for lawful, specific, and transparent business purposes:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Providing &amp; Operating Services
                  </span>
                  <p className="text-slate-400">Enabling core website browsing, enterprise dashboards, talent registration, and data exports.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> AI Assistant Operations
                  </span>
                  <p className="text-slate-400">Routing queries to suitable AI providers to generate instant, context-aware answers.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" /> Candidate &amp; Opportunity Processing
                  </span>
                  <p className="text-slate-400">Reviewing and evaluating contractor/job applications submitted for published opportunities.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-cyan-400" /> Notification Delivery
                  </span>
                  <p className="text-slate-400">Delivering opt-in push alerts for published opportunities, system notices, and app releases.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" /> Security &amp; Fraud Prevention
                  </span>
                  <p className="text-slate-400">Protecting against malicious traffic, unauthorized dashboard access, and token spoofing.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-cyan-400" /> Legal &amp; Regulatory Compliance
                  </span>
                  <p className="text-slate-400">Maintaining requisite audit logs and adhering to applicable Indian commercial laws.</p>
                </div>
              </div>
            </section>

            {/* Section 5: AI Data Processing & Provider Architecture */}
            <section id="ai-processing" className="glass-panel p-6 sm:p-10 rounded-3xl border border-cyan-500/30 space-y-5 bg-gradient-to-br from-cyan-950/10 via-slate-900/40 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  5
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  AI Data Processing &amp; Provider Architecture
                </h2>
              </div>
              <p>
                Zenemoo operates an intelligent, high-availability multi-provider AI architecture designed for maximum reliability. When
                you interact with Zenemoo AI, your prompts are routed securely through our backend router (<code className="text-cyan-300 font-mono">aiRouter.js</code>)
                to one of several independent enterprise AI inference providers.
              </p>

              {/* Provider Chain */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <span className="font-mono text-xs text-cyan-400 font-bold block uppercase tracking-wider">
                  Active Multi-Provider Routing Pool:
                </span>
                <p className="text-xs text-slate-300">
                  Depending on live network availability, provider latency, rate limits, and circuit-breaker telemetry, requests are dynamically routed across:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                  <span className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-slate-200">1. Groq Cloud</span>
                  <span className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-slate-200">2. Google Gemini API</span>
                  <span className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-slate-200">3. Mistral AI</span>
                  <span className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-slate-200">4. Cerebras AI</span>
                  <span className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-slate-200">5. OpenRouter (Emergency)</span>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold font-mono text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  IMPORTANT SENSITIVE DATA WARNING FOR AI PROMPTS
                </div>
                <p>
                  <strong>Do not submit passwords, banking information, credit card numbers, confidential business secrets, government IDs, or sensitive personal data into Zenemoo AI prompts.</strong>
                </p>
                <p className="text-amber-300/80">
                  While all API communication is encrypted in transit via TLS 1.3 and server API keys are kept strictly private on server environments, external AI inference engines process prompt text to generate answers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-slate-300 space-y-1.5">
                <span className="font-bold text-white font-display">AI Output Accuracy &amp; Independence Disclaimer</span>
                <p className="text-slate-400 leading-relaxed">
                  Zenemoo AI generates answers through probabilistic machine learning models. Output may occasionally contain inaccuracies, hallucinations, or outdated information. AI responses must not be relied upon as legal, medical, financial, or formal employment advice without independent human verification.
                </p>
              </div>
            </section>

            {/* Section 6: Voice Input & Speech Recognition */}
            <section id="voice-privacy" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  6
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Voice Input &amp; Speech-to-Text Privacy
                </h2>
              </div>
              <p>
                Zenemoo offers an optional hands-free voice feature via the 🎙️ <strong>Voice Button</strong> on web and Android app.
              </p>
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">1. Permission-Controlled Microphone Access:</span>
                  <p className="text-slate-400">
                    The microphone is accessed <em>only</em> after you explicitly tap the voice button and grant native browser or Android operating system microphone permission.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">2. Local Speech-to-Text Conversion:</span>
                  <p className="text-slate-400">
                    Speech recognition is performed using the client device's standard <strong>Web Speech API</strong> (<code className="text-cyan-300 font-mono">SpeechRecognition</code> / <code className="text-cyan-300 font-mono">webkitSpeechRecognition</code>). Zenemoo does not record, harvest, or store raw audio files on backend servers.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">3. Transcript Submission:</span>
                  <p className="text-slate-400">
                    Only the resulting text transcript is placed into the input box and sent to Zenemoo AI when you choose to submit your query.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">4. Permission Revocation:</span>
                  <p className="text-slate-400">
                    You can revoke microphone permission at any time through your browser site settings or Android App Permissions menu without affecting text-based features.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 7: Push Notifications & Subscriptions */}
            <section id="notifications-privacy" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  7
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Push Notifications &amp; Subscription Data
                </h2>
              </div>
              <p>
                Zenemoo includes an opt-in multi-channel push notification system powered by Web Push VAPID and Android Firebase Cloud Messaging (FCM HTTP v1).
              </p>
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">What is Stored for Notifications:</span>
                  <ul className="list-disc list-inside text-slate-400 space-y-1 pt-1">
                    <li>An anonymous unique installation identifier (<code className="text-cyan-300 font-mono">installation_id</code>) generated per browser/device.</li>
                    <li>Platform tag (<code className="text-cyan-300 font-mono">web</code> or <code className="text-cyan-300 font-mono">android</code>).</li>
                    <li>Web Push encryption endpoint &amp; public keys (<code className="text-cyan-300 font-mono">p256dh</code>, <code className="text-cyan-300 font-mono">auth</code>) for browsers.</li>
                    <li>FCM Device Token for Android apps.</li>
                    <li>Read/unread status timestamps for the in-app Notification Center.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">Types of Notifications Sent:</span>
                  <p className="text-slate-400">
                    New opportunity alerts, team operational dispatches, administrative updates, and new Android app release notifications.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">How to Opt Out / Unsubscribe:</span>
                  <p className="text-slate-400">
                    You can disable notifications at any time in your browser settings (Site Settings &rarr; Notifications &rarr; Block) or in Android Settings &rarr; Apps &rarr; Zenemoo &rarr; Notifications.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 8: Android App & APK Telemetry */}
            <section id="android-privacy" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  8
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Android Application &amp; APK Distribution Telemetry
                </h2>
              </div>
              <p>
                The Zenemoo Android App is built on Capacitor modern WebView architecture. When using the Android app or downloading APKs from <code className="text-cyan-300 font-mono">https://www.zenemoo.in/app/android</code>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                <li>We verify APK authenticity through cryptographic SHA-256 checksums published transparently on our release page.</li>
                <li>The app queries <code className="text-cyan-300 font-mono">GET /api/notifications/app-version</code> upon startup to detect if a newer stable release is published.</li>
                <li>We do not bundle third-party ad networks, tracking SDKs, or background location harvesters inside the APK.</li>
              </ul>
            </section>

            {/* Section 9: Third-Party Sub-Processors */}
            <section id="third-parties" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  9
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Third-Party Service Providers &amp; Sub-Processors
                </h2>
              </div>
              <p>
                To provide reliable global hosting, encrypted databases, email notifications, and AI processing, we partner with vetted enterprise cloud providers:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">Database &amp; Storage:</span>
                  <p className="text-slate-400"><strong>Supabase Inc.</strong> — Managed PostgreSQL with Row-Level Security (RLS).</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">Cloud API Hosting:</span>
                  <p className="text-slate-400"><strong>Render Services Inc.</strong> — Secure backend container hosting.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">Static Web Hosting &amp; Edge CDN:</span>
                  <p className="text-slate-400"><strong>Vercel Inc. / Cloudflare Inc.</strong> — Global CDN, DDoS mitigation &amp; edge SSL.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">Push Notification Infrastructure:</span>
                  <p className="text-slate-400"><strong>Google Firebase (FCM)</strong> — Android Push messaging delivery.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">Transactional Email:</span>
                  <p className="text-slate-400"><strong>Brevo (Sendinblue)</strong> — Contact inquiry and verification emails.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-bold text-white font-mono">AI Inference Providers:</span>
                  <p className="text-slate-400"><strong>Groq, Google Cloud, Mistral AI, Cerebras, OpenRouter</strong> — Large language model processing.</p>
                </div>
              </div>
            </section>

            {/* Section 10: Data Retention & Deletion */}
            <section id="retention" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  10
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Data Retention &amp; Deletion
                </h2>
              </div>
              <p>
                We retain personal information only for as long as reasonably necessary to fulfill the purposes outlined in this Privacy Policy, including for service operations, candidate screening, platform security, legal compliance, resolving disputes, and enforcing our agreements.
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
                <li><strong>Contact Inquiries:</strong> Retained for communication history and archived periodically.</li>
                <li><strong>Opportunity Applications:</strong> Retained during the active screening cycle and candidate talent pool matching.</li>
                <li><strong>Notification Subscriptions:</strong> Inactive device subscriptions are purged automatically if tokens expire or become invalid.</li>
                <li><strong>Account Data:</strong> Retained for the duration of the account’s active tenure and deleted upon verified account removal requests.</li>
              </ul>
            </section>

            {/* Section 11: Data Security */}
            <section id="security" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  11
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Data Security &amp; Technical Safeguards
                </h2>
              </div>
              <p>
                We implement comprehensive, industry-standard technical and organizational security measures designed to safeguard your information against accidental or unlawful destruction, loss, alteration, and unauthorized disclosure:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-slate-200">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-cyan-400 font-bold">🔒 TLS 1.3 Transport Encryption</span>
                  <p className="text-slate-400 font-sans text-[11px]">All HTTP web and API traffic is forced over HTTPS with modern SSL/TLS cryptographic ciphers.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-cyan-400 font-bold">🛡️ Server-Side Secret Isolation</span>
                  <p className="text-slate-400 font-sans text-[11px]">All AI provider keys, database credentials, and VAPID private keys reside in secure server environment variables and are never exposed to browser clients.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-cyan-400 font-bold">🔑 Bcrypt Password Hashing</span>
                  <p className="text-slate-400 font-sans text-[11px]">Passwords undergo salted, compute-intensive one-way cryptographic hashing before storage.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-cyan-400 font-bold">🛡️ Role-Based Access Controls</span>
                  <p className="text-slate-400 font-sans text-[11px]">Strict least-privilege verification controls database mutations and administrative dashboards.</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 italic pt-1">
                Please note that while we implement rigorous safeguards, no method of transmission over the internet or electronic storage is 100% immune from all risks.
              </p>
            </section>

            {/* Section 12: Digital Personal Data Rights (DPDP Act, 2023) */}
            <section id="dpdp-rights" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  12
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Your Rights Under the Digital Personal Data Protection Act, 2023 (DPDP)
                </h2>
              </div>
              <p>
                As a user residing in India or interacting with an Indian Data Fiduciary, you hold specific statutory rights under the <strong>Digital Personal Data Protection Act, 2023</strong> and associated rules as notified:
              </p>
              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Right to Access Information:</strong> You may request a summary of the personal data undergoing processing and the identities of third-party processors.
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Right to Correction &amp; Updating:</strong> You may request correction of inaccurate or incomplete personal data.
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Right to Erasure / Deletion:</strong> You may request deletion of your personal data unless retention is required by applicable law or ongoing contract.
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Right to Withdraw Consent:</strong> You may withdraw previously given consent for notifications or communications at any time.
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Right of Grievance Redressal:</strong> You have the right to accessible grievance redressal mechanisms provided by Zenemoo.
                  </div>
                </div>
              </div>
            </section>

            {/* Section 13: Device & Browser Permissions */}
            <section id="permissions" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  13
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Device &amp; Browser Permissions
                </h2>
              </div>
              <p>
                Our services only request device permissions when strictly necessary for an interactive user action:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-cyan-400 font-bold flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" /> Microphone</span>
                  <p className="text-slate-400 font-sans text-[11px]">Requested only when clicking the 🎙️ Voice input button.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-cyan-400 font-bold flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Notifications</span>
                  <p className="text-slate-400 font-sans text-[11px]">Requested only when opting in to receive platform updates.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-cyan-400 font-bold flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Network State</span>
                  <p className="text-slate-400 font-sans text-[11px]">Used by Android app to detect offline/online state smoothly.</p>
                </div>
              </div>
            </section>

            {/* Section 14: Children's Privacy */}
            <section id="children" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  14
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Children's Privacy
                </h2>
              </div>
              <p>
                Zenemoo’s enterprise data solutions, career opportunities, and platform features are directed towards individuals who are at least 18 years of age or possess legal capacity in their jurisdiction. We do not knowingly collect personal data from minors. If you believe a minor has submitted personal information to us, please contact us immediately for prompt deletion.
              </p>
            </section>

            {/* Section 15: Policy Updates */}
            <section id="updates" className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  15
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Changes to this Privacy Policy
                </h2>
              </div>
              <p>
                We may periodically update this Privacy Policy to reflect technical enhancements, architectural updates, new service features, or changes in legal requirements. When updates occur, we revise the "Last Updated" date at the top of this document. Continued use of Zenemoo following any update constitutes your acceptance of the revised policy.
              </p>
            </section>

            {/* Section 16: Grievance Redressal & Contact Information */}
            <section id="contact-grievance" className="glass-panel p-6 sm:p-10 rounded-3xl border border-cyan-500/40 space-y-5 bg-gradient-to-br from-cyan-950/20 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  16
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                  Grievance Redressal &amp; Privacy Contact
                </h2>
              </div>
              <p>
                In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, if you have any questions, requests for data access, correction, deletion, or grievances regarding our data practices, please contact our Privacy &amp; Grievance Desk:
              </p>
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5 text-xs font-mono text-slate-200">
                <p className="font-bold text-white text-sm">Zenemoo Privacy &amp; Grievance Desk</p>
                <p className="text-slate-400">Attn: Legal &amp; Data Protection Officer</p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                  Primary Email: <a href="mailto:contact@zenemoo.in" className="text-cyan-400 hover:underline">contact@zenemoo.in</a>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                  Support Desk: <a href="mailto:support@zenemoo.in" className="text-cyan-400 hover:underline">support@zenemoo.in</a>
                </p>
                <p className="flex items-start gap-2 pt-1">
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Physical Address: Main Road, K. Barida, Ganjam, Odisha, India – 761031</span>
                </p>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                We will acknowledge and respond to all verified privacy and data correction requests within the statutory timeline mandated by applicable Indian regulations.
              </p>
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
              <p>Official Legal Document &bull; privacy@zenemoo.in</p>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Back to Top Button (Screen Only) */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-cyan-500 text-black shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 transition-all cursor-pointer transform hover:scale-110 no-print"
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
