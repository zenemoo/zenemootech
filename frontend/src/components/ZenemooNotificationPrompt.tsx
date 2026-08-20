import React, { useState, useEffect } from 'react';
import { Bell, X, ArrowRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  checkPromptEligibility,
  recordPromptDecision,
  registerWebPushSubscription,
  initCapacitorPushNotifications,
} from '../services/notificationService';

export const ZenemooNotificationPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // If running inside Capacitor native Android app, initialize push notifications cleanly
    if (Capacitor.isNativePlatform()) {
      initCapacitorPushNotifications('zenemoo');
    }

    const timer = setTimeout(() => {
      const eligibility = checkPromptEligibility();
      if (eligibility === 'can_prompt') {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    setIsRegistering(true);
    try {
      if (Capacitor.isNativePlatform()) {
        await initCapacitorPushNotifications('zenemoo');
        setIsVisible(false);
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
    recordPromptDecision('close'); // No permanent denial, allow in future sessions
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full mx-4 sm:mx-0 animate-in fade-in slide-in-from-bottom-5 duration-300 font-sans">
      <div className="relative rounded-3xl bg-[#0b101b]/95 backdrop-blur-2xl border border-cyan-500/30 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-white overflow-hidden group">
        {/* Glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-blue-500" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/30 shrink-0 text-cyan-400 shadow-inner">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>

          <div className="space-y-1.5 pr-4">
            <h4 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
              Stay Updated with Zenemoo
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Allow Zenemoo to send you important updates, new opportunities, announcements, and program notifications.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            onClick={handleNotNow}
            className="px-3.5 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
          >
            Not Now
          </button>

          <button
            onClick={handleAllow}
            disabled={isRegistering}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isRegistering ? (
              <span>Enabling...</span>
            ) : (
              <>
                <span>Allow Notifications</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
