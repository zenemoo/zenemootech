import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Share2,
  ArrowLeft,
  Home,
  ShieldCheck,
  Building2,
  User,
  Briefcase,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { paymentWorkerApi } from '../services/paymentWorkerApi';

interface PublicPaymentReceiptPageProps {
  zenemooPaymentId: string;
  onBackToHome?: () => void;
}

interface ReceiptData {
  zenemooPaymentId: string;
  status: 'Paid' | 'Pending' | 'Processing' | 'Issue' | 'Cancelled' | string;
  name: string;
  maskedUpiId: string;
  amount: number;
  currency: string;
  workType: string;
  projectName?: string | null;
  utr?: string | null;
  paymentDate?: string | null;
  batchId?: string | null;
}

function formatMaskedUpi(upi: string): string {
  if (!upi || typeof upi !== 'string') return '';
  const trimmed = upi.trim();
  if (trimmed.includes('***') || trimmed.includes('•••')) return trimmed;
  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    if (trimmed.length <= 4) return '••••';
    return `${trimmed.slice(0, 2)}•••${trimmed.slice(-2)}`;
  }
  const handle = parts[0];
  const bank = parts[1];
  if (handle.length <= 3) {
    return `${handle[0]}***@${bank}`;
  }
  const visibleStart = handle.slice(0, Math.min(3, handle.length - 2));
  const visibleEnd = handle.slice(-2);
  return `${visibleStart}***${visibleEnd}@${bank}`;
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
  const symbol = currency === 'INR' || !currency ? '₹' : `${currency} `;
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN')}`;
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
    return '—';
  }
  const clean = dateStr.trim();
  if (clean.includes('IST') || clean.includes('AM') || clean.includes('PM') || isNaN(Date.parse(clean))) {
    return clean;
  }
  try {
    const d = new Date(clean);
    if (isNaN(d.getTime())) return clean;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(d);
  } catch (_) {
    return clean;
  }
}

export const PublicPaymentReceiptPage: React.FC<PublicPaymentReceiptPageProps> = ({
  zenemooPaymentId,
  onBackToHome,
}) => {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<'not_found' | 'network_error' | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const cleanPaymentId = decodeURIComponent(zenemooPaymentId || '').trim();

  // Robots meta tag for SEO privacy (noindex)
  useEffect(() => {
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', 'noindex, follow');

    document.title = cleanPaymentId
      ? `Zenemoo Payment Receipt — ${cleanPaymentId}`
      : 'Zenemoo Payment Receipt';

    return () => {
      if (robotsMeta) robotsMeta.setAttribute('content', 'index, follow');
    };
  }, [cleanPaymentId]);

  // Fetch receipt data strictly from Cloudflare D1 Public API
  const fetchReceiptData = async () => {
    if (!cleanPaymentId) {
      setIsLoading(false);
      setErrorStatus('not_found');
      return;
    }

    setIsLoading(true);
    setErrorStatus(null);

    try {
      const res = await paymentWorkerApi.fetchPublicReceipt(cleanPaymentId);
      if (res.success && res.data) {
        setReceipt({
          ...res.data,
          maskedUpiId: formatMaskedUpi(res.data.maskedUpiId),
        });
        setIsLoading(false);
        return;
      } else {
        setErrorStatus('not_found');
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setErrorStatus('not_found');
      } else {
        setErrorStatus('network_error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceiptData();
  }, [cleanPaymentId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyText = (text: string, fieldLabel: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldLabel);
    showToast(`${fieldLabel} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://www.zenemoo.in/payment/${cleanPaymentId}`;
    const shareTitle = 'Zenemoo Payment Receipt';
    const shareText = receipt ? `Zenemoo payment receipt for ${receipt.name}` : 'Zenemoo payment receipt';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        showToast('Receipt shared successfully');
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Fallback to clipboard
        }
      }
    }

    // Fallback: copy link
    handleCopyText(shareUrl, 'Payment link');
  };

  const navigateHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.location.href = 'https://www.zenemoo.in/';
    }
  };

  const faqItems = [
    {
      q: 'What is this payment receipt?',
      a: 'This is an official payment confirmation receipt issued by Zenemoo for data annotation, translation, transcription, or contributor services performed for Zenemoo projects.',
    },
    {
      q: 'Where can I find my UTR / Reference Number?',
      a: 'The UTR (Unique Transaction Reference) is a 12-digit number provided under Transaction Details on this page. You can also view this reference number in your UPI application (Google Pay, PhonePe, Paytm, BHIM) under payment history.',
    },
    {
      q: 'Why is my payment status showing Paid?',
      a: 'The payment has been confirmed and successfully disbursed via UPI directly to your registered UPI address.',
    },
    {
      q: 'What should I do if I have not received the payment in my bank account?',
      a: 'UPI transfers are generally credited within seconds. However, if your receiving bank is undergoing maintenance or experiencing downtime, please allow up to 2–4 hours. If still uncredited, contact support@zenemoo.in with your Zenemoo Payment ID and UTR number.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050508] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-between relative overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-indigo-500/10 via-cyan-500/5 to-transparent rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-cyan-500/40 text-cyan-300 px-4 py-2 rounded-full shadow-2xl backdrop-blur-xl text-xs font-semibold flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <header className="relative z-10 border-b border-white/10 bg-[#090d16]/80 backdrop-blur-xl py-3 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigateHome();
              }
            }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Zenemoo Brand Logo & Title */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={navigateHome}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-[1.5px] shadow-lg shadow-cyan-500/20">
              <img
                src="/assets/logo.png"
                alt="Zenemoo Logo"
                className="w-full h-full object-contain rounded-[10px] bg-[#090d16] p-0.5"
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-white text-base tracking-tight font-display">
                Zenemoo
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                Pay
              </span>
            </div>
          </div>

          <button
            onClick={navigateHome}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all shadow-sm"
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Back to Home</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="relative z-10 flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 my-4 sm:my-8 space-y-6">
        {isLoading ? (
          <div className="bg-[#0c1220]/90 border border-white/10 rounded-3xl p-10 text-center shadow-2xl backdrop-blur-xl">
            <RefreshCw className="w-10 h-10 animate-spin text-cyan-400 mx-auto mb-4" />
            <h2 className="text-base font-bold text-white">Retrieving Payment Receipt</h2>
            <p className="text-xs text-slate-400 mt-1">Verifying encrypted transaction record...</p>
          </div>
        ) : errorStatus === 'not_found' || !receipt ? (
          /* STATE 5: NOT FOUND */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0c1220]/90 border border-white/10 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <XCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Payment Receipt Not Found</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                We couldn't locate a verified payment receipt matching the identifier <span className="font-mono text-slate-300">{cleanPaymentId || '—'}</span>. Please verify the URL or contact Zenemoo support.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={navigateHome}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25"
              >
                Return to Zenemoo Home
              </button>
              <a
                href="mailto:support@zenemoo.in"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold text-center"
              >
                Contact Support
              </a>
            </div>
          </motion.div>
        ) : (
          /* RECEIPT CARD */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-b from-[#0f172a]/95 via-[#0b1120]/95 to-[#080d19]/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
              {/* Corner decorative light */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* ── SUCCESS / STATUS SECTION ── */}
              <div className="text-center space-y-3 pb-6 border-b border-white/10">
                {receipt.status === 'Paid' ? (
                  <>
                    <div className="relative inline-flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/25 animate-pulse">
                        <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
                        ✓ Paid successfully
                      </span>
                      <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-1">
                        {formatCurrency(receipt.amount, receipt.currency)}
                      </h1>
                      <p className="text-sm font-medium text-slate-300 mt-1">
                        Hi {receipt.name ? receipt.name.split(' ')[0] : 'Contributor'}, you received {formatCurrency(receipt.amount, receipt.currency)}
                      </p>
                    </div>
                  </>
                ) : receipt.status === 'Issue' ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-400 mx-auto shadow-xl shadow-rose-500/20">
                      <AlertTriangle className="w-9 h-9" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-400 block">
                        Payment Issue Reported
                      </span>
                      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                        {formatCurrency(receipt.amount, receipt.currency)}
                      </h1>
                      <p className="text-xs text-slate-400 mt-1">
                        This payout encountered a settlement issue and is being reviewed by the Zenemoo team.
                      </p>
                    </div>
                  </>
                ) : receipt.status === 'Cancelled' ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-slate-700/30 border border-slate-600/50 flex items-center justify-center text-slate-400 mx-auto">
                      <XCircle className="w-9 h-9" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Payment Cancelled
                      </span>
                      <h1 className="text-3xl font-bold text-slate-300 mt-1">
                        {formatCurrency(receipt.amount, receipt.currency)}
                      </h1>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 mx-auto animate-pulse">
                      <Clock className="w-9 h-9" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                        Payment Processing
                      </span>
                      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                        {formatCurrency(receipt.amount, receipt.currency)}
                      </h1>
                      <p className="text-xs text-slate-400 mt-1">
                        Payout intent initiated. Confirmation will appear once UPI transfer settles.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* ── PAYMENT PARTICIPANTS SECTION ── */}
              <div className="py-5 border-b border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Paid To */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {receipt.name ? receipt.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Paid to
                    </span>
                    <div className="text-sm font-bold text-white truncate mt-0.5" title={receipt.name}>
                      {receipt.name || 'Zenemoo Contributor'}
                    </div>
                    {receipt.maskedUpiId && (
                      <div className="text-xs font-mono text-cyan-300 truncate mt-0.5">
                        {receipt.maskedUpiId}
                      </div>
                    )}
                  </div>
                </div>

                {/* Paid From */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 p-1 flex items-center justify-center shrink-0">
                    <img
                      src="/assets/logo.png"
                      alt="Zenemoo"
                      className="w-full h-full object-contain rounded"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Paid from
                    </span>
                    <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                      <span>Zenemoo</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Official Project Payout
                    </div>
                  </div>
                </div>
              </div>

              {/* ── WORK & SERVICE DETAILS ── */}
              <div className="py-5 border-b border-white/10 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Work Details
                </span>

                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2.5 text-xs">
                  {receipt.projectName && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Project</span>
                      <span className="font-semibold text-white text-right truncate max-w-[240px]">
                        {receipt.projectName}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Work Type</span>
                    <span className="font-semibold text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                      {receipt.workType || 'Contributor Task'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-slate-400">Disbursed Amount</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {formatCurrency(receipt.amount, receipt.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── TRANSACTION DETAILS ── */}
              <div className="pt-5 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Transaction Details
                </span>

                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3 text-xs">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Status</span>
                    <div>
                      {receipt.status === 'Paid' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Paid
                        </span>
                      ) : receipt.status === 'Issue' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Issue
                        </span>
                      ) : receipt.status === 'Cancelled' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
                          Cancelled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5" />
                          Processing
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Payment Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Payment Date</span>
                    <span className="font-semibold text-slate-200">
                      {formatDisplayDate(receipt.paymentDate)}
                    </span>
                  </div>

                  {/* UTR / Reference Number */}
                  {receipt.utr && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-400">Reference / UTR</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-emerald-300">
                          {receipt.utr}
                        </span>
                        <button
                          onClick={() => handleCopyText(receipt.utr!, 'Reference Number')}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                          title="Copy Reference Number"
                        >
                          {copiedField === 'Reference Number' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Zenemoo Payment ID */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-slate-400">Zenemoo Payment ID</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-200 font-semibold text-[11px]">
                        {receipt.zenemooPaymentId}
                      </span>
                      <button
                        onClick={() => handleCopyText(receipt.zenemooPaymentId, 'Zenemoo Payment ID')}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Copy Payment ID"
                      >
                        {copiedField === 'Zenemoo Payment ID' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Batch ID if present */}
                  {receipt.batchId && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Batch Ref</span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {receipt.batchId}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── SHARE BUTTON ── */}
              <div className="pt-6">
                <button
                  onClick={handleShare}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Payment Receipt</span>
                </button>
              </div>
            </div>

            {/* ── HELP & FAQ SECTION ── */}
            <div className="bg-[#0c1220]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Help & Frequently Asked Questions</h3>
              </div>

              <div className="space-y-2">
                {faqItems.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="border border-white/5 rounded-xl bg-white/[0.02] overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full py-3 px-4 text-left text-xs font-semibold text-slate-200 flex items-center justify-between gap-2 hover:text-white"
                      >
                        <span>{item.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-cyan-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-3.5 text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-2">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>Need assistance? Contact</span>
                <a
                  href="mailto:support@zenemoo.in"
                  className="text-cyan-300 font-semibold hover:underline"
                >
                  support@zenemoo.in
                </a>
              </div>
            </div>

            {/* ── TALENT REGISTRATION CTA ── */}
            <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900 to-cyan-950/70 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl text-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Interested in working with Zenemoo?</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
                  Explore paid AI data annotation, transcription, translation, and speech collection opportunities. Register now to join our contributor network.
                </p>
              </div>
              <div className="pt-1">
                <a
                  href="https://www.zenemoo.in/talent-registration"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all"
                >
                  <span>Join Zenemoo Talent Network</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/10 bg-[#070a12] py-6 px-4 text-center text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-center gap-2 text-slate-300 font-bold">
          <span>Zenemoo</span>
          <span>•</span>
          <span className="text-slate-400 font-normal">Professional language and data services</span>
        </div>
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 flex-wrap">
          <a href="https://www.zenemoo.in/" className="hover:text-white transition-colors">
            Home
          </a>
          <span>•</span>
          <a href="https://www.zenemoo.in/talent-registration" className="hover:text-white transition-colors">
            Talent Registration
          </a>
          <span>•</span>
          <a href="mailto:support@zenemoo.in" className="hover:text-white transition-colors">
            support@zenemoo.in
          </a>
        </div>
        <p className="text-[10px] text-slate-600">
          © {new Date().getFullYear()} Zenemoo. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
