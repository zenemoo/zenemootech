import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Sparkles,
  Bot,
  Calendar,
  Briefcase,
  Database,
  Users,
  Star,
  Mail,
  Shield,
  FileText,
  Smartphone,
  Layers,
  Compass,
  ArrowUpRight,
  Globe,
  Home,
  Menu,
  X,
  ChevronRight,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { SeoImage } from '../seo/components/SeoImage';
import { useActiveLogo } from '../lib/useActiveLogo';
import { NotificationCenter } from './NotificationCenter';
import { Footer } from './Footer';
import { FaLinkedin, FaXTwitter, FaInstagram, FaYoutube, FaWhatsapp } from 'react-icons/fa6';

interface DirectoryItem {
  id: string;
  title: string;
  category: 'solutions' | 'scheduling' | 'careers' | 'ai-apps' | 'company' | 'legal';
  categoryLabel: string;
  description: string;
  url: string;
  badge?: string;
  icon: any;
  featured?: boolean;
  dynamicNote?: string;
}

const DIRECTORY_ITEMS: DirectoryItem[] = [
  // Solutions & Services
  {
    id: 'services',
    title: 'Enterprise AI Services',
    category: 'solutions',
    categoryLabel: 'Solutions & Services',
    description: 'Multilingual speech annotation, audio transcription, voice over, LLM evaluation, and custom corpora engineering.',
    url: '/#services',
    badge: 'Core Service',
    icon: Layers,
    featured: true,
  },
  {
    id: 'languages',
    title: 'Multilingual Speech Solutions',
    category: 'solutions',
    categoryLabel: 'Solutions & Services',
    description: 'Explore live voice and audio dialect samples across Odia, Hindi, Bengali, Telugu, Tamil, Marathi, and regional Indian languages.',
    url: '/#languages',
    icon: Globe,
  },
  {
    id: 'ai-data-portfolio',
    title: 'AI Data Portfolio & Benchmark Corpora',
    category: 'solutions',
    categoryLabel: 'Solutions & Services',
    description: 'Public repository of acoustic speech corpora, vision datasets, audio waveforms, and licensing documentation.',
    url: '/ai-data',
    badge: 'Public Datasets',
    icon: Database,
    featured: true,
  },
  {
    id: 'zenemoo-ai',
    title: 'Zenemoo AI Assistant Engine',
    category: 'solutions',
    categoryLabel: 'Solutions & Services',
    description: 'Interactive multilingual AI engine with real-time speech recognition, prompt generation, and language tools.',
    url: '/zenemooai',
    badge: 'Live AI',
    icon: Bot,
    featured: true,
  },

  // Scheduling & Client Engagement
  {
    id: 'book-a-call',
    title: 'Book a 30-Minute Discovery Call',
    category: 'scheduling',
    categoryLabel: 'Scheduling & Engagement',
    description: 'Schedule a 1-on-1 strategy call with Zenemoo AI data engineers. Real-time availability, instant Google Meet link.',
    url: '/30min',
    badge: 'Direct Booking',
    icon: Calendar,
    featured: true,
  },
  {
    id: 'contact',
    title: 'Enterprise Contact & RFP Submission',
    category: 'scheduling',
    categoryLabel: 'Scheduling & Engagement',
    description: 'Direct inquiry channel for custom dataset requirements, project quotas, enterprise proposals, and pilot evaluations.',
    url: '/#contact',
    icon: Mail,
  },
  {
    id: 'reviews',
    title: 'Community & Client Reviews',
    category: 'scheduling',
    categoryLabel: 'Scheduling & Engagement',
    description: 'Verified worker feedback, partner ratings, and enterprise client testimonials on Zenemoo annotation quality.',
    url: '/review',
    badge: 'Verified',
    icon: Star,
  },

  // Careers & Opportunities
  {
    id: 'opportunities',
    title: 'Program Opportunities & Contributor Jobs',
    category: 'careers',
    categoryLabel: 'Careers & Opportunities',
    description: 'Explore live partner campaigns, audio collection projects, transcription gigs, and remote annotation openings.',
    url: '/opportunities',
    badge: 'Hiring',
    icon: Briefcase,
    featured: true,
    dynamicNote: 'Individual opportunity details accessible via /opportunity/:id from this portal.',
  },
  {
    id: 'talent-registration',
    title: 'Join AI Data Talent Network',
    category: 'careers',
    categoryLabel: 'Careers & Opportunities',
    description: 'Global linguist, speaker, recording coordinator, and vendor onboarding with acoustic specification intake.',
    url: '/talent-registration',
    badge: 'Global Intake',
    icon: Users,
  },
  {
    id: 'team-directory',
    title: 'Executive & Leadership Directory',
    category: 'careers',
    categoryLabel: 'Careers & Opportunities',
    description: 'Full organizational directory of AI researchers, project managers, annotation leads, and language coordinators.',
    url: '/team-directory',
    icon: Users,
    dynamicNote: 'Individual member profiles accessible via /team/:slug from this directory.',
  },

  // AI, Data & Applications
  {
    id: 'apps-hub',
    title: 'Zenemoo Applications Hub',
    category: 'ai-apps',
    categoryLabel: 'AI, Data & Applications',
    description: 'Official download center for Zenemoo mobile apps, platform toolkits, and client productivity extensions.',
    url: '/app',
    badge: 'App Hub',
    icon: Smartphone,
  },
  {
    id: 'android-app',
    title: 'Official Android APK Download',
    category: 'ai-apps',
    categoryLabel: 'AI, Data & Applications',
    description: 'Direct standalone Android APK binary download for mobile opportunity notifications, task logging, and AI audio tools.',
    url: '/app/android',
    icon: Smartphone,
  },

  // Company & Credentials
  {
    id: 'home',
    title: 'Zenemoo Official Homepage',
    category: 'company',
    categoryLabel: 'Company & Credentials',
    description: 'Corporate homepage featuring interactive telemetry counters, technology stack, and client partner credentials.',
    url: '/',
    icon: Home,
  },
  {
    id: 'partners',
    title: 'Partners & Government MSME Recognition',
    category: 'company',
    categoryLabel: 'Company & Credentials',
    description: 'Working with DesiCrew since 2023 and Government of India Udyam MSME accreditation.',
    url: '/#partners',
    badge: 'Accredited',
    icon: Sparkles,
  },
  {
    id: 'newsletter',
    title: 'Zenemoo Dispatch Newsletter',
    category: 'company',
    categoryLabel: 'Company & Credentials',
    description: 'Subscribe to monthly intelligence digests on Indian AI language corpora, speech benchmarks, and platform updates.',
    url: '/subscribe',
    icon: Mail,
  },

  // Legal & Policies
  {
    id: 'privacy',
    title: 'Privacy Policy & Data Security',
    category: 'legal',
    categoryLabel: 'Legal & Policies',
    description: 'Enterprise data confidentiality standards, candidate data protection, GDPR considerations, and push notification terms.',
    url: '/privacy',
    icon: Shield,
  },
  {
    id: 'terms',
    title: 'Terms & Conditions of Service',
    category: 'legal',
    categoryLabel: 'Legal & Policies',
    description: 'Official terms of service, candidate contributor agreements, intellectual property ownership, and client warranties.',
    url: '/terms',
    icon: FileText,
  },
  {
    id: 'unsubscribe',
    title: 'Newsletter Preference Center',
    category: 'legal',
    categoryLabel: 'Legal & Policies',
    description: 'One-click CAN-SPAM compliant unsubscribe and subscription preference management.',
    url: '/unsubscribe',
    icon: FileText,
  },
];

const NAV_SECTIONS = [
  { id: 'solutions', label: 'Solutions', icon: Layers },
  { id: 'scheduling', label: 'Scheduling', icon: Calendar },
  { id: 'careers', label: 'Careers', icon: Briefcase },
  { id: 'ai-apps', label: 'AI & Apps', icon: Bot },
  { id: 'company', label: 'Company', icon: Home },
  { id: 'connect', label: 'Connect', icon: Globe },
  { id: 'legal', label: 'Legal', icon: Shield },
];

export const ZenemooWebsiteDirectoryPage: React.FC<{ onBackToHome?: () => void; onOpenAiDrawer?: () => void }> = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('solutions');
  const { logoUrl, isLoading } = useActiveLogo();

  // Handle in-page smooth scrolling with URL hash update
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `/sitemap#${sectionId}`);
      setActiveSection(sectionId);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intelligent Scroll-Aware Active Section Tracker using IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sectionIds = ['solutions', 'scheduling', 'careers', 'ai-apps', 'company', 'connect', 'legal'];

    // Direct hash access handling on initial mount
    const currentHash = window.location.hash.replace('#', '');
    if (currentHash && sectionIds.includes(currentHash)) {
      setActiveSection(currentHash);
      setTimeout(() => {
        const el = document.getElementById(currentHash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }

    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '-90px 0px -40% 0px',
      threshold: [0.1, 0.3, 0.6],
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Auto-close mobile drawer when user scrolls or swipes on the background page outside drawer
  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow = '';
      return;
    }

    let touchStartY = 0;
    let isTouchOutsideDrawer = false;

    const handleTouchStart = (e: TouchEvent) => {
      const drawer = document.getElementById('mobile-navigation-drawer');
      if (drawer && !drawer.contains(e.target as Node)) {
        isTouchOutsideDrawer = true;
        touchStartY = e.touches[0].clientY;
      } else {
        isTouchOutsideDrawer = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isTouchOutsideDrawer) {
        const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
        if (deltaY > 6) {
          setMobileMenuOpen(false);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const drawer = document.getElementById('mobile-navigation-drawer');
      if (drawer && !drawer.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    const handleScroll = () => {
      setMobileMenuOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Schema.org Structured Data (JSON-LD) for WebPage, BreadcrumbList, and ItemList
  useEffect(() => {
    const jsonLdScript = document.createElement('script');
    jsonLdScript.type = 'application/ld+json';
    jsonLdScript.id = 'zenemoo-sitemap-schema';
    jsonLdScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': 'https://www.zenemoo.in/sitemap#webpage',
          url: 'https://www.zenemoo.in/sitemap',
          name: 'Zenemoo Website Directory | AI, Data Solutions, Careers & More',
          description:
            'Explore the official Zenemoo website directory for AI and data solutions, multilingual technology, scheduling, careers, applications, company information, resources, contact options, and legal pages.',
          inLanguage: 'en',
          isPartOf: {
            '@type': 'WebSite',
            '@id': 'https://www.zenemoo.in/#website',
            name: 'Zenemoo',
            url: 'https://www.zenemoo.in',
          },
        },
        {
          '@type': 'BreadcrumbList',
          '@id': 'https://www.zenemoo.in/sitemap#breadcrumb',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://www.zenemoo.in/',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Website Directory',
              item: 'https://www.zenemoo.in/sitemap',
            },
          ],
        },
        {
          '@type': 'ItemList',
          '@id': 'https://www.zenemoo.in/sitemap#itemlist',
          name: 'Zenemoo Public Website Directory',
          numberOfItems: DIRECTORY_ITEMS.length,
          itemListElement: DIRECTORY_ITEMS.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.title,
            description: item.description,
            url: item.url.startsWith('http') ? item.url : `https://www.zenemoo.in${item.url}`,
          })),
        },
      ],
    });

    document.head.appendChild(jsonLdScript);

    return () => {
      const existing = document.getElementById('zenemoo-sitemap-schema');
      if (existing) existing.remove();
    };
  }, []);

  const quickAccessItems = DIRECTORY_ITEMS.filter((item) => item.featured);

  const categories: { key: DirectoryItem['category']; title: string; subtitle: string }[] = [
    {
      key: 'solutions',
      title: 'Solutions & Services',
      subtitle: 'Enterprise audio transcription, speech annotation, dataset engineering, and AI language models.',
    },
    {
      key: 'scheduling',
      title: 'Scheduling & Client Engagement',
      subtitle: 'Discovery meetings, project inquiries, and verified community client reviews.',
    },
    {
      key: 'careers',
      title: 'Careers & Opportunities',
      subtitle: 'Partner opportunities, global linguist intake, and executive leadership roster.',
    },
    {
      key: 'ai-apps',
      title: 'AI, Data & Applications',
      subtitle: 'Public corpora benchmarks, speech waveforms, and official mobile applications.',
    },
    {
      key: 'company',
      title: 'Company & Credentials',
      subtitle: 'Corporate profile, government MSME recognition, and intelligence dispatch.',
    },
    {
      key: 'legal',
      title: 'Legal & Policies',
      subtitle: 'Data protection standards, candidate terms of service, and preference center.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-between">
      {/* 1. FIXED RESPONSIVE NAVBAR (MAIN WEBSITE VISUAL LANGUAGE + IN-PAGE DIRECTORY SCROLLING) */}
      <header
        aria-label="Website Directory Navigation"
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-[#050505]/90 backdrop-blur-xl border-b border-white/10 py-3 shadow-2xl shadow-cyan-950/30'
            : 'bg-[#050505]/85 backdrop-blur-md border-b border-white/10 py-3.5 sm:py-4 shadow-lg'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            {/* Logo & Company Name (ZENEMOO) */}
            <a href="/" className="flex items-center gap-3 group shrink-0" aria-label="Zenemoo Home">
              {isLoading ? (
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-slate-900 animate-pulse border border-white/10 shrink-0" />
              ) : (
                <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-400/50 group-hover:scale-105 transition-all duration-300 shrink-0">
                  <SeoImage
                    src={logoUrl || '/assets/logo.png'}
                    alt="Zenemoo Official Logo — Enterprise AI Language & Data Solutions"
                    priority={true}
                    width={44}
                    height={44}
                    className="w-full h-full object-contain rounded-full bg-white p-0.5"
                    fallbackSrc="/assets/logo.png"
                  />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-extrabold tracking-wider font-display text-white group-hover:text-cyan-400 transition-colors leading-none">
                  ZENEMOO
                </span>
                <span className="text-[9px] font-mono text-cyan-400 tracking-tight hidden sm:block mt-0.5">
                  Enterprise AI Language &amp; Data Solutions
                </span>
              </div>
            </a>

            {/* Center Desktop In-Page Directory Navigation Pill */}
            <nav className="hidden xl:flex items-center gap-1 bg-white/[0.03] p-1.5 rounded-full border border-white/10 backdrop-blur-md font-mono text-xs">
              {NAV_SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm shadow-cyan-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-white/10 font-medium'
                    }`}
                  >
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action Bar: Book a Call, Back to Home, Notification Bell & Hamburger */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Book a Call Button */}
              <a
                href="/30min"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book a Call</span>
              </a>

              {/* Back to Home */}
              <a
                href="/"
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/[0.05] hover:bg-white/10 text-slate-200 border border-white/10 font-mono text-xs font-semibold transition-all cursor-pointer"
              >
                <span>Back to Home</span>
              </a>

              {/* Centralized Notification Bell */}
              <NotificationCenter />

              {/* Mobile / Tablet Drawer Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 rounded-2xl bg-slate-900/90 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-slate-300" /> : <Menu className="w-5 h-5 text-cyan-400" />}
              </button>
            </div>
          </div>
        </div>

      </header>

      {/* MOBILE & TABLET SLIDE-IN NAVIGATION DRAWER SYSTEM */}
      {mobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-50 overflow-hidden">
          {/* Dark Translucent Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 cursor-pointer animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Floating Glassmorphic Slide-in Drawer Card */}
          <div
            id="mobile-navigation-drawer"
            className="absolute top-3 right-3 bottom-3 w-[calc(100%-24px)] max-w-sm sm:max-w-md h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] bg-[#080912]/95 border border-cyan-500/25 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between overflow-y-auto no-scrollbar z-50 text-slate-100 animate-fade-in"
          >
            {/* Top Container: Header + Navigation Links */}
            <div className="flex-1 flex flex-col justify-between min-h-0">
              {/* Drawer Top Header: Logo, Title, Subtitle & Close Button */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5 sm:pb-3 shrink-0">
                <a href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileMenuOpen(false)}>
                  <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 shrink-0">
                    <SeoImage
                      src={logoUrl || '/assets/logo.png'}
                      alt="Zenemoo Logo"
                      width={40}
                      height={40}
                      className="w-full h-full object-contain rounded-full bg-white p-0.5"
                      fallbackSrc="/assets/logo.png"
                    />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold tracking-wider font-display text-white group-hover:text-cyan-400 transition-colors leading-tight">
                      ZENEMOO
                    </h3>
                    <p className="text-[10px] font-mono text-cyan-400 tracking-tight">
                      Enterprise AI Language &amp; Data
                    </p>
                  </div>
                </a>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/40 transition-colors cursor-pointer shrink-0"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5 text-slate-300" />
                </button>
              </div>

              {/* Drawer Vertical Navigation Rows (Single Column Cards) */}
              <nav className="flex-1 flex flex-col justify-evenly gap-1 sm:gap-1.5 py-2.5 min-h-0">
                {NAV_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        scrollToSection(section.id);
                      }}
                      className={`group w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer border text-left ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent border-cyan-500/40 text-white font-bold shadow-md shadow-cyan-500/10'
                          : 'bg-white/[0.02] hover:bg-white/[0.07] border-white/5 text-slate-300 hover:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                            isActive
                              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                              : 'bg-slate-900 border-white/10 text-cyan-400 group-hover:border-cyan-500/30'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold truncate">{section.label}</span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-all shrink-0 ${
                          isActive
                            ? 'text-cyan-400 translate-x-0.5'
                            : 'text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1'
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom Section: CTAs & Copyright Footer */}
            <div className="pt-2.5 sm:pt-3 border-t border-white/10 space-y-2 shrink-0 mt-auto">
              <a
                href="/30min"
                className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Book a 30-Minute Discovery Call</span>
              </a>

              <a
                href="/"
                className="w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-mono text-xs font-semibold transition-all cursor-pointer"
              >
                <span>Back to Zenemoo Main Homepage</span>
              </a>

              <div className="pt-1 text-center shrink-0">
                <p className="text-[10px] sm:text-[11px] font-mono text-slate-500 tracking-tight leading-tight">
                  Copyright &copy; 2026 Zenemoo. <span className="inline-block sm:inline">All Rights Reserved.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SITEMAP CONTENT WITH COMFORTABLE FIXED-NAVBAR TOP PADDING */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16 space-y-12 sm:space-y-16 w-full">
        {/* HERO SECTION WITH VISIBLE BREADCRUMB & SINGLE H1 */}
        <section className="text-center space-y-5 max-w-3xl mx-auto">
          {/* Visible Semantic Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
            <a href="/" className="hover:text-cyan-300 transition-colors flex items-center gap-1">
              <Home className="w-3 h-3" />
              <span>Home</span>
            </a>
            <span className="text-slate-600">/</span>
            <span className="text-cyan-400 font-semibold">Website Directory</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold shadow-lg shadow-cyan-500/10">
            <Compass className="w-4 h-4" />
            <span>ZENEMOO • WEBSITE DIRECTORY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight leading-tight">
            Zenemoo Website Directory
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-sans max-w-2xl mx-auto">
            Explore Zenemoo&apos;s public website — from enterprise AI and multilingual data solutions to scheduling, careers, applications, company information, resources, and legal information.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap font-mono text-xs">
            <button
              onClick={() => scrollToSection('solutions')}
              className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold border border-white/15 transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Explore Solutions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <a
              href="/30min"
              className="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book a Call</span>
            </a>
          </div>
        </section>

        {/* QUICK ACCESS HIGHLIGHTS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quick Access Destinations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickAccessItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <a
                  key={`quick-${item.id}`}
                  href={item.url}
                  className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-cyan-500/40 transition-all group block shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    {item.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-400/30">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <h2 className="text-base font-bold font-display text-white group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                    <span>{item.title}</span>
                    <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </h2>

                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans line-clamp-2">
                    {item.description}
                  </p>
                </a>
              );
            })}
          </div>
        </section>

        {/* MAIN DIRECTORY CATEGORY SECTIONS */}
        <div className="space-y-12">
          {categories.map(({ key: catKey, title, subtitle }) => {
            const catItems = DIRECTORY_ITEMS.filter((i) => i.category === catKey);
            if (catItems.length === 0) return null;

            return (
              <section key={catKey} id={catKey} className="space-y-4 scroll-mt-24 sm:scroll-mt-28">
                <div className="border-b border-white/10 pb-3">
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
                    <span>{title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-mono text-xs">
                      {catItems.length}
                    </span>
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">{subtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catItems.map((item) => {
                    const IconComponent = item.icon;
                    const isSpecialBooking = item.id === 'book-a-call';

                    return (
                      <a
                        key={item.id}
                        href={item.url}
                        className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between group block cursor-pointer ${
                          isSpecialBooking
                            ? 'bg-gradient-to-br from-cyan-950/40 via-[#0b1325] to-[#030406] border-cyan-500/40 shadow-xl shadow-cyan-500/10 hover:border-cyan-400'
                            : 'bg-[#0b0f19] border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2.5 rounded-xl border shrink-0 ${
                                  isSpecialBooking
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                    : 'bg-white/5 border-white/10 text-slate-300 group-hover:text-cyan-400 group-hover:border-cyan-500/30'
                                }`}
                              >
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold font-display text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                                  <span>{item.title}</span>
                                </h3>
                                <span className="text-[10px] font-mono text-cyan-400 block">{item.url}</span>
                              </div>
                            </div>

                            {item.badge && (
                              <span className="px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 font-mono text-[9px] font-bold border border-cyan-400/20 shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed font-sans pt-1">
                            {item.description}
                          </p>

                          {item.dynamicNote && (
                            <p className="text-[11px] font-mono text-slate-500 pt-1 flex items-center gap-1">
                              <span className="text-cyan-400">&bull;</span> {item.dynamicNote}
                            </p>
                          )}
                        </div>

                        {/* CTA Link Button */}
                        <div className="pt-4 mt-2 border-t border-white/5 flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold transition-all ${
                              isSpecialBooking
                                ? 'px-4 py-2 rounded-xl bg-cyan-500 group-hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20'
                                : 'text-cyan-400 group-hover:text-cyan-300'
                            }`}
                          >
                            <span>{isSpecialBooking ? 'Book a 30-Minute Call' : 'Explore Page'}</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* CONNECT & SOCIAL CHANNELS SECTION */}
          <section id="connect" className="space-y-4 scroll-mt-24 sm:scroll-mt-28">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
                Connect With Zenemoo
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Official verified social networks, channels, and direct operational inboxes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/zenemoo/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-2xl bg-[#0b0f19] border border-white/10 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group block shadow-lg cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <FaLinkedin className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-white font-display group-hover:text-blue-300">LinkedIn</h3>
                <p className="text-xs text-slate-400 mt-1 font-sans">Official corporate updates, announcements, and job opportunities.</p>
              </a>

              {/* X / Twitter */}
              <a
                href="https://x.com/zenemooofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-2xl bg-[#0b0f19] border border-white/10 hover:border-slate-400/40 hover:bg-white/5 transition-all group block shadow-lg cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-xl bg-white/10 text-white border border-white/20">
                    <FaXTwitter className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-white font-display group-hover:text-white">X (Twitter)</h3>
                <p className="text-xs text-slate-400 mt-1 font-sans">Real-time platform dispatches, AI speech milestones, and tech discussions.</p>
              </a>

              {/* WhatsApp */}
              <a
                href="https://whatsapp.com/channel/0029Vb8VOTHGOj9eWQiiPs08"
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-2xl bg-[#0b0f19] border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group block shadow-lg cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FaWhatsapp className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-white font-display group-hover:text-emerald-300">WhatsApp Channel</h3>
                <p className="text-xs text-slate-400 mt-1 font-sans">Official broadcast channel for contributor announcements and alerts.</p>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/zenemooofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-2xl bg-[#0b0f19] border border-white/10 hover:border-pink-500/40 hover:bg-pink-500/5 transition-all group block shadow-lg cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                    <FaInstagram className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-pink-400 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-white font-display group-hover:text-pink-300">Instagram</h3>
                <p className="text-xs text-slate-400 mt-1 font-sans">Behind-the-scenes culture, linguistics showcases, and community spotlights.</p>
              </a>

              {/* YouTube */}
              <a
                href="https://www.youtube.com/channel/UCj8ryPiPOeM_HrWqkNsFkTg"
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-2xl bg-[#0b0f19] border border-white/10 hover:border-red-500/40 hover:bg-red-500/5 transition-all group block shadow-lg cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                    <FaYoutube className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-white font-display group-hover:text-red-300">YouTube Channel</h3>
                <p className="text-xs text-slate-400 mt-1 font-sans">Official video demos, technology walkthroughs, and language data tutorials.</p>
              </a>

              {/* Official Inboxes */}
              <div className="p-5 rounded-2xl bg-[#0b0f19] border border-white/10 flex flex-col justify-between">
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                    <Mail className="w-4 h-4" />
                    <span>Official Inboxes</span>
                  </div>
                  <div>General: <a href="mailto:info@zenemoo.in" className="text-slate-300 hover:underline">info@zenemoo.in</a></div>
                  <div>Support: <a href="mailto:support@zenemoo.in" className="text-slate-300 hover:underline">support@zenemoo.in</a></div>
                  <div>Contact: <a href="mailto:contact@zenemoo.in" className="text-slate-300 hover:underline">contact@zenemoo.in</a></div>
                </div>
              </div>
            </div>
          </section>

          {/* NEED SOMETHING ELSE? QUICK ASSISTANCE & CONVERSION HUB */}
          <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-cyan-950/30 via-[#080d1a] to-[#04060a] border border-cyan-500/30 shadow-2xl space-y-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-xs font-semibold">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Need something else?</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                Can&apos;t find what you&apos;re looking for?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-sans">
                Our AI data solutions engineering team is available for custom dataset requests, speech annotation pilots, and enterprise partnerships.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0 font-mono text-xs">
              <a
                href="/30min"
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Discovery Call</span>
              </a>
              <a
                href="/#contact"
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Contact Team</span>
              </a>
            </div>
          </section>
        </div>
      </main>

      {/* 3. PRODUCTION MAIN WEBSITE FOOTER */}
      <Footer />
    </div>
  );
};
