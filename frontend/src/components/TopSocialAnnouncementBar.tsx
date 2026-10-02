import React, { useState, useEffect, useRef } from 'react';
import { FaWhatsapp, FaLinkedin, FaXTwitter, FaInstagram, FaYoutube } from 'react-icons/fa6';
import { ZENEMOO_SOCIAL_LINKS, SocialLinkItem } from './SocialData';

interface TopSocialAnnouncementBarProps {
  className?: string;
}

export const TopSocialAnnouncementBar: React.FC<TopSocialAnnouncementBarProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(true);
  const prevScrollYRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

  // Social Links in exact required order:
  // 1. WhatsApp Channel (MUST be first)
  // 2. LinkedIn, X (Twitter), Instagram, YouTube (from official footer/SocialData)
  const orderedSocialLinks: SocialLinkItem[] = [
    // 1. WhatsApp Channel
    ZENEMOO_SOCIAL_LINKS.find((item) => item.id === 'whatsapp') || {
      id: 'whatsapp',
      name: 'WhatsApp Channel',
      url: 'https://whatsapp.com/channel/0029Vb8VOTHGOj9eWQiiPs08',
      handle: 'Zenemoo Channel',
      icon: FaWhatsapp,
      color: '#25D366',
      hoverBg: 'hover:bg-[#25D366]/20',
      hoverText: 'hover:text-[#25D366]',
      hoverBorder: 'hover:border-[#25D366]/60',
      hoverShadow: 'hover:shadow-[0_0_20px_rgba(37,211,102,0.4)]',
      ariaLabel: 'Join Zenemoo WhatsApp Channel',
    },
    // 2. LinkedIn
    ZENEMOO_SOCIAL_LINKS.find((item) => item.id === 'linkedin') || {
      id: 'linkedin',
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/company/zenemoo/',
      handle: 'company/zenemoo',
      icon: FaLinkedin,
      color: '#0A66C2',
      hoverBg: 'hover:bg-[#0A66C2]/20',
      hoverText: 'hover:text-[#0A66C2]',
      hoverBorder: 'hover:border-[#0A66C2]/60',
      hoverShadow: 'hover:shadow-[0_0_20px_rgba(10,102,194,0.4)]',
      ariaLabel: 'Follow Zenemoo on LinkedIn',
    },
    // 3. X (Twitter)
    ZENEMOO_SOCIAL_LINKS.find((item) => item.id === 'x') || {
      id: 'x',
      name: 'X (Twitter)',
      url: 'https://x.com/zenemooofficial',
      handle: '@zenemooofficial',
      icon: FaXTwitter,
      color: '#FFFFFF',
      hoverBg: 'hover:bg-white/20',
      hoverText: 'hover:text-white',
      hoverBorder: 'hover:border-white/50',
      hoverShadow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]',
      ariaLabel: 'Follow Zenemoo on X (Twitter)',
    },
    // 4. Instagram
    ZENEMOO_SOCIAL_LINKS.find((item) => item.id === 'instagram') || {
      id: 'instagram',
      name: 'Instagram',
      url: 'https://www.instagram.com/zenemooofficial',
      handle: '@zenemooofficial',
      icon: FaInstagram,
      color: '#E4405F',
      hoverBg: 'hover:bg-[#E4405F]/20',
      hoverText: 'hover:text-[#E4405F]',
      hoverBorder: 'hover:border-[#E4405F]/60',
      hoverShadow: 'hover:shadow-[0_0_20px_rgba(228,64,95,0.4)]',
      ariaLabel: 'Follow Zenemoo on Instagram',
    },
    // 5. YouTube
    ZENEMOO_SOCIAL_LINKS.find((item) => item.id === 'youtube') || {
      id: 'youtube',
      name: 'YouTube',
      url: 'https://www.youtube.com/channel/UCj8ryPiPOeM_HrWqkNsFkTg',
      handle: 'Zenemoo Official',
      icon: FaYoutube,
      color: '#FF0000',
      hoverBg: 'hover:bg-[#FF0000]/20',
      hoverText: 'hover:text-[#FF0000]',
      hoverBorder: 'hover:border-[#FF0000]/60',
      hoverShadow: 'hover:shadow-[0_0_20px_rgba(255,0,0,0.4)]',
      ariaLabel: 'Subscribe to Zenemoo on YouTube',
    },
  ];

  // Scroll Listener for smart reveal/hide on desktop
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const prevScrollY = prevScrollYRef.current;

      if (currentScrollY <= 15) {
        // At the very top: ALWAYS show
        setIsVisible(true);
      } else if (currentScrollY > prevScrollY && currentScrollY > 60) {
        // Scrolling DOWN: Smoothly hide
        setIsVisible(false);
      } else if (currentScrollY < prevScrollY) {
        // Scrolling UP: Smoothly reveal
        setIsVisible(true);
      }

      prevScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync CSS variable for navbar offset (ONLY active on desktop >= 900px)
  useEffect(() => {
    const updateOffset = () => {
      const isDesktop = window.innerWidth >= 900;
      if (isDesktop && isVisible && barRef.current) {
        const height = barRef.current.offsetHeight || 44;
        document.documentElement.style.setProperty('--announcement-offset', `${height}px`);
      } else {
        document.documentElement.style.setProperty('--announcement-offset', '0px');
      }
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);

    return () => {
      window.removeEventListener('resize', updateOffset);
      document.documentElement.style.setProperty('--announcement-offset', '0px');
    };
  }, [isVisible]);

  // Single announcement sequence renderer
  const renderTickerSequence = (keyPrefix: string, isAriaHidden = false) => (
    <div
      key={keyPrefix}
      className="inline-flex items-center gap-6 sm:gap-8 shrink-0 pr-6 sm:pr-8"
      aria-hidden={isAriaHidden}
    >
      {/* 1. Vendor / Talent */}
      <div className="inline-flex items-center gap-2">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <a
          href="https://www.zenemoo.in/talent-registration"
          className="text-xs font-mono font-medium text-slate-200 hover:text-cyan-300 transition-colors whitespace-nowrap group inline-flex items-center gap-1"
          title="Vendor & Talent Registration"
        >
          <span>Are you a vendor or looking for work? <span className="text-cyan-300 underline underline-offset-4 decoration-cyan-500/40 group-hover:decoration-cyan-400">Join with us →</span></span>
        </a>
      </div>

      {/* Separator */}
      <span className="text-cyan-400/40 text-[10px] select-none">✦</span>

      {/* 2. Part-Time Work */}
      <div className="inline-flex items-center gap-2">
        <a
          href="https://www.zenemoo.in/opportunities"
          className="text-xs font-mono font-medium text-slate-200 hover:text-cyan-300 transition-colors whitespace-nowrap group inline-flex items-center gap-1"
          title="Part-Time Work Opportunities"
        >
          <span>Looking for part-time work? <span className="text-cyan-300 underline underline-offset-4 decoration-cyan-500/40 group-hover:decoration-cyan-400">Explore opportunities →</span></span>
        </a>
      </div>

      {/* Separator */}
      <span className="text-cyan-400/40 text-[10px] select-none">✦</span>

      {/* 3. Know More About Zenemoo */}
      <div className="inline-flex items-center gap-2">
        <a
          href="https://www.zenemoo.in/30min"
          className="text-xs font-mono font-medium text-slate-200 hover:text-cyan-300 transition-colors whitespace-nowrap group inline-flex items-center gap-1"
          title="Book a 30-Minute Meeting"
        >
          <span>Want to know more about Zenemoo? <span className="text-cyan-300 underline underline-offset-4 decoration-cyan-500/40 group-hover:decoration-cyan-400">Book a 30-minute meeting →</span></span>
        </a>
      </div>

      {/* Separator */}
      <span className="text-cyan-400/40 text-[10px] select-none">✦</span>

      {/* 4. Social Media with Links */}
      <div className="inline-flex items-center gap-3">
        <span className="text-xs font-mono font-medium text-slate-200 whitespace-nowrap">
          Join Our Social Media →
        </span>

        {/* Social Icons Strip */}
        <div className="inline-flex items-center gap-1.5">
          {orderedSocialLinks.map((item) => {
            const Icon = item.icon;
            const isWhatsApp = item.id === 'whatsapp';

            if (isWhatsApp) {
              return (
                <a
                  key={`${keyPrefix}-${item.id}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.ariaLabel}
                  title={item.ariaLabel}
                  tabIndex={isAriaHidden ? -1 : 0}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 hover:border-emerald-400 hover:text-white shadow-[0_0_10px_rgba(16,185,129,0.25)] transition-all duration-200 select-none group shrink-0"
                >
                  <Icon className="w-3 h-3 text-emerald-400 transition-transform duration-200 group-hover:scale-110 shrink-0" />
                  <span className="font-sans whitespace-nowrap">{item.name}</span>
                </a>
              );
            }

            return (
              <a
                key={`${keyPrefix}-${item.id}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.ariaLabel}
                title={item.ariaLabel}
                tabIndex={isAriaHidden ? -1 : 0}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 transition-all duration-200 select-none group shrink-0"
              >
                <Icon className="w-3 h-3 text-slate-400 group-hover:text-cyan-300 transition-transform duration-200 group-hover:scale-110 shrink-0" />
                <span className="font-sans whitespace-nowrap">{item.name}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Trailing Separator to close sequence cleanly */}
      <span className="text-cyan-400/40 text-[10px] select-none">✦</span>
    </div>
  );

  return (
    <aside
      ref={barRef}
      id="zenemoo-top-announcement-bar"
      aria-label="Official Announcements Ticker"
      className={`hidden min-[900px]:block fixed top-0 left-0 right-0 z-50 h-[44px] transition-all duration-300 ease-in-out ${
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : '-translate-y-full opacity-0 pointer-events-none'
      } bg-[#03050a]/95 backdrop-blur-xl border-b border-cyan-500/15 shadow-sm shadow-cyan-950/20 select-none overflow-hidden ${className}`}
    >
      {/* Ticker Viewport with subtle edge gradient masks */}
      <div className="w-full h-full flex items-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%-32px),transparent)]">
        {/* Continuous Marquee Track (Seamless duplicated sequence moving Right to Left) */}
        <div className="animate-announcement-ticker flex items-center">
          {renderTickerSequence('track-primary', false)}
          {renderTickerSequence('track-duplicate', true)}
        </div>
      </div>
    </aside>
  );
};
