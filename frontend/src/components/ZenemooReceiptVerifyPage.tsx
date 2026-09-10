import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  ArrowLeft,
  XCircle,
  Search,
  Lock,
} from 'lucide-react';
import { useActiveLogo } from '../lib/useActiveLogo';
import { api } from '../services/api';

interface ZenemooReceiptVerifyPageProps {
  receiptNo?: string;
  onBackToHome?: () => void;
  onOpenAiDrawer?: () => void;
}

export function ZenemooReceiptVerifyPage({
  receiptNo: propReceiptNo,
  onBackToHome,
}: ZenemooReceiptVerifyPageProps) {
  const { logoUrl } = useActiveLogo();

  // Extract initial receipt ID from props, URL path, query param, or hash
  const getInitialReceiptId = (): string => {
    let raw = '';
    if (propReceiptNo && propReceiptNo.trim()) {
      raw = propReceiptNo.trim();
    } else if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const match = path.match(/\/receipt\/(?:verify\/)?([^/?#]+)/i);
      if (match && match[1]) {
        const val = decodeURIComponent(match[1]).trim();
        if (val && val !== 'verify') raw = val;
      }

      if (!raw) {
        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('receiptNo') || urlParams.get('receiptId') || urlParams.get('id');
        if (queryParam && queryParam.trim()) raw = queryParam.trim();
      }

      if (!raw) {
        const hash = window.location.hash;
        const hashMatch = hash.match(/#\/?receipt\/(?:verify\/)?([^/?#]+)/i);
        if (hashMatch && hashMatch[1]) {
          const val = decodeURIComponent(hashMatch[1]).trim();
          if (val && val !== 'verify') raw = val;
        }
      }
    }

    if (!raw) return '';
    // Normalize spaces/underscores into hyphens and clean (e.g. "RCPT ZNM 20260911 MS8L" -> "RCPT-ZNM-20260911-MS8L")
    return raw.replace(/[\s]+/g, '-').replace(/^RCPT-7NM-/i, 'RCPT-ZNM-').toUpperCase();
  };

  const [activeReceiptId, setActiveReceiptId] = useState<string>(getInitialReceiptId());
  const [manualInput, setManualInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(Boolean(getInitialReceiptId()));
  const [verifiedReceiptId, setVerifiedReceiptId] = useState<string | null>(null);
  const [verificationFailed, setVerificationFailed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [animationStage, setAnimationStage] = useState<'idle' | 'checking' | 'success' | 'failed'>(
    getInitialReceiptId() ? 'checking' : 'idle'
  );

  const runVerification = async (targetId: string) => {
    if (!targetId || !targetId.trim()) return;

    const cleanId = targetId.trim().replace(/[\s]+/g, '-').replace(/^RCPT-7NM-/i, 'RCPT-ZNM-').toUpperCase();
    setIsVerifying(true);
    setVerificationFailed(false);
    setVerifiedReceiptId(null);
    setAnimationStage('checking');

    const startTime = Date.now();

    try {
      // Call dedicated verification endpoint via configured API client
      let data: any = null;
      try {
        const response = await api.get(`/support/receipt/verify/${encodeURIComponent(cleanId)}`);
        data = response.data;
      } catch (apiErr: any) {
        if (apiErr.response?.data) {
          data = apiErr.response.data;
        } else {
          // Fallback direct endpoint query
          const fallbackRes = await fetch(`/api/support/receipt/verify/${encodeURIComponent(cleanId)}`);
          if (fallbackRes.ok) {
            data = await fallbackRes.json();
          }
        }
      }

      // Ensure a smooth, professional 800ms verification animation feel
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, 800 - elapsed);

      setTimeout(() => {
        setIsVerifying(false);
        if (data && data.verified === true && data.receiptId) {
          setVerifiedReceiptId(data.receiptId);
          setVerificationFailed(false);
          setAnimationStage('success');
        } else {
          setVerificationFailed(true);
          setVerifiedReceiptId(null);
          setAnimationStage('failed');
        }
      }, remainingDelay);
    } catch (err) {
      console.error('Verification error:', err);
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, 800 - elapsed);
      setTimeout(() => {
        setIsVerifying(false);
        setVerificationFailed(true);
        setVerifiedReceiptId(null);
        setAnimationStage('failed');
      }, remainingDelay);
    }
  };

  useEffect(() => {
    if (activeReceiptId) {
      runVerification(activeReceiptId);
    }
  }, [activeReceiptId]);

  const handleCopyReceiptId = () => {
    if (!verifiedReceiptId) return;
    navigator.clipboard.writeText(verifiedReceiptId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    const clean = manualInput.trim();
    setActiveReceiptId(clean);
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', `/receipt/verify/${encodeURIComponent(clean)}`);
    }
  };

  const handleBack = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 bg-[#080e1a]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-slate-300 hover:text-white transition-all py-1.5 px-3 rounded-xl hover:bg-slate-800/60 text-sm font-medium"
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

      {/* Main Verification Viewport */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-10 sm:py-16 flex flex-col items-center justify-center">
        
        {/* Branding Area */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <img
              src={logoUrl || '/assets/logo.png'}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('https://www.zenemoo.in/assets/logo.png')) {
                  target.src = 'https://www.zenemoo.in/assets/logo.png';
                }
              }}
              alt="Zenemoo"
              className="h-9 w-auto object-contain"
            />
            <span className="font-extrabold tracking-wider text-xl sm:text-2xl text-white">
              ZENEMOO
            </span>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
            Official Verification Portal
          </p>
        </div>

        {/* Verification Card */}
        <div className="w-full max-w-md bg-gradient-to-b from-[#0c162e] to-[#080e1e] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all duration-500">
          
          {/* Subtle Ambient Background Lighting */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* STATE 1: VERIFYING IN PROGRESS */}
          {animationStage === 'checking' && (
            <div className="py-8 text-center space-y-5 animate-in fade-in duration-300">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-ping"></div>
                <div className="w-20 h-20 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Verifying Receipt...
                </h3>
                <p className="text-xs text-slate-400">
                  Checking authenticity with Zenemoo...
                </p>
              </div>
            </div>
          )}

          {/* STATE 2: VERIFIED SUCCESS */}
          {animationStage === 'success' && verifiedReceiptId && (
            <div className="text-center space-y-6 animate-in zoom-in-95 fade-in duration-400">
              
              {/* Glowing Green Success Checkmark */}
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-xl"></div>
                <div className="relative w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-11 h-11 text-emerald-400" />
                </div>
              </div>

              {/* Verified Badges and Text */}
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-extrabold text-sm tracking-wider uppercase">
                  <span>✓ VERIFIED</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Payment Receipt Verified
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
                  This receipt has been successfully verified on the Zenemoo platform.
                </p>
              </div>

              {/* Receipt ID Card with 1-Click Copy */}
              <div className="p-4 bg-slate-900/90 border border-cyan-500/30 rounded-2xl space-y-1.5 text-center">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Receipt ID
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <span className="font-mono font-extrabold text-sm sm:text-base text-cyan-300 tracking-wide break-all select-all">
                    {verifiedReceiptId}
                  </span>
                  <button
                    onClick={handleCopyReceiptId}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center"
                    title="Copy Receipt ID"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Official Confirmation Tag */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-center space-x-2 text-xs text-emerald-400 font-semibold">
                <Check className="w-4 h-4" />
                <span>Authentic Zenemoo Receipt</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-400 font-normal">Verified by Zenemoo</span>
              </div>

            </div>
          )}

          {/* STATE 3: VERIFICATION FAILED */}
          {animationStage === 'failed' && (
            <div className="text-center space-y-6 animate-in zoom-in-95 fade-in duration-300">
              
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl"></div>
                <div className="relative w-18 h-18 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
                  <XCircle className="w-10 h-10 text-red-400" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Receipt Not Verified
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
                  We could not verify this receipt on the Zenemoo platform.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <p className="text-[11.5px] text-slate-400">
                  If you need assistance, please contact our support team:
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <a
                    href="mailto:support@zenemoo.in"
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold transition-all border border-slate-700"
                  >
                    support@zenemoo.in
                  </a>
                  <button
                    onClick={handleBack}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-200 text-xs font-semibold transition-all border border-cyan-500/30"
                  >
                    Back to Zenemoo
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* STATE 4: MANUAL RECEIPT SEARCH (Only when URL has no ID) */}
          {animationStage === 'idle' && !activeReceiptId && (
            <div className="text-center space-y-5 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Verify a Zenemoo Receipt
                </h2>
                <p className="text-xs text-slate-400">
                  Enter Receipt ID to confirm authenticity on the Zenemoo platform.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3 pt-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. RCPT-ZNM-20260910-NNUO"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/20"
                >
                  Verify Receipt
                </button>
              </form>
            </div>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-5 px-4 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Zenemoo Data Solutions. All rights reserved.</p>
      </footer>

    </div>
  );
}
