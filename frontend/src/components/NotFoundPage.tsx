import React, { useState } from 'react';
import {
  Search,
  ArrowLeft,
  Home,
  Mic,
  Languages,
  Database,
  Users,
  Briefcase,
  Mail,
  Sparkles,
  Cpu,
  ChevronRight,
  HelpCircle,
  FileText,
  Compass,
  X,
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CursorSpotlight } from './CursorSpotlight';
import { ThreeNeuralBackground } from './ThreeNeuralBackground';

interface NotFoundPageProps {
  onOpenAiDrawer: () => void;
}

interface QuickLinkItem {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  isAiAction?: boolean;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onOpenAiDrawer }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchablePages = [
    { name: 'Home & Platform Overview', path: '/', category: 'Main Page', icon: Home, keyword: 'home main platform overview landing' },
    { name: 'AI Language Services', path: '/#languages', category: 'Solutions', icon: Languages, keyword: 'languages speech nlp translation indic global' },
    { name: 'Audio & Speech Annotation', path: '/#services', category: 'Solutions', icon: Mic, keyword: 'services audio transcription annotation speech data' },
    { name: 'Data Annotation & Quality QA', path: '/#services', category: 'Solutions', icon: Database, keyword: 'data annotation quality validation datasets vision' },
    { name: 'Executive Team & Staff Directory', path: '/team-directory', category: 'Company', icon: Users, keyword: 'team directory leadership roster members staff' },
    { name: 'Career & Program Opportunities', path: '/opportunities', category: 'Careers', icon: Briefcase, keyword: 'opportunities careers jobs desicrew roles programs' },
    { name: 'Contact & Enterprise Inquiries', path: '/#contact', category: 'Support', icon: Mail, keyword: 'contact email support sales enterprise inquiry' },
    { name: 'Zenemoo AI Assistant', path: 'ai_drawer', category: 'AI Tools', icon: Sparkles, keyword: 'ai assistant bot help search query chat' },
  ];

  const filteredSuggestions = searchQuery.trim()
    ? searchablePages.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keyword.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleNavigate = (path: string) => {
    if (path === 'ai_drawer') {
      onOpenAiDrawer();
      return;
    }
    if (path.startsWith('http')) {
      window.location.href = path;
      return;
    }
    window.history.pushState(null, '', path);
    window.dispatchEvent(new Event('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const quickLinks: QuickLinkItem[] = [
    {
      title: 'AI Language Services',
      description: 'Speech recognition, translation, and NLP tools for 50+ global & Indic languages.',
      href: '/#languages',
      icon: Languages,
      badge: 'Multilingual',
    },
    {
      title: 'Audio Transcription',
      description: 'High-precision, human-in-the-loop audio-to-text annotation at scale.',
      href: '/#services',
      icon: Mic,
      badge: 'High Accuracy',
    },
    {
      title: 'Data Annotation',
      description: 'Enterprise dataset labeling across text, speech, vision, and custom LLM tuning.',
      href: '/#services',
      icon: Database,
      badge: 'Enterprise QA',
    },
    {
      title: 'Team Directory',
      description: 'Explore executive leadership, AI specialists, and project contributors.',
      href: '/team-directory',
      icon: Users,
      badge: 'Leadership Roster',
    },
    {
      title: 'Career Opportunities',
      description: 'Join Zenemoo as an AI contributor, data annotator, or software engineer.',
      href: '/opportunities',
      icon: Briefcase,
      badge: 'We Are Hiring',
    },
    {
      title: 'Contact Us',
      description: 'Reach our customer solutions team for enterprise dataset partnerships.',
      href: '/#contact',
      icon: Mail,
      badge: 'Support 24/7',
    },
    {
      title: 'Zenemoo AI Assistant',
      description: 'Ask our multilingual AI copilot to instantly find information or query datasets.',
      href: 'ai_drawer',
      icon: Sparkles,
      badge: 'Interactive AI',
      isAiAction: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] light:bg-[#f8fafc] text-slate-100 light:text-slate-900 relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-300 font-sans flex flex-col justify-between">
      {/* Interactive Mouse Spotlight */}
      <CursorSpotlight />

      {/* 3D WebGL Neural Background Canvas */}
      <ThreeNeuralBackground />

      {/* Shared Production Header Navbar */}
      <Navbar onOpenAiDrawer={onOpenAiDrawer} />

      {/* Main Content Area */}
      <main className="relative z-10 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Top Floating Badge & Status */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-500/10 light:bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 light:text-cyan-600 text-xs font-mono tracking-widest uppercase shadow-lg shadow-cyan-500/10 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span>404 ERROR • PAGE NOT FOUND</span>
          </div>
        </div>

        {/* Hero Banner Grid (Split Layout: 404 Info & AI Illustration) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          {/* Left Column: Text Content & Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Main 404 Animated Title */}
            <div className="relative inline-block">
              <h1 className="text-8xl sm:text-9xl font-black font-display tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_10px_35px_rgba(6,182,212,0.35)] select-none">
                404
              </h1>
              <div className="absolute -top-3 -right-6 px-3 py-1 bg-purple-500/20 border border-purple-400/40 rounded-lg text-purple-300 text-xs font-mono font-bold rotate-6 backdrop-blur-md hidden sm:block">
                ROUTE NOT FOUND
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white light:text-slate-900 leading-tight">
              Looks Like This Page <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                Doesn't Exist
              </span>
            </h2>

            <p className="text-base sm:text-lg text-slate-300 light:text-slate-600 max-w-2xl leading-relaxed font-normal">
              The page you're looking for may have been moved, renamed, or is no longer available.
              <br className="hidden sm:block" />
              Don't worry—you can continue exploring Zenemoo's AI language, transcription, annotation, and enterprise data services from the links below.
            </p>

            {/* Interactive Search Bar */}
            <div className="relative max-w-xl mx-auto lg:mx-0 pt-2">
              <div
                className={`relative flex items-center bg-slate-900/80 light:bg-white/90 border rounded-2xl transition-all duration-300 backdrop-blur-xl ${
                  isSearchFocused
                    ? 'border-cyan-400 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-500/20'
                    : 'border-white/10 light:border-black/10 hover:border-cyan-500/40'
                }`}
              >
                <Search className="w-5 h-5 ml-4 text-cyan-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  placeholder="Search the Zenemoo website..."
                  className="w-full px-4 py-3.5 bg-transparent text-sm text-slate-100 light:text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mr-3 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {searchQuery.trim() && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900/95 light:bg-white/95 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/50 backdrop-blur-2xl z-50 overflow-hidden divide-y divide-white/5">
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((item, idx) => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            handleNavigate(item.path);
                            setSearchQuery('');
                          }}
                          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-cyan-500/10 light:hover:bg-cyan-50 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                              <IconComp className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white light:text-slate-900 group-hover:text-cyan-300">
                                {item.name}
                              </div>
                              <div className="text-xs text-slate-400 font-mono">{item.category}</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-400 font-mono">
                      No matching pages found for "{searchQuery}". Try "Services", "Team", or "Careers".
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-4">
              <button
                onClick={() => handleNavigate('/')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Home</span>
              </button>

              <button
                onClick={() => handleNavigate('/#services')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 light:bg-black/5 hover:bg-white/10 light:hover:bg-black/10 text-slate-200 light:text-slate-800 border border-white/10 light:border-black/10 font-semibold text-sm hover:border-cyan-500/40 transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>Explore Services</span>
              </button>

              <button
                onClick={() => handleNavigate('/team-directory')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 light:bg-black/5 hover:bg-white/10 light:hover:bg-black/10 text-slate-200 light:text-slate-800 border border-white/10 light:border-black/10 font-semibold text-sm hover:border-purple-500/40 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-purple-400" />
                <span>Browse Team</span>
              </button>
            </div>
          </div>

          {/* Right Column: Premium Custom AI Circuit & Mesh 404 Illustration */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div className="relative w-full max-w-md aspect-square rounded-3xl bg-gradient-to-b from-cyan-500/10 via-purple-500/5 to-transparent border border-white/10 light:border-black/10 p-8 flex flex-col items-center justify-center shadow-2xl backdrop-blur-2xl group overflow-hidden">
              {/* Outer Glowing Background Effects */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-purple-500/10 to-transparent blur-2xl group-hover:scale-110 transition-transform duration-700 pointer-events-none" />

              {/* Central Glowing AI Hologram Node */}
              <div className="relative z-10 w-44 h-44 rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-600/30 border border-cyan-400/40 p-4 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.3)] animate-pulse">
                {/* Embedded Circuit Lines SVG */}
                <svg className="absolute inset-0 w-full h-full text-cyan-400/30 animate-spin-slow" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="10 5" />
                </svg>

                <div className="w-28 h-28 rounded-full bg-slate-950 border border-cyan-400/60 flex flex-col items-center justify-center p-3 shadow-inner text-center">
                  <Cpu className="w-10 h-10 text-cyan-400 mb-1 animate-bounce" />
                  <span className="text-[10px] font-mono text-purple-300 uppercase tracking-wider font-bold">
                    AI SIGNAL 404
                  </span>
                </div>
              </div>

              {/* Floating Satellite Orbiting Nodes */}
              <div className="absolute top-10 left-10 p-3 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-lg shadow-cyan-500/20 backdrop-blur-md animate-float">
                <Mic className="w-5 h-5 text-cyan-400" />
              </div>

              <div className="absolute bottom-12 left-8 p-3 rounded-2xl bg-slate-900/90 border border-purple-500/30 shadow-lg shadow-purple-500/20 backdrop-blur-md animate-float-delayed">
                <Languages className="w-5 h-5 text-purple-400" />
              </div>

              <div className="absolute top-12 right-8 p-3 rounded-2xl bg-slate-900/90 border border-blue-500/30 shadow-lg shadow-blue-500/20 backdrop-blur-md animate-float">
                <Database className="w-5 h-5 text-blue-400" />
              </div>

              <div className="absolute bottom-14 right-10 p-3 rounded-2xl bg-slate-900/90 border border-pink-500/30 shadow-lg shadow-pink-500/20 backdrop-blur-md animate-float-delayed">
                <FileText className="w-5 h-5 text-pink-400" />
              </div>

              {/* Bottom Card Caption */}
              <div className="relative z-10 mt-8 text-center">
                <p className="text-xs font-mono text-cyan-300 font-semibold tracking-wide uppercase">
                  ZENEMOO NEURAL DISCOVERY ENGINE
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Intelligent dataset routing & error mitigation system.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Helpful Quick Links Grid */}
        <div className="mt-16 pt-12 border-t border-white/10 light:border-black/10">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-2xl sm:text-3xl font-bold text-white light:text-slate-900 tracking-tight">
              Popular Zenemoo Destinations
            </h3>
            <p className="text-sm text-slate-400 light:text-slate-600 mt-2">
              Explore our core platform modules, AI services, directory, and career openings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {quickLinks.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div
                  key={idx}
                  onClick={() => handleNavigate(item.href)}
                  className={`group relative p-6 rounded-2xl bg-slate-900/60 light:bg-white/80 border border-white/10 light:border-black/10 hover:border-cyan-500/50 light:hover:border-cyan-500/50 transition-all duration-300 shadow-xl backdrop-blur-xl cursor-pointer hover:-translate-y-1 ${
                    item.isAiAction ? 'sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-cyan-950/40 via-purple-950/30 to-slate-900/60 border-cyan-500/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${item.isAiAction ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white' : 'bg-cyan-500/10 text-cyan-400 light:text-cyan-600'} group-hover:scale-110 transition-transform`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    {item.badge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/5 light:bg-black/5 text-cyan-300 light:text-cyan-700 border border-white/10">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-white light:text-slate-900 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                    <span>{item.title}</span>
                    <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-cyan-400" />
                  </h4>

                  <p className="text-xs text-slate-400 light:text-slate-600 mt-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Helpful AI Assistant Trigger Card */}
        <div className="mt-14 p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-cyan-950/60 via-slate-900/90 to-purple-950/60 border border-cyan-500/30 backdrop-blur-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 text-center md:text-left">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 text-white shadow-lg shadow-cyan-500/30 shrink-0 hidden sm:block">
              <Sparkles className="w-8 h-8 animate-spin-slow" />
            </div>
            <div>
              <h4 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center justify-center md:justify-start gap-2">
                <span>Need assistance?</span>
                <HelpCircle className="w-5 h-5 text-cyan-400 inline-block" />
              </h4>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Our AI Assistant can help you find the right page, query training datasets, or navigate the platform instantly.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenAiDrawer}
            className="shrink-0 flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-white font-bold text-sm shadow-xl shadow-cyan-500/30 hover:shadow-cyan-400/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-cyan-200" />
            <span>Open Zenemoo AI</span>
          </button>
        </div>
      </main>

      {/* Shared Production Footer */}
      <Footer />
    </div>
  );
};

export default NotFoundPage;
