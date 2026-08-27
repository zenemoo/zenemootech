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
  ChevronRight,
  HelpCircle,
  Compass,
  X,
  Star,
  UserCheck,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CursorSpotlight } from './CursorSpotlight';

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
    { name: 'Home & Platform Overview', path: '/', category: 'Main Page', icon: Home, keyword: 'home main platform overview landing zenemoo' },
    { name: 'AI Data Portfolio & Public Datasets', path: '/ai-data', category: 'Datasets', icon: Database, keyword: 'ai data portfolio datasets audio video json csv speech samples dataset' },
    { name: 'Community & Client Reviews', path: '/review', category: 'Reviews', icon: Star, keyword: 'reviews review feedback ratings testimonials client community worker' },
    { name: 'Career & Program Opportunities', path: '/opportunities', category: 'Careers', icon: Briefcase, keyword: 'opportunities careers jobs roles programs work remote wfh' },
    { name: 'AI Language Services', path: '/#languages', category: 'Solutions', icon: Languages, keyword: 'languages speech nlp translation indic global odia hindi' },
    { name: 'Audio & Speech Annotation', path: '/#services', category: 'Solutions', icon: Mic, keyword: 'services audio transcription annotation speech data segmentation' },
    { name: 'Data Annotation & Quality QA', path: '/#services', category: 'Solutions', icon: Database, keyword: 'data annotation quality validation datasets vision LLM tuning' },
    { name: 'Executive Team & Staff Directory', path: '/team-directory', category: 'Company', icon: Users, keyword: 'team directory leadership roster members staff' },
    { name: 'AI Data Talent & Partner Registration', path: '/talent-registration', category: 'Network', icon: UserCheck, keyword: 'talent registration register partner native speaker coordinator vendor agency contributor' },
    { name: 'Contact & Enterprise Inquiries', path: '/#contact', category: 'Support', icon: Mail, keyword: 'contact email support sales enterprise inquiry' },
    { name: 'Zenemoo AI Assistant', path: 'ai_drawer', category: 'AI Tools', icon: Sparkles, keyword: 'ai assistant bot help search query chat prompt' },
    { name: 'Terms & Conditions', path: '/terms', category: 'Legal', icon: FileText, keyword: 'terms conditions agreement policies rules usage legal' },
    { name: 'Privacy Policy', path: '/privacy', category: 'Legal', icon: ShieldCheck, keyword: 'privacy policy data protection security gdpr confidential' },
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
      title: 'AI Data Portfolio',
      description: 'Explore public speech audio samples, video datasets, image corpora, and metadata.',
      href: '/ai-data',
      icon: Database,
      badge: 'Public Datasets',
    },
    {
      title: 'Client & Community Reviews',
      description: 'Read verified testimonials, worker feedback, and partner ratings for Zenemoo.',
      href: '/review',
      icon: Star,
      badge: 'Verified Ratings',
    },
    {
      title: 'Program Opportunities',
      description: 'Join active AI annotation campaigns, partner projects, and remote work programs.',
      href: '/opportunities',
      icon: Briefcase,
      badge: 'We Are Hiring',
    },
    {
      title: 'Team Directory',
      description: 'Explore executive leadership, AI language specialists, and project leads.',
      href: '/team-directory',
      icon: Users,
      badge: 'Leadership Roster',
    },
    {
      title: 'Talent Network Registration',
      description: 'Register as a native speaker, project coordinator, recording team, or vendor agency.',
      href: '/talent-registration',
      icon: UserCheck,
      badge: 'Join Network',
    },
    {
      title: 'AI Language Services',
      description: 'Speech recognition, transcription, and NLP tools for 50+ global & Indic languages.',
      href: '/#languages',
      icon: Languages,
      badge: 'Multilingual AI',
    },
    {
      title: 'Terms & Privacy Policies',
      description: 'Official enterprise terms of service, candidate agreements, and data privacy policies.',
      href: '/terms',
      icon: ShieldCheck,
      badge: 'Legal & Safety',
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
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0B0B0F] text-slate-900 dark:text-slate-100 relative overflow-x-hidden selection:bg-[#F25636]/30 selection:text-[#F25636] transition-colors duration-300 font-sans flex flex-col justify-between">
      {/* Interactive Mouse Spotlight */}
      <CursorSpotlight />

      {/* Shared Production Header Navbar */}
      <Navbar onOpenAiDrawer={onOpenAiDrawer} />

      {/* Main Content Card Wrapper (Inspired by reference card canvas) */}
      <main className="relative z-10 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex-grow">
        {/* Central White/Dark Card Container */}
        <div className="bg-white dark:bg-[#14131A] rounded-3xl p-6 sm:p-10 lg:p-14 shadow-2xl border border-amber-900/5 dark:border-white/10 backdrop-blur-xl">
          
          {/* Main Hero Section: Left Text + Right Illustration */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Title, Subtitle & 3D Coral Retro Button */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F25636]/10 text-[#F25636] text-xs font-mono font-bold uppercase tracking-wider">
                Error 404 • Page Not Found
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                Oops, Wrong Turn...
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed font-normal">
                Looks like you've wandered off the beaten path. Our team is working to get you back on track and find what you're looking for.
              </p>

              {/* Primary 3D Coral Button (Reference Image Styling) */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={() => handleNavigate('/')}
                  className="relative px-8 py-3.5 rounded-2xl bg-white dark:bg-[#1E1C24] text-[#F25636] dark:text-[#FF7D5C] font-bold text-base border-2 border-[#F25636] dark:border-[#FF7D5C] shadow-[6px_6px_0px_0px_#F25636] dark:shadow-[6px_6px_0px_0px_#FF7D5C] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#F25636] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none transition-all cursor-pointer inline-flex items-center gap-2.5 group"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  <span>Back To Home</span>
                </button>

                <button
                  onClick={() => handleNavigate('/#services')}
                  className="px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <Compass className="w-4 h-4 text-[#F25636]" />
                  <span>Explore Services</span>
                </button>
              </div>

              {/* Interactive Search Bar */}
              <div className="relative max-w-xl mx-auto lg:mx-0 pt-4">
                <div
                  className={`relative flex items-center bg-slate-50 dark:bg-white/5 border rounded-2xl transition-all duration-300 ${
                    isSearchFocused
                      ? 'border-[#F25636] ring-2 ring-[#F25636]/20 bg-white dark:bg-slate-900'
                      : 'border-slate-200 dark:border-white/10 hover:border-[#F25636]/50'
                  }`}
                >
                  <Search className="w-5 h-5 ml-4 text-[#F25636] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    placeholder="Search the Zenemoo website..."
                    className="w-full px-4 py-3.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mr-3 p-1 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {searchQuery.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1E1C24] border border-[#F25636]/30 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
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
                            className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[#F25636]/10 transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-[#F25636]/10 text-[#F25636] group-hover:scale-110 transition-transform">
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#F25636]">
                                  {item.name}
                                </div>
                                <div className="text-xs text-slate-400 font-mono">{item.category}</div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#F25636] group-hover:translate-x-1 transition-all" />
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-500 font-mono">
                        No matching pages found for "{searchQuery}". Try "Services", "Team", or "Careers".
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Custom Vector SVG Illustration (Matching Reference Image Artwork) */}
            <div className="lg:col-span-6 flex justify-center items-center">
              <div className="relative w-full max-w-lg aspect-[4/3] flex items-center justify-center p-4">
                <svg
                  viewBox="0 0 600 500"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full drop-shadow-xl"
                >
                  {/* Background Accents & Floating Dots */}
                  <circle cx="280" cy="180" r="6" fill="#F25636" />
                  <circle cx="450" cy="160" r="5" fill="#F25636" />
                  <circle cx="310" cy="245" r="4" fill="#222222" />
                  <polygon points="310,240 318,248 302,248" fill="#222222" />
                  <polygon points="445,195 452,205 438,205" fill="#F25636" />
                  <polygon points="345,120 353,130 338,130" stroke="#F25636" strokeWidth="2" fill="none" />
                  <rect x="340" y="65" width="8" height="8" fill="#F25636" transform="rotate(45 340 65)" />

                  {/* High Vertical Rectangle Block with Top Bird */}
                  <rect x="295" y="165" width="110" height="105" rx="4" transform="rotate(-25 295 165)" stroke="#1E1E1E" strokeWidth="2.5" fill="#FFFFFF" />
                  {/* Stippled / Gradient Shading on Top Block */}
                  <path d="M 295 210 L 375 170 L 395 210 Z" fill="url(#stipple-orange)" opacity="0.8" />

                  {/* Small Bird perched on top block */}
                  <g transform="translate(370, 60)">
                    <path d="M 12 25 C 12 15, 20 8, 30 12 C 38 15, 40 25, 30 32 C 22 36, 12 33, 12 25 Z" stroke="#1E1E1E" strokeWidth="2.5" fill="#FFFFFF" />
                    <path d="M 30 12 Q 42 10 40 18 Q 30 20 30 12" stroke="#1E1E1E" strokeWidth="2" fill="#F25636" />
                    <circle cx="26" cy="18" r="2.5" fill="#1E1E1E" />
                    <path d="M 20 34 L 18 45 M 24 34 L 25 45" stroke="#1E1E1E" strokeWidth="2" />
                    <path d="M 10 20 Q -2 15 5 28" stroke="#1E1E1E" strokeWidth="2" fill="#FFFFFF" />
                  </g>

                  {/* Cylinder lying horizontal */}
                  <g transform="translate(190, 260) rotate(-15)">
                    <rect x="0" y="0" width="90" height="40" rx="6" stroke="#1E1E1E" strokeWidth="2.5" fill="#FFFFFF" />
                    <ellipse cx="90" cy="20" rx="12" ry="20" stroke="#1E1E1E" strokeWidth="2.5" fill="#F25636" opacity="0.8" />
                  </g>

                  {/* Sphere with Swirl pattern */}
                  <g transform="translate(370, 240)">
                    <circle cx="45" cy="45" r="45" stroke="#1E1E1E" strokeWidth="2.5" fill="#FFFFFF" />
                    <path d="M 20 40 C 25 20, 65 20, 70 45 C 72 65, 30 75, 35 45" stroke="#1E1E1E" strokeWidth="2" fill="none" />
                  </g>

                  {/* Red Pyramid / Triangle block */}
                  <polygon points="440,330 495,265 520,330" stroke="#1E1E1E" strokeWidth="2.5" fill="url(#coral-grad)" />

                  {/* Left Side Staggered Botanical Leaves */}
                  <g transform="translate(160, 310)">
                    <path d="M 10 70 Q -10 20 20 0 Q 30 40 10 70 Z" stroke="#1E1E1E" strokeWidth="2.5" fill="#FFFFFF" />
                    <path d="M 10 70 Q -10 20 20 0" stroke="#F25636" strokeWidth="2" />
                    <path d="M 30 80 Q 15 35 45 15 Q 50 55 30 80 Z" stroke="#1E1E1E" strokeWidth="2.5" fill="url(#coral-grad)" opacity="0.85" />
                  </g>

                  {/* Right Side Botanical Fan Leaves */}
                  <g transform="translate(480, 290)">
                    <path d="M 10 100 Q 40 20 50 100 Z" stroke="#1E1E1E" strokeWidth="2.5" fill="url(#coral-grad)" />
                    <path d="M 30 100 Q 70 30 75 100 Z" stroke="#1E1E1E" strokeWidth="2.5" fill="#FFFFFF" />
                    <path d="M 30 100 L 70 30" stroke="#F25636" strokeWidth="1.5" />
                  </g>

                  {/* Center Square Box with Flower Icon */}
                  <rect x="205" y="315" width="105" height="95" rx="4" stroke="#1E1E1E" strokeWidth="2.5" fill="#FFFFFF" />
                  <circle cx="257" cy="350" r="14" stroke="#1E1E1E" strokeWidth="2" fill="none" />
                  <path d="M 257 336 C 250 325 264 325 257 336 Z M 257 364 C 250 375 264 375 257 364 Z M 243 350 C 232 343 232 357 243 350 Z M 271 350 C 282 343 282 357 271 350 Z" stroke="#1E1E1E" strokeWidth="1.5" fill="#F25636" />
                  <path d="M 257 364 L 257 395 M 245 385 Q 257 375 257 385 M 269 385 Q 257 375 257 385" stroke="#1E1E1E" strokeWidth="2" />

                  {/* Central Character Peeking Over Box */}
                  <g transform="translate(265, 240)">
                    {/* Character Hair / Head Accent */}
                    <path d="M 30 20 C 20 0, 50 -10, 60 15 C 70 -5, 90 10, 75 30 Z" fill="#1E1E1E" />
                    {/* Character Head */}
                    <circle cx="50" cy="50" r="32" stroke="#1E1E1E" strokeWidth="2.5" fill="#FF8C73" />
                    {/* Big Curious Eyes */}
                    <circle cx="40" cy="45" r="8" fill="#FFFFFF" stroke="#1E1E1E" strokeWidth="2" />
                    <circle cx="42" cy="45" r="3.5" fill="#1E1E1E" />
                    <circle cx="60" cy="45" r="8" fill="#FFFFFF" stroke="#1E1E1E" strokeWidth="2" />
                    <circle cx="62" cy="45" r="3.5" fill="#1E1E1E" />
                    {/* Cheeks */}
                    <circle cx="33" cy="55" r="4" fill="#F25636" opacity="0.6" />
                    <circle cx="67" cy="55" r="4" fill="#F25636" opacity="0.6" />
                  </g>

                  {/* Character Arms Resting at Bottom */}
                  <path
                    d="M 265 345 C 265 320, 310 320, 335 345 C 360 320, 410 320, 410 345 C 410 380, 265 380, 265 345 Z"
                    stroke="#1E1E1E"
                    strokeWidth="2.5"
                    fill="url(#coral-grad)"
                  />
                  {/* Finger outline detail */}
                  <path d="M 310 355 C 310 375, 330 375, 335 355 M 340 355 C 340 375, 360 375, 365 355" stroke="#1E1E1E" strokeWidth="2" fill="none" />

                  {/* Gradient Definitions */}
                  <defs>
                    <linearGradient id="coral-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF7D5C" />
                      <stop offset="100%" stopColor="#F25636" />
                    </linearGradient>

                    <linearGradient id="stipple-orange" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F25636" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#FF9E85" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>

          {/* Section 2: Popular Zenemoo Quick Link Cards */}
          <div className="mt-16 pt-12 border-t border-slate-100 dark:border-white/10">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Popular Zenemoo Destinations
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
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
                    className={`group relative p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-[#F25636] transition-all duration-300 shadow-md hover:shadow-xl cursor-pointer hover:-translate-y-1 ${
                      item.isAiAction ? 'sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-[#F25636]/10 to-amber-500/10 border-[#F25636]/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${item.isAiAction ? 'bg-[#F25636] text-white' : 'bg-[#F25636]/10 text-[#F25636]'} group-hover:scale-110 transition-transform`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      {item.badge && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200/60 dark:bg-white/10 text-[#F25636]">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#F25636] transition-colors flex items-center gap-1.5">
                      <span>{item.title}</span>
                      <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#F25636]" />
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Helpful AI Assistant Trigger Card */}
          <div className="mt-14 p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#F25636]/15 via-slate-900/90 to-purple-950/60 text-white border border-[#F25636]/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 text-center md:text-left">
              <div className="p-4 rounded-2xl bg-[#F25636] text-white shadow-lg shadow-[#F25636]/30 shrink-0 hidden sm:block">
                <Sparkles className="w-8 h-8 animate-spin-slow" />
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center justify-center md:justify-start gap-2">
                  <span>Need assistance?</span>
                  <HelpCircle className="w-5 h-5 text-[#F25636] inline-block" />
                </h4>
                <p className="text-sm text-slate-300 mt-1 max-w-xl">
                  Our AI Assistant can help you find the right page instantly.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenAiDrawer}
              className="shrink-0 flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-[#F25636] hover:bg-[#E04727] text-white font-bold text-sm shadow-xl shadow-[#F25636]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-white" />
              <span>Open Zenemoo AI</span>
            </button>
          </div>

        </div>
      </main>

      {/* Shared Production Footer */}
      <Footer />
    </div>
  );
};

export default NotFoundPage;
