import React, { useState, useEffect } from 'react';
import { Bell, X, ArrowRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  checkPromptEligibility,
  recordPromptDecision,
  registerWebPushSubscription,
  initFCMIfGranted,
  initWebPushIfGranted,
  requestAndRegisterCapacitorPush,
} from '../services/notificationService';

export const ZenemooNotificationPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // Independent FCM Startup Check: if native permission is already granted, refresh/register FCM silently in background
    if (Capacitor.isNativePlatform()) {
      initFCMIfGranted('zenemoo');
    } else {
      // Independent Web Push Startup Check: if browser permission is already granted, re-register subscription silently
      initWebPushIfGranted();
    }

    let isMounted = true;
    const checkEligibility = async () => {
      const eligibility = await checkPromptEligibility();
      if (isMounted) {
        if (eligibility === 'can_prompt') {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      }
    };

    const timer = setTimeout(() => {
      checkEligibility();
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const handleAllow = async () => {
    setIsRegistering(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const success = await requestAndRegisterCapacitorPush('zenemoo');
        if (success) {
          setIsVisible(false);
        }
      } else {
        const success = await registerWebPushSubscription();
        if (success) {
          setIsVisible(false);
        }
      }
    } catch (e) {
      console.warn('Notification prompt error:', e);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleNotNow = () => {
    recordPromptDecision('not_now'); // 7-day retry rule
    setIsVisible(false);
  };

  const handleClose = () => {
    recordPromptDecision('close'); // Hide for current session
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed z-50 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 md:left-auto md:right-6 md:bottom-6 max-w-[calc(100vw-24px)] sm:max-w-sm w-full mx-auto md:mx-0 animate-in fade-in slide-in-from-bottom-5 duration-300 font-sans">
      <div className="relative rounded-2xl sm:rounded-3xl bg-[#0b101b]/95 backdrop-blur-2xl border border-cyan-500/30 p-3.5 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-white overflow-hidden group">
        {/* Glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-blue-500" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 p-1 sm:p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer z-10"
          title="Close"
          aria-label="Close notification prompt"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <div className="flex items-start gap-3 sm:gap-4 pr-6 sm:pr-0">
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/30 shrink-0 text-cyan-400 shadow-inner mt-0.5">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <h4 className="font-display font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 leading-snug">
              Stay Updated with Zenemoo
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-sans line-clamp-3 sm:line-clamp-none">
              Allow Zenemoo to send you important updates, new opportunities, announcements, and program notifications.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-white/10 flex flex-row items-center justify-end gap-2">
          <button
            onClick={handleNotNow}
            className="flex-1 sm:flex-initial px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-mono text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer text-center whitespace-nowrap"
          >
            Not Now
          </button>

          <button
            onClick={handleAllow}
            disabled={isRegistering}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-mono font-bold text-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {isRegistering ? (
              <span>Enabling...</span>
            ) : (
              <>
                <span>Allow Notifications</span>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
