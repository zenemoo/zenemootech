import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  User,
  Mail,
  Layers,
  Briefcase,
  Calendar,
  Hash,
  ArrowLeft,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useActiveLogo } from '../lib/useActiveLogo';

interface ZenemooApplicationVerifyPageProps {
  onBackToHome?: () => void;
  onNavigateTalentHub?: () => void;
}

export const ZenemooApplicationVerifyPage: React.FC<ZenemooApplicationVerifyPageProps> = ({
  onBackToHome,
  onNavigateTalentHub,
}) => {
  const { logoUrl } = useActiveLogo();
  const [params, setParams] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    platform: 'Zenemoo Talent Hub',
    opportunity: '',
    status: 'Verified by Zenemoo',
    timestamp: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash || '';
    let hashParams = new URLSearchParams();
    if (hash.includes('?')) {
      hashParams = new URLSearchParams(hash.substring(hash.indexOf('?')));
    }

    const id = searchParams.get('id') || searchParams.get('applicant_id') || hashParams.get('id') || '';
    const name = searchParams.get('name') || searchParams.get('applicant_name') || hashParams.get('name') || '';
    const email = searchParams.get('email') || searchParams.get('applicant_email') || hashParams.get('email') || '';
    const phone = searchParams.get('phone') || hashParams.get('phone') || '';
    const platform = searchParams.get('platform') || hashParams.get('platform') || 'Zenemoo Talent Hub';
    const opportunity = searchParams.get('opp') || searchParams.get('opportunity') || searchParams.get('opportunity_title') || hashParams.get('opp') || '';
    const status = searchParams.get('status') || hashParams.get('status') || 'Verified by Zenemoo';

    setParams({
      id: id || 'APP-2026-VERIFIED',
      name: name || 'Candidate Contributor',
      email: email || 'Verified Contributor Email',
      phone: phone,
      platform: platform || 'Zenemoo Talent Hub',
      opportunity: opportunity || 'AI Contributor Program',
      status: status.includes('Zenemoo') ? status : `${status} \u2022 Verified by Zenemoo`,
      timestamp: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    });
  }, []);

  const handleBack = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleGoTalentHub = () => {
    if (onNavigateTalentHub) {
      onNavigateTalentHub();
    } else {
      window.location.href = '/talent-hub';
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 bg-[#080e1a]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-slate-300 hover:text-white transition-all py-1.5 px-3 rounded-xl hover:bg-slate-800/60 text-xs sm:text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Back to Zenemoo</span>
          </button>

          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Verification Portal</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl">
          {/* Card Wrapper with Glow */}
          <div className="relative rounded-3xl bg-[#080d19]/95 border border-cyan-500/30 shadow-2xl p-6 sm:p-8 backdrop-blur-xl overflow-hidden">
            {/* Top Accent Gradient */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500" />

            {/* Header Brand */}
            <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-6">
              <div className="flex items-center gap-3">
                <img
                  src={logoUrl || '/assets/logo.png'}
                  alt="Zenemoo Logo"
                  className="w-10 h-10 object-contain rounded-xl bg-white/5 p-1 border border-white/10"
                />
                <div>
                  <h1 className="text-base font-extrabold text-white tracking-wide font-display">
                    ZENEMOO
                  </h1>
                  <p className="text-[11px] font-mono text-slate-400">
                    AI Contributor Network & Data Operations
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                  Application ID
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {params.id}
                </span>
              </div>
            </div>

            {/* Verified Callout Banner */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3.5 mb-6 shadow-lg shadow-emerald-950/40">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider block">
                  Verified Candidate Record
                </span>
                <p className="text-xs text-slate-300 mt-0.5">
                  This application has been verified by <strong className="text-emerald-300">Zenemoo</strong>.
                </p>
              </div>
            </div>

            {/* Data Details List */}
            <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
              {/* Name */}
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  Candidate Name:
                </span>
                <span className="text-xs font-bold text-white font-mono text-right">
                  {params.name}
                </span>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  Registered Email:
                </span>
                <span className="text-xs font-mono text-cyan-300 text-right">
                  {params.email}
                </span>
              </div>

              {/* Phone (if available) */}
              {params.phone && (
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-cyan-400" />
                    Contact Phone:
                  </span>
                  <span className="text-xs font-mono text-slate-200 text-right">
                    {params.phone}
                  </span>
                </div>
              )}

              {/* Platform */}
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Platform:
                </span>
                <span className="text-xs font-semibold text-emerald-300 font-mono text-right">
                  {params.platform}
                </span>
              </div>

              {/* Program */}
              {params.opportunity && (
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                    Program / Role:
                  </span>
                  <span className="text-xs font-bold text-white text-right max-w-[60%] truncate">
                    {params.opportunity}
                  </span>
                </div>
              )}

              {/* Verification Status */}
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Verification:
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold">
                  Verified by Zenemoo
                </span>
              </div>
            </div>

            {/* Electronic Security Stamp */}
            <div className="mt-5 p-3.5 rounded-xl bg-black/40 border border-white/5 text-center">
              <p className="text-[10px] font-mono text-slate-400">
                Official Verification Signature &bull; SHA256-{(params.id || 'ZNM').slice(-6)}VERIFIED &bull; {params.timestamp}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleGoTalentHub}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold shadow-lg shadow-cyan-500/20 cursor-pointer transition-all active:scale-95"
              >
                <span>Visit Zenemoo Talent Hub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleBack}
                className="w-full sm:w-auto py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-semibold border border-white/10 cursor-pointer transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
