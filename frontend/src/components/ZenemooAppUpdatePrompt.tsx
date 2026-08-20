import React, { useState, useEffect } from 'react';
import { Sparkles, Download, X, ShieldAlert, ArrowRight } from 'lucide-react';
import { checkForAppUpdate, AppUpdateInfo } from '../services/appUpdateService';

export const ZenemooAppUpdatePrompt: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const runCheck = async () => {
      // Delay slightly after app startup to avoid interfering with push setup
      const result = await checkForAppUpdate();
      if (isMounted && result && result.hasUpdate) {
        setUpdateInfo(result);
        setIsVisible(true);
      }
    };

    const timer = setTimeout(runCheck, 3500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  if (!isVisible || !updateInfo) return null;

  const handleUpdateNow = () => {
    if (updateInfo.updateUrl) {
      window.open(updateInfo.updateUrl, '_system');
    }
  };

  const handleLater = () => {
    if (!updateInfo.forceUpdate) {
      setIsVisible(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300 font-sans">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#080d19]/95 backdrop-blur-2xl border border-cyan-400/40 p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.2)] text-white space-y-4 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
        {/* Glow Accent Header Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-emerald-400" />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
              <Download className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Zenemoo Android</span>
              </div>
              <h3 className="font-display font-extrabold text-base text-white">
                Update Available
              </h3>
            </div>
          </div>

          {!updateInfo.forceUpdate && (
            <button
              type="button"
              onClick={handleLater}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Dismiss update"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Version Badge Comparison */}
        <div className="p-3 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between font-mono text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">Current Version</span>
            <span className="text-slate-300 font-bold">v{updateInfo.installedVersion}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-cyan-400" />
          <div className="text-right">
            <span className="text-[10px] text-cyan-400 block">Latest Version</span>
            <span className="text-cyan-300 font-extrabold">v{updateInfo.latestVersion}</span>
          </div>
        </div>

        {/* Description / Release Notes */}
        <div className="text-xs text-slate-300 leading-relaxed font-sans bg-white/[0.02] p-3 rounded-2xl border border-white/5 space-y-1">
          <p className="font-bold text-white text-[11px]">What's New:</p>
          <p className="text-[11px] text-slate-300/90 leading-relaxed">
            {updateInfo.releaseNotes}
          </p>
        </div>

        {updateInfo.forceUpdate && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>This update contains critical performance updates.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          {!updateInfo.forceUpdate && (
            <button
              type="button"
              onClick={handleLater}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer text-center"
            >
              Later
            </button>
          )}

          <button
            type="button"
            onClick={handleUpdateNow}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:opacity-90 text-black font-extrabold font-mono text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Update Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
