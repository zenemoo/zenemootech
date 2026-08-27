import React, { useState, useEffect, useCallback } from 'react';
import {
  Handshake,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ShieldCheck,
  Globe2,
} from 'lucide-react';
import { PartnerCompany, getStoredPartners } from '../lib/partnerStore';

export interface CollaborationItem {
  id: string;
  title: string;
  categoryLabel: string;
  headline: string;
  supportingText: string;
  footerText: string;
  categoryTag: string;
  decorativeGraphic: 'nodes' | 'waveform';
}

const COLLABORATIONS: CollaborationItem[] = [
  {
    id: 'desicrew',
    title: 'DesiCrew',
    categoryLabel: 'COLLABORATION',
    headline: 'Working with DesiCrew since 2023',
    supportingText: 'Data services & AI-enabled project engagements.',
    footerText: 'Since 2023',
    categoryTag: 'Data Services & AI Operations',
    decorativeGraphic: 'nodes',
  },
  {
    id: 'karya',
    title: 'Karya',
    categoryLabel: 'PROJECT COLLABORATION',
    headline: 'Working with Karya since 2026',
    supportingText: 'Odia voice collection, TTS & transcription projects.',
    footerText: 'Since 2026',
    categoryTag: 'Speech Curation & Indic TTS',
    decorativeGraphic: 'waveform',
  },
];

export const Partner: React.FC = () => {
  const [partnerList, setPartnerList] = useState<PartnerCompany[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const total = COLLABORATIONS.length;

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-play timer (4.5s slide interval), pauses on mouse hover
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 4500);
    return () => clearInterval(timer);
  }, [isHovered, nextSlide]);

  // Load secondary frameworks marquee list
  useEffect(() => {
    getStoredPartners().then((data) => {
      const activeOnly = data.filter((p) => p.status === 'active');
      setPartnerList(activeOnly.length > 0 ? activeOnly : []);
    });
  }, []);

  // Keyboard accessibility navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  };

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 40;
    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const getMarqueeItems = (list: PartnerCompany[]) => {
    if (list.length === 0) return [];
    let items = [...list];
    while (items.length < 8) {
      items = [...items, ...list];
    }
    return [...items, ...items];
  };

  const marqueeItems = getMarqueeItems(partnerList);

  return (
    <section
      id="partner"
      className="py-24 relative z-10 bg-[#050507] overflow-hidden focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Collaborations & Project Experience Carousel"
    >
      {/* Ambient Background Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-10 right-10 w-[450px] h-[320px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Unified Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-4 shadow-inner">
            <Handshake className="w-3.5 h-3.5" />
            <span>ENTERPRISE COLLABORATIONS &amp; EXPERIENCE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            Collaborations &amp; Project Experience
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Zenemoo brings proven experience across long-term collaborations and specialized language data projects, while upholding strict client confidentiality.
          </p>
        </div>

        {/* CAROUSEL CONTAINER */}
        <div
          className="relative max-w-5xl mx-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main Unified Glass Cards View */}
          <div className="relative min-h-[320px] sm:min-h-[340px] flex items-center justify-center">
            {COLLABORATIONS.map((item, index) => {
              const isActive = index === activeIndex;

              const cardVisibilityStyle = isActive
                ? 'opacity-100 z-30 scale-[1.01] relative w-full block shadow-2xl shadow-cyan-500/10 border-cyan-500/30 bg-[#080c16]/90'
                : 'opacity-0 z-0 scale-95 absolute w-full hidden pointer-events-none';

              return (
                <div
                  key={item.id}
                  className={`glass-panel rounded-3xl p-8 sm:p-12 border transition-all duration-700 ease-out overflow-hidden backdrop-blur-2xl ${cardVisibilityStyle}`}
                  aria-hidden={!isActive}
                >
                  {/* Subtle Top Gradient Accent Line */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/60 via-purple-500/60 to-emerald-400/60"></div>
                  )}

                  {/* Unified Card Content Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    {/* Left Column: Clean Hierarchical Typography */}
                    <div className="lg:col-span-8 space-y-4 text-left">
                      {/* [small collaboration label] */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono tracking-wider font-semibold uppercase bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        <Sparkles className="w-3 h-3" />
                        <span>{item.categoryLabel}</span>
                      </div>

                      {/* Organization Name */}
                      <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white tracking-tight">
                        {item.title}
                      </h3>

                      {/* Short "Working with..." Headline */}
                      <div className="text-lg sm:text-xl font-bold font-display text-cyan-300">
                        {item.headline}
                      </div>

                      {/* Concise Experience Description */}
                      <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-sans">
                        {item.supportingText}
                      </p>

                      {/* Timeline + Subtle Project Category Footer */}
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-1.5 text-white font-semibold">
                          <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>{item.footerText}</span>
                        </div>
                        <span className="text-slate-600">•</span>
                        <div className="text-slate-300 font-medium">
                          {item.categoryTag}
                        </div>
                        <span className="text-slate-600 hidden sm:inline">•</span>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                          <span>Confidentiality Protected</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Minimal Decorative Visuals (No extra box borders around graphic) */}
                    <div className="lg:col-span-4 flex items-center justify-center p-2 relative overflow-hidden h-36 sm:h-44 opacity-80 pointer-events-none">
                      {item.decorativeGraphic === 'nodes' && (
                        /* Minimal Data Node Network Graphic */
                        <svg className="w-full h-full max-w-[210px]" viewBox="0 0 200 200">
                          <defs>
                            <linearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#06b6d4" />
                              <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                          </defs>
                          <line x1="40" y1="60" x2="100" y2="100" stroke="rgba(6, 182, 212, 0.25)" strokeWidth="1.5" strokeDasharray="4 4" />
                          <line x1="160" y1="60" x2="100" y2="100" stroke="rgba(168, 85, 247, 0.25)" strokeWidth="1.5" />
                          <line x1="100" y1="100" x2="100" y2="160" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1.5" />
                          <circle cx="40" cy="60" r="8" fill="#060913" stroke="#06b6d4" strokeWidth="2" className="animate-pulse" />
                          <circle cx="160" cy="60" r="8" fill="#060913" stroke="#a855f7" strokeWidth="2" />
                          <circle cx="100" cy="100" r="14" fill="#060913" stroke="url(#nodeGrad)" strokeWidth="2" />
                          <circle cx="100" cy="160" r="7" fill="#060913" stroke="#10b981" strokeWidth="2" />
                          <text x="100" y="103" textAnchor="middle" fill="#06b6d4" fontSize="8" fontFamily="monospace" fontWeight="bold">AI</text>
                        </svg>
                      )}

                      {item.decorativeGraphic === 'waveform' && (
                        /* Minimal Animated Speech Waveform Graphic */
                        <div className="flex items-center gap-1.5 h-20 px-2">
                          {[30, 60, 40, 80, 90, 45, 70, 95, 55, 35, 75, 85, 40, 80, 55, 90, 70, 35, 85, 60, 45, 90, 65, 35].map((h, i) => (
                            <div
                              key={i}
                              className="w-1.5 bg-gradient-to-t from-cyan-500 to-purple-500 rounded-full animate-pulse opacity-75"
                              style={{
                                height: `${h}%`,
                                animationDelay: `${i * 0.08}s`,
                                animationDuration: '1.4s',
                              }}
                            ></div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls & Pagination Indicators */}
          <div className="flex items-center justify-between mt-8 px-2">
            {/* Prev Button */}
            <button
              onClick={prevSlide}
              aria-label="Previous collaboration slide"
              className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-all shadow-lg hover:border-cyan-500/40 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Pagination Indicators */}
            <div className="flex items-center gap-2">
              {COLLABORATIONS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Go to collaboration slide ${idx + 1}`}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === activeIndex
                      ? 'w-8 bg-gradient-to-r from-cyan-400 to-purple-500 shadow-lg shadow-cyan-500/40'
                      : 'w-2.5 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={nextSlide}
              aria-label="Next collaboration slide"
              className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-all shadow-lg hover:border-cyan-500/40 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* UNIFIED SECONDARY ECOSYSTEM & FRAMEWORKS MARQUEE (NO HARSH SECTION SEPARATION) */}
        {partnerList.length > 0 && (
          <div className="mt-16 space-y-6">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono uppercase tracking-widest">
                <Sparkles className="w-3 h-3" /> COLLABORATING ECOSYSTEM &amp; CLIENT DATA PIPELINES
              </div>
              <h3 className="text-xl font-bold font-display text-white">
                Organizations &amp; AI Frameworks We Work With
              </h3>
            </div>

            <div className="relative overflow-hidden py-3 rounded-2xl bg-white/[0.01] border border-white/5">
              <div className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-[#050507] to-transparent z-10 pointer-events-none"></div>
              <div className="absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-[#050507] to-transparent z-10 pointer-events-none"></div>

              <div className="animate-marquee gap-4 px-4">
                {marqueeItems.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => {
                      if (item.website_url) {
                        window.open(item.website_url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="px-5 py-3.5 rounded-2xl glass-panel glass-panel-interactive border border-white/10 flex items-center gap-3.5 shrink-0 group cursor-pointer"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-9 h-9 object-contain rounded-xl shrink-0 bg-white/5 p-1 border border-white/10 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="p-2 rounded-xl border text-cyan-400 border-cyan-500/30 bg-cyan-500/10 shrink-0">
                        <Globe2 className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-display text-sm text-white group-hover:text-cyan-300 transition-colors">
                          {item.name}
                        </span>
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold border text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">{item.role || 'Data Solution Framework'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
