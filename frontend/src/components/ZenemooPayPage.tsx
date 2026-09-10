import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ArrowRight,
  User,
  Mail,
  Phone,
  Building2,
  RefreshCw,
  Copy,
  Check,
  FileText,
  CreditCard,
  Wallet,
  Landmark,
  Shield,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { paymentLinksApi, supportApi } from '../services/api';
import { launchCashfreeCheckout } from '../utils/cashfree';
import { PaymentResultView } from './PaymentResultView';
import { SeoMeta } from '../seo/components/SeoMeta';

interface ZenemooPayPageProps {
  onBackToHome?: () => void;
  onOpenAiDrawer?: () => void;
}

interface PublicLinkInfo {
  link_id: string;
  amount: number;
  currency: string;
  purpose: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  link_status: string;
  link_expiry_time?: string | null;
  source?: string;
  gateway_mode?: string;
}

export const ZenemooPayPage: React.FC<ZenemooPayPageProps> = ({
  onBackToHome,
}) => {
  const [linkId, setLinkId] = useState<string | null>(null);
  const [orderIdFromUrl, setOrderIdFromUrl] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<PublicLinkInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form editable states
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);

  // Payment processing state
  const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'checkout' | 'result'>('idle');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Parse route parameters on mount
  useEffect(() => {
    window.scrollTo(0, 0);

    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.replace(/\/$/, '');
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);

      const resolvedOrderId = searchParams.get('order_id') || searchParams.get('cf_order_id');
      if (resolvedOrderId) {
        setOrderIdFromUrl(resolvedOrderId);
        setActiveOrderId(resolvedOrderId);
        setPaymentState('result');
        setLoading(false);
        return;
      }

      let extractedLinkId: string | null = null;
      if (pathname.startsWith('/pay/')) {
        extractedLinkId = pathname.replace('/pay/', '').replace(/^\//, '');
      } else if (hash.startsWith('#pay/')) {
        extractedLinkId = hash.replace('#pay/', '').replace(/^\//, '');
      } else if (hash.startsWith('#/pay/')) {
        extractedLinkId = hash.replace('#/pay/', '').replace(/^\//, '');
      } else {
        extractedLinkId = searchParams.get('link_id');
      }

      if (extractedLinkId) {
        setLinkId(extractedLinkId);
        fetchPaymentLinkDetails(extractedLinkId);
      } else {
        setLoading(false);
        setErrorStatus('INVALID');
        setErrorMessage('No payment link identifier provided. Please check the URL.');
      }
    }
  }, []);

  const fetchPaymentLinkDetails = async (id: string) => {
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const res = await paymentLinksApi.getPublicLink(id);
      const data = res?.data || res;

      if (data?.success && data?.link) {
        const link = data.link as PublicLinkInfo;
        setLinkData(link);
        setCustomerName(link.customer_name || '');
        setCustomerEmail(link.customer_email || '');
        setCustomerPhone(link.customer_phone || '');
      } else {
        setErrorStatus(data?.status || 'NOT_FOUND');
        setErrorMessage(data?.message || 'Payment link is not available.');
      }
    } catch (err: any) {
      console.error('Failed to resolve payment link:', err);
      const status = err?.response?.data?.status || (err?.response?.status === 410 ? 'EXPIRED' : 'ERROR');
      const msg = err?.response?.data?.message || err?.message || 'Unable to retrieve payment link details.';
      setErrorStatus(status);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkData || paymentState === 'processing') return;

    if (!agreedToTerms) {
      setErrorMessage('Please accept the payment terms to continue.');
      return;
    }

    setPaymentState('processing');
    setErrorMessage(null);

    try {
      const returnUrl = window.location.origin.startsWith('https://')
        ? `${window.location.origin}/pay/${encodeURIComponent(linkData.link_id)}?order_id={order_id}`
        : `https://www.zenemoo.in/pay/${encodeURIComponent(linkData.link_id)}?order_id={order_id}`;

      const res = await supportApi.createPayment({
        amount: Number(linkData.amount),
        currency: linkData.currency || 'INR',
        purpose: linkData.purpose || 'Support Zenemoo — Platform & Technology',
        customer_name: customerName.trim() || 'Zenemoo Supporter',
        customer_email: customerEmail.trim() || 'supporter@zenemoo.in',
        customer_phone: customerPhone.trim() || '9999999999',
        return_url: returnUrl,
        link_id: linkData.link_id,
        source: 'Admin Payment Link',
      });

      const data = res?.data || res;
      if (!data?.success || !data?.paymentSessionId) {
        throw new Error(data?.message || 'Failed to initialize payment gateway.');
      }

      const { orderId, paymentSessionId, env } = data;
      setActiveOrderId(orderId);
      setPaymentState('checkout');

      // Launch Cashfree PG Checkout Modal
      try {
        await launchCashfreeCheckout({
          paymentSessionId,
          mode: env === 'production' ? 'production' : 'sandbox',
        });
      } catch (sdkErr: any) {
        console.warn('Cashfree Checkout callback:', sdkErr.message);
      }

      // Transition to verification result view
      setPaymentState('result');
    } catch (err: any) {
      console.error('Payment checkout error:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to initialize payment checkout.');
      setPaymentState('idle');
    }
  };

  const formattedExpiry = linkData?.link_expiry_time
    ? new Date(linkData.link_expiry_time).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '10 Oct 2026';

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans relative selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-between overflow-x-hidden">
      <SeoMeta
        title={linkData ? `Payment Request — ${linkData.purpose} | Zenemoo` : 'Secure Payment Request | Zenemoo'}
        description="Complete your secure payment with Zenemoo Data Solutions via Cashfree Payment Gateway. Instant confirmation and verified receipts."
        robots="noindex, nofollow"
      />

      {/* Ambient Cybernetic Neon Glow Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[150px]" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] rounded-full bg-sky-600/10 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
      </div>

      {/* Decorative Side Accents */}
      <div className="hidden 2xl:flex fixed left-8 top-1/2 -translate-y-1/2 flex-col items-center gap-4 text-slate-500 text-[11px] font-mono tracking-[0.25em] select-none z-10 opacity-70">
        <div className="writing-vertical-lr flex flex-col items-center gap-3">
          <span>BUILDING</span>
          <span>A BRIGHTER</span>
          <span>TOMORROW</span>
          <span>TOGETHER</span>
        </div>
        <div className="w-0.5 h-16 bg-gradient-to-b from-cyan-500/50 to-transparent rounded-full" />
      </div>

      <div className="hidden 2xl:flex fixed right-10 top-1/3 flex-col items-end text-cyan-400/80 font-serif italic text-2xl select-none z-10 pointer-events-none">
        <span className="tracking-wide">Secure</span>
        <span className="tracking-wide -mt-1">Simple</span>
        <span className="tracking-wide -mt-1">Trusted</span>
        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent to-cyan-400/60 rounded-full mt-2" />
      </div>

      {/* 1. TOP NAVBAR HEADER — Fixed at top with glass backdrop & Official Logo */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[#030712]/95 backdrop-blur-xl border-b border-white/10 py-2.5 sm:py-3.5 px-3.5 sm:px-12 transition-all shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <a
            href="/"
            onClick={(e) => {
              if (onBackToHome) {
                e.preventDefault();
                onBackToHome();
              }
            }}
            className="flex items-center gap-2 sm:gap-3 group cursor-pointer min-w-0"
          >
            {/* Official Logo.png Container */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white p-0.5 sm:p-1 shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
              <img
                src="/assets/logo.png"
                alt="Zenemoo"
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('/logo.png')) {
                    target.src = '/logo.png';
                  }
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="font-display font-extrabold text-white text-sm sm:text-base tracking-wider group-hover:text-cyan-400 transition-colors truncate">
                ZENEMOO
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-sans tracking-tight truncate hidden xs:block">
                People &bull; Opportunities &bull; Impact
              </div>
            </div>
          </a>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium shadow-sm shadow-cyan-500/10">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>256-Bit SSL Encrypted</span>
            </div>
            <a
              href="/"
              onClick={(e) => {
                if (onBackToHome) {
                  e.preventDefault();
                  onBackToHome();
                }
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#0a1020] hover:bg-[#101b33] text-slate-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1 sm:gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Back to Home</span>
              <span className="xs:hidden">Home</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-xl mx-auto w-full px-3.5 sm:px-4 pt-20 sm:pt-28 pb-8 sm:pb-16 flex-1 flex flex-col justify-center">
        {/* PAYMENT RESULT / RECEIPT VIEW */}
        {paymentState === 'result' && activeOrderId ? (
          <div className="space-y-6">
            <PaymentResultView
              orderId={activeOrderId}
              onClose={() => {
                if (onBackToHome) onBackToHome();
                else window.location.href = '/';
              }}
              onRetry={() => {
                setPaymentState('idle');
                setActiveOrderId(null);
                setOrderIdFromUrl(null);
              }}
            />
          </div>
        ) : loading ? (
          /* SKELETON LOADING STATE */
          <div className="p-6 sm:p-10 rounded-[28px] sm:rounded-[32px] border border-cyan-500/20 bg-[#070e1c]/90 backdrop-blur-2xl shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white font-display">Loading Payment Request...</h2>
              <p className="text-xs text-slate-400 font-mono">Verifying details with Zenemoo Payment Server.</p>
            </div>
            <div className="space-y-3 pt-4">
              <div className="h-16 bg-white/5 rounded-2xl animate-pulse" />
              <div className="h-28 bg-white/5 rounded-2xl animate-pulse" />
              <div className="h-24 bg-white/5 rounded-2xl animate-pulse" />
            </div>
          </div>
        ) : errorStatus || !linkData ? (
          /* ERROR / EXPIRED / INVALID LINK STATE */
          <div className="p-6 sm:p-10 rounded-[28px] sm:rounded-[32px] border border-amber-500/30 bg-[#070e1c]/90 backdrop-blur-2xl shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/20">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white font-display">
                {errorStatus === 'EXPIRED'
                  ? 'Payment Link Expired'
                  : errorStatus === 'PAID'
                  ? 'Payment Already Completed'
                  : errorStatus === 'CANCELLED'
                  ? 'Payment Link Cancelled'
                  : 'Payment Link Not Found'}
              </h2>
              <p className="text-xs text-slate-400 font-mono leading-relaxed max-w-sm mx-auto">
                {errorMessage ||
                  (errorStatus === 'EXPIRED'
                    ? 'This payment link has reached its validity date. Please ask the sender to generate a fresh link.'
                    : errorStatus === 'PAID'
                    ? 'This payment request has already been successfully paid.'
                    : 'The requested payment link does not exist or may have been removed.')}
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/"
                onClick={(e) => {
                  if (onBackToHome) {
                    e.preventDefault();
                    onBackToHome();
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold transition-all"
              >
                Go to Homepage
              </a>
              <a
                href="/support-zenemooindia"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 text-xs font-mono transition-all"
              >
                Direct Support Page
              </a>
            </div>
          </div>
        ) : (
          /* EXACT UI MATCHING THE REFERENCE IMAGE */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] sm:rounded-[32px] border border-cyan-500/25 bg-[#070e1c]/95 backdrop-blur-2xl shadow-[0_0_60px_rgba(6,182,212,0.12)] p-4 sm:p-9 space-y-5 sm:space-y-6"
          >
            {/* 1. TOP STATUS & LINK ID BAR — Responsive & Overflow-Safe */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 sm:gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[11px] sm:text-xs font-semibold w-fit shrink-0">
                <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Verified Payment Link</span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-slate-400 bg-white/[0.03] sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg sm:rounded-none border border-white/5 sm:border-0 max-w-full overflow-hidden">
                <span className="text-slate-500 shrink-0">ID:</span>
                <span className="text-slate-300 font-semibold truncate" title={linkData.link_id}>
                  {linkData.link_id}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(linkData.link_id, 'Link ID')}
                  className="p-1 text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                  title="Copy ID"
                >
                  {copiedField === 'Link ID' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* 2. CARD HEADER: PAYMENT REQUEST + REASON */}
            <div className="space-y-1.5 sm:space-y-2">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
                Payment <span className="text-cyan-400">Request</span>
              </h1>
              <h2 className="text-sm sm:text-lg font-bold text-white tracking-normal leading-snug break-words">
                {linkData.purpose || 'Support Zenemoo — Platform & Technology'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                This is a secure payment link created by Zenemoo.
                <br className="hidden sm:inline" />
                {' '}Please review the details below and proceed to complete your payment.
              </p>
            </div>

            {/* FORM CONTAINER */}
            <form onSubmit={handlePay} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 3. AMOUNT DUE & VALIDITY CARD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#060c18] border border-cyan-500/20 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
                    <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] sm:text-xs text-slate-400 font-sans font-medium">Amount Due</div>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-2xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
                        ₹{Number(linkData.amount).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-mono uppercase text-cyan-400 font-bold">
                        {linkData.currency || 'INR'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-left xs:text-right w-full xs:w-auto pt-2 xs:pt-0 border-t border-white/5 xs:border-0 flex xs:flex-col items-center xs:items-end justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-[11px] font-semibold">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>Valid until</span>
                  </div>
                  <div className="text-emerald-400 font-bold text-xs sm:text-base font-mono mt-0 xs:mt-1.5">
                    {formattedExpiry}
                  </div>
                </div>
              </div>

              {/* 4. PAYER INFORMATION CARD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#060c18] border border-white/5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>Payer Information</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 font-sans text-right truncate">
                    Receipt will be emailed here
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Prem Prasad Pradhan"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#040812] border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 text-xs sm:text-sm font-mono transition-colors"
                    />
                  </div>

                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="mr.prem2006@gmail.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#040812] border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 text-xs sm:text-sm font-mono transition-colors"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                      placeholder="+91 9827775230"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#040812] border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 text-xs sm:text-sm font-mono transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* 5. PAYMENT DETAILS BREAKDOWN CARD */}
              <div className="p-5 rounded-2xl bg-[#060c18] border border-white/5 space-y-3">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Payment Details</span>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Payment Amount</span>
                    <span className="text-white font-bold font-mono">
                      ₹{Number(linkData.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Gateway & Platform Fee</span>
                    <span className="text-emerald-400 font-semibold font-mono">₹0 (Waived)</span>
                  </div>

                  <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
                    <span className="font-bold text-white text-sm sm:text-base">Total Payable</span>
                    <span className="font-extrabold text-cyan-400 font-display text-xl sm:text-2xl">
                      ₹{Number(linkData.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. SUPPORTED PAYMENT METHODS GRID */}
              <div className="p-5 rounded-2xl bg-[#060c18] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-cyan-400" />
                    <span>Supported Payment Methods</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-sans">
                    UPI, Cards, NetBanking, Wallets
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#040812] border border-white/10 flex flex-col items-center justify-center gap-1.5 text-center group hover:border-cyan-500/40 transition-colors">
                    <div className="w-6 h-6 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-500 to-amber-400 flex items-center justify-center text-[9px] font-black text-black">
                        ▲
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300">UPI</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#040812] border border-white/10 flex flex-col items-center justify-center gap-1.5 text-center group hover:border-cyan-500/40 transition-colors">
                    <CreditCard className="w-5 h-5 text-cyan-400" />
                    <span className="text-[11px] font-bold text-slate-300">Cards</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#040812] border border-white/10 flex flex-col items-center justify-center gap-1.5 text-center group hover:border-cyan-500/40 transition-colors">
                    <Landmark className="w-5 h-5 text-blue-400" />
                    <span className="text-[11px] font-bold text-slate-300">NetBanking</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#040812] border border-white/10 flex flex-col items-center justify-center gap-1.5 text-center group hover:border-cyan-500/40 transition-colors">
                    <Wallet className="w-5 h-5 text-purple-400" />
                    <span className="text-[11px] font-bold text-slate-300">Wallets</span>
                  </div>
                </div>
              </div>

              {/* 7. TERMS & PRIVACY CHECKBOX */}
              <label className="flex items-center gap-3 cursor-pointer text-xs text-slate-400 select-none pt-1">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-0 cursor-pointer w-4 h-4"
                />
                <span>
                  I agree to Zenemoo's{' '}
                  <a href="/terms" target="_blank" className="text-cyan-400 hover:underline">
                    payment terms
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" className="text-cyan-400 hover:underline">
                    privacy policy
                  </a>
                  .
                </span>
              </label>

              {/* 8. GLOWING CYAN-BLUE PAY CTA BUTTON */}
              <button
                type="submit"
                disabled={paymentState === 'processing' || !agreedToTerms}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:via-sky-400 hover:to-blue-500 text-white font-bold font-display text-base flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_35px_rgba(6,182,212,0.35)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paymentState === 'processing' ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>Connecting Cashfree PG...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Proceed to Secure Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* 9. SECURED BY CASHFREE TAGLINE */}
              <div className="pt-2 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300 font-medium">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>
                    Secured by <strong className="text-white font-bold">Cashfree</strong>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Your payment information is always safe and encrypted.
                </p>
              </div>
            </form>
          </motion.div>
        )}

        {/* 10. BOTTOM 3 FEATURE COLUMNS */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="flex items-start gap-3 p-3">
            <ShieldCheck className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">Secure Payments</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Powered by Cashfree</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3">
            <Lock className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">256-Bit SSL Encrypted</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Your data is always safe</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3">
            <Users className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">Trusted by Businesses</div>
              <div className="text-[11px] text-slate-400 mt-0.5">For secure payments</div>
            </div>
          </div>
        </div>

        {/* 11. BOTTOM DIVIDER & JOURNEY NOTE */}
        <div className="mt-6 flex items-center justify-center gap-3 text-[11px] text-slate-500 font-mono text-center">
          <div className="h-px w-16 sm:w-28 bg-gradient-to-r from-transparent to-cyan-500/30" />
          <span>Thank you for being part of the Zenemoo journey.</span>
          <div className="h-px w-16 sm:w-28 bg-gradient-to-l from-transparent to-cyan-500/30" />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-6 text-center text-xs font-mono text-slate-600">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Zenemoo Data Solutions. All rights reserved.</span>
          <div className="flex items-center gap-4 text-slate-500">
            <a href="/privacy" className="hover:text-cyan-400 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-cyan-400 transition-colors">Terms</a>
            <a href="mailto:support@zenemoo.in" className="hover:text-cyan-400 transition-colors">support@zenemoo.in</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
