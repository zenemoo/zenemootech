import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollProgressButton: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const calculateScrollProgress = useCallback(() => {
    if (typeof window === 'undefined') return;

    const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
    const currentScroll = window.scrollY;

    if (scrollTotal > 0) {
      const progress = Math.min(100, Math.max(0, (currentScroll / scrollTotal) * 100));
      setScrollProgress(progress);
    } else {
      setScrollProgress(0);
    }

    // Show button after scrolling past 100px (clean hero section at top)
    if (currentScroll > 100) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const onScroll = () => {
      animationFrameId = requestAnimationFrame(calculateScrollProgress);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    
    // Initial calculation
    calculateScrollProgress();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [calculateScrollProgress]);

  const scrollToTop = () => {
    if (typeof window === 'undefined') return;
    
    const homeElem = document.getElementById('home');
    if (homeElem && window.location.pathname === '/') {
      homeElem.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // SVG Circle Measurements (Radius = 20, Circumference = 2 * PI * 20 ≈ 125.66)
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <div
      className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 transition-all duration-300 transform ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
      }`}
    >
      <button
        onClick={scrollToTop}
        aria-label={`Scroll back to top (${Math.round(scrollProgress)}% read)`}
        title={`Back to top (${Math.round(scrollProgress)}%)`}
        className="group relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#080912]/90 border border-white/10 backdrop-blur-xl shadow-xl shadow-cyan-950/50 text-cyan-400 hover:text-white transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
      >
        {/* SVG Circular Progress Ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-0.5"
          viewBox="0 0 48 48"
        >
          <defs>
            <linearGradient id="cyan-indigo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" /> {/* Cyan 400 */}
              <stop offset="50%" stopColor="#3b82f6" /> {/* Blue 500 */}
              <stop offset="100%" stopColor="#818cf8" /> {/* Indigo 400 */}
            </linearGradient>
            <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#06b6d4" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Background Track Circle */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            className="stroke-white/10"
            strokeWidth="3"
            fill="transparent"
          />

          {/* Progress Indicator Circle */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="url(#cyan-indigo-gradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter="url(#cyan-glow)"
            className="transition-[stroke-dashoffset] duration-150 ease-out"
          />
        </svg>

        {/* Center Upward Arrow Icon */}
        <ArrowUp className="w-5 h-5 md:w-6 md:h-6 text-cyan-400 group-hover:text-cyan-200 group-hover:-translate-y-1 transition-all duration-300 z-10 shrink-0" />
      </button>
    </div>
  );
};
