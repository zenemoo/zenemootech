import React, { useState, useEffect } from 'react';
import { Bell, X, ExternalLink, Sparkles } from 'lucide-react';
import { ZenemooNotificationItem } from './NotificationCenter';
import { notificationApi } from '../services/api';
import { getInstallationId, sanitizeZenemooUrl } from '../services/notificationService';

export const NotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<ZenemooNotificationItem | null>(null);

  useEffect(() => {
    const handleLiveEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ZenemooNotificationItem>;
      if (customEvent.detail) {
        setActiveToast(customEvent.detail);
      }
    };

    window.addEventListener('zenemoo:live-notification', handleLiveEvent);
    return () => {
      window.removeEventListener('zenemoo:live-notification', handleLiveEvent);
    };
  }, []);

  // Requirement #15: Auto-dismiss after 5 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  if (!activeToast) return null;

  const handleClick = async () => {
    const item = activeToast;
    setActiveToast(null);
    try {
      const installationId = getInstallationId();
      await notificationApi.markRead(item.id, installationId);
      window.dispatchEvent(new CustomEvent('zenemoo:refresh-notifications'));
    } catch (e) {}

    if (item.url) {
      const target = item.url.trim();
      if (target.startsWith('/') || target.startsWith('#')) {
        if (target.startsWith('#')) {
          const el = document.querySelector(target);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            return;
          }
        }
        window.location.href = target;
      } else {
        const safeUrl = sanitizeZenemooUrl(target);
        window.location.href = safeUrl;
      }
    }
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed top-[74px] sm:top-20 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[380px] max-w-[400px] animate-in slide-in-from-top-3 fade-in duration-300 font-sans"
    >
      <div
        onClick={handleClick}
        className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[#080d19]/95 backdrop-blur-2xl border border-cyan-400/50 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(6,182,212,0.25)] text-white relative cursor-pointer group hover:border-cyan-300 transition-all overflow-hidden"
      >
        {/* Top Glow Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-emerald-400" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner mt-0.5 animate-pulse">
              <Bell className="w-4 h-4" />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Zenemoo Update</span>
              </div>
              <h4 className="font-display font-extrabold text-xs sm:text-sm text-white truncate group-hover:text-cyan-300 transition-colors">
                {activeToast.title}
              </h4>
              <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed font-sans">
                {activeToast.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveToast(null);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            aria-label="Dismiss notification popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeToast.url && (
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-cyan-400 font-bold">
            <span>Tap to view details</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        )}
      </div>
    </aside>
  );
};
