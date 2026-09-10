import React, { useState, useEffect } from 'react';
import {
  Heart,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Check,
  X,
  Users,
  Settings,
  Globe,
  User,
  Mail,
  Link2,
} from 'lucide-react';
import { api, paymentLinksApi } from '../services/api';
import { launchCashfreeCheckout } from '../utils/cashfree';

export interface ReceiptInfo {
  orderId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  customerName?: string;
  customerEmail?: string;
  paymentMethod?: string;
  purpose?: string;
}

export type PurposeId = 'build' | 'empower' | 'expand' | 'innovate' | 'general';

export interface PresetCard {
  amount: number;
  subtitle: string;
}

const PRESET_CARDS: PresetCard[] = [
  { amount: 500, subtitle: 'Support our journey' },
  { amount: 1000, subtitle: 'Help us scale impact' },
  { amount: 2500, subtitle: 'Expand opportunities' },
  { amount: 5000, subtitle: 'Build a brighter future' },
];

const CONTEXTUAL_MESSAGES: Record<PurposeId, string> = {
  build:
    'Your contribution helps us strengthen core technology, platform infrastructure, and compute resources for contributors across India.',
  empower:
    'Your contribution helps us provide training, tools, and fair compensation resources for freelance annotators and workers.',
  expand:
    'Your contribution helps us expand remote work opportunities into more Indian regional languages and rural communities.',
  innovate:
    'Your contribution helps us develop cutting-edge Indic AI benchmarks, speech data solutions, and community technologies.',
  general:
    'Your contribution helps us build better technology, empower contributors, expand opportunities and create a brighter future.',
};

interface SupportContributionSectionProps {
  initialPurpose?: PurposeId;
  directLinkId?: string | null;
  onClose?: () => void;
  onSuccess?: (receipt: ReceiptInfo) => void;
  className?: string;
}

export const SupportContributionSection: React.FC<SupportContributionSectionProps> = ({
  initialPurpose = 'general',
  directLinkId = null,
  onClose,
  onSuccess,
  className = '',
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);

  // Secure Server-side Link Resolution State
  const [resolvedLinkId, setResolvedLinkId] = useState<string | null>(directLinkId || null);
  const [linkPurpose, setLinkPurpose] = useState<string | null>(null);
  const [linkStatusError, setLinkStatusError] = useState<string | null>(null);
  const [isLoadingLink, setIsLoadingLink] = useState<boolean>(false);

  const [paymentState, setPaymentState] = useState<
    'idle' | 'processing' | 'checkout' | 'pending' | 'success' | 'failed' | 'cancelled'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptInfo | null>(null);

  // Resolve secure opaque payment link from server
  useEffect(() => {
    let activeLinkId = directLinkId;
    if (!activeLinkId && typeof window !== 'undefined') {
      const pathname = window.location.pathname.replace(/\/$/, '');
      const hash = window.location.hash;
      if (pathname.startsWith('/pay/')) {
        activeLinkId = pathname.replace('/pay/', '').replace(/^\//, '');
      } else if (hash.startsWith('#pay/')) {
        activeLinkId = hash.replace('#pay/', '').replace(/^\//, '');
      } else if (hash.startsWith('#/pay/')) {
        activeLinkId = hash.replace('#/pay/', '').replace(/^\//, '');
      } else {
        const searchParams = new URLSearchParams(window.location.search);
        activeLinkId = searchParams.get('link_id');
      }
    }

    if (activeLinkId) {
      setResolvedLinkId(activeLinkId);
      setIsLoadingLink(true);
      setLinkStatusError(null);

      paymentLinksApi.getPublicLink(activeLinkId)
        .then((res: any) => {
          const data = res?.data || res;
          if (data?.success && data?.link) {
            const link = data.link;
            if (link.amount) {
              const num = Number(link.amount);
              setSelectedPreset(null);
              setCustomAmount(String(num));
            }
            if (link.customer_name) setCustomerName(link.customer_name);
            if (link.customer_email) setCustomerEmail(link.customer_email);
            if (link.customer_phone) setCustomerPhone(link.customer_phone);
            if (link.purpose) setLinkPurpose(link.purpose);
          } else {
            setLinkStatusError(data?.message || 'Payment link is inactive or could not be loaded.');
          }
        })
        .catch((err: any) => {
          const msg = err?.response?.data?.message || err?.message || 'Unable to load payment link.';
          setLinkStatusError(msg);
        })
        .finally(() => {
          setIsLoadingLink(false);
        });
    }
  }, [directLinkId]);

  // Auto-fill logged-in user profile if available
  useEffect(() => {
    try {
      const portalUserStr = localStorage.getItem('zenemoo_portal_user');
      if (portalUserStr) {
        const parsed = JSON.parse(portalUserStr);
        if (parsed.name && !customerName) setCustomerName(parsed.name);
        if (parsed.email && !customerEmail) setCustomerEmail(parsed.email);
        if (parsed.phone && !customerPhone) setCustomerPhone(parsed.phone);
      }
    } catch (_) {}
  }, []);

  // Check URL parameters for return from Cashfree
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const orderIdParam = searchParams.get('order_id') || searchParams.get('cf_order_id');
    if (orderIdParam && paymentState === 'idle') {
      verifyPaymentStatus(orderIdParam);
    }
  }, []);

  const effectiveAmount = customAmount ? parseFloat(customAmount) : selectedPreset || 0;
  const contextualMessage =
    CONTEXTUAL_MESSAGES[initialPurpose] || CONTEXTUAL_MESSAGES.general;

  const handlePresetSelect = (amt: number) => {
    setSelectedPreset(amt);
    setCustomAmount('');
    setErrorMessage(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(val);
    setSelectedPreset(null);
    setErrorMessage(null);
  };

  // Verify payment status with backend API
  const verifyPaymentStatus = async (orderId: string, retryCount = 0) => {
    setPaymentState('pending');
    setActiveOrderId(orderId);
    setErrorMessage(null);

    try {
      const res = await api.get(`/support/verify-payment/${encodeURIComponent(orderId)}`);
      const data = res.data;

      if (data.status === 'SUCCESS') {
        const receiptData: ReceiptInfo = {
          orderId: data.orderId || orderId,
          paymentId: data.paymentId || `CF_${orderId}`,
          amount: data.amount || effectiveAmount,
          currency: data.currency || 'INR',
          status: 'Successful',
          purpose: data.purpose || 'Support Zenemoo',
          date: new Date(data.paymentTime || data.createdAt || Date.now()).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          customerName: data.customerName || customerName || 'Zenemoo Supporter',
          customerEmail: data.customerEmail || customerEmail,
          paymentMethod: data.paymentMethod || 'Cashfree',
        };
        setReceipt(receiptData);
        setPaymentState('success');
        if (onSuccess) onSuccess(receiptData);
      } else if (data.status === 'FAILED') {
        setPaymentState('failed');
        setErrorMessage('The payment could not be completed by your bank or payment method.');
      } else if (data.status === 'CANCELLED') {
        setPaymentState('cancelled');
      } else {
        if (retryCount < 2) {
          setTimeout(() => {
            verifyPaymentStatus(orderId, retryCount + 1);
          }, 2500);
        } else {
          setPaymentState('pending');
        }
      }
    } catch (err: any) {
      console.warn('Payment verification error:', err);
      if (retryCount < 1) {
        setTimeout(() => verifyPaymentStatus(orderId, retryCount + 1), 2000);
      } else {
        setPaymentState('pending');
      }
    }
  };

  // Handle support payment initiation
  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentState === 'processing') return;

    if (!agreedToTerms) {
      setErrorMessage('Please agree to the Support Terms and Privacy Policy to continue.');
      return;
    }

    if (!effectiveAmount || isNaN(effectiveAmount) || effectiveAmount < 10) {
      setErrorMessage('Please select or enter an amount of at least ₹10.');
      return;
    }

    if (effectiveAmount > 500000) {
      setErrorMessage('Amount cannot exceed ₹5,00,000.');
      return;
    }

    setPaymentState('processing');
    setErrorMessage(null);

    try {
      const returnUrl = window.location.origin.startsWith('https://')
        ? `${window.location.origin}/support-zenemooindia?order_id={order_id}`
        : 'https://www.zenemoo.in/support-zenemooindia?order_id={order_id}';

      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const effectiveLinkId = resolvedLinkId || directLinkId || urlParams?.get('link_id') || undefined;

      const res = await api.post('/support/create-payment', {
        amount: effectiveAmount,
        currency: 'INR',
        purpose: linkPurpose || 'Support Zenemoo',
        customer_name: customerName || 'Zenemoo Supporter',
        customer_email: customerEmail || 'supporter@zenemoo.in',
        customer_phone: customerPhone || '9999999999',
        return_url: returnUrl,
        link_id: effectiveLinkId,
        source: effectiveLinkId ? 'Admin Payment Link' : 'Direct Support Page',
      });

      if (!res.data || !res.data.success) {
        throw new Error(res.data?.message || 'Failed to initialize payment session.');
      }

      const { orderId, paymentSessionId, env } = res.data;
      setActiveOrderId(orderId);
      setPaymentState('checkout');

      // Launch official Cashfree Checkout modal
      try {
        const checkoutResult = await launchCashfreeCheckout({
          paymentSessionId,
          mode: env === 'production' ? 'production' : 'sandbox',
        });

        if (checkoutResult?.error) {
          console.log('Cashfree checkout modal result:', checkoutResult.error);
        }
        await verifyPaymentStatus(orderId);
      } catch (sdkErr: any) {
        console.warn('Cashfree Checkout invocation callback:', sdkErr.message);
        await verifyPaymentStatus(orderId);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Payment initialization failed.';
      console.error('Payment initiation error:', err);
      setErrorMessage(msg);
      setPaymentState('idle');
    }
  };

  const resetForm = () => {
    setPaymentState('idle');
    setErrorMessage(null);
    setReceipt(null);
    setActiveOrderId(null);
  };

  // -------------------------------------------------------------
  // RENDER: SUCCESS STATE (DIGITAL RECEIPT)
  // -------------------------------------------------------------
  if (paymentState === 'success' && receipt) {
    return (
      <div className={`p-5 sm:p-7 text-white text-left space-y-5 ${className}`}>
        {/* Header with Close */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/20">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                Payment Successful
              </span>
              <h3 className="text-base sm:text-lg font-bold font-display text-white">
                Thank You for Supporting Zenemoo
              </h3>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Your support helps us build a stronger platform, empower contributors, and create more opportunities across India.
        </p>

        {/* Digital Receipt Card */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/15 p-4 sm:p-5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider border-b border-white/10 pb-2">
            <span>Support Receipt</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified by Cashfree
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Contribution Amount:</span>
            <span className="font-bold text-lg text-cyan-300 font-display">
              ₹{receipt.amount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Order ID:</span>
            <span className="font-mono text-slate-200 text-xs select-all">
              {receipt.orderId}
            </span>
          </div>

          {receipt.paymentId && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Payment Reference:</span>
              <span className="font-mono text-slate-300 text-xs select-all">
                {receipt.paymentId}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Date:</span>
            <span className="text-slate-200">{receipt.date}</span>
          </div>

          {receipt.customerName && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Supporter:</span>
              <span className="text-white font-medium">{receipt.customerName}</span>
            </div>
          )}

          {receipt.customerEmail && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Receipt Sent To:</span>
              <span className="text-slate-300">{receipt.customerEmail}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={resetForm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 text-white font-semibold text-xs text-center transition-all cursor-pointer"
          >
            Support Again
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs text-center shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Done</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <a
              href="/"
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs text-center shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Return Home</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: MAIN 2-COLUMN MODAL LAYOUT (FITS SINGLE VIEW ON ALL SCREENS)
  // -------------------------------------------------------------
  return (
    <div className={`text-white text-left ${className}`}>
      {/* ========================================================= */}
      {/* 1. MODAL TOP HEADER BAR                                   */}
      {/* ========================================================= */}
      <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-white/10 flex items-center justify-between gap-3">
        {/* Left: Heart Icon Badge + Title & Subtitle */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 shrink-0 shadow-md shadow-cyan-500/25">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950 text-slate-950" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-black font-display text-white tracking-tight leading-tight">
              Support Zenemoo
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 font-normal truncate">
              Your support helps us create more opportunities.
            </p>
          </div>
        </div>

        {/* Right: Cashfree Pill Badge + Close Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>Secure Payment by <strong className="font-bold text-white">Cashfree</strong></span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. TWO-COLUMN MAIN BODY                                    */}
      {/* ========================================================= */}
      <div className="px-5 py-4 sm:px-6 sm:py-4.5 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch">
        
        {/* --------------------------------------------------------- */}
        {/* LEFT COLUMN: BRAND MISSION & ZENEMOO LOGO VISUAL         */}
        {/* --------------------------------------------------------- */}
        <div className="lg:col-span-5 rounded-2xl bg-[#080e1d]/90 border border-white/10 p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl">
          
          <div className="space-y-3.5">
            {/* Zenemoo Logo Presentation Visual (Real Logo on Dark Space) */}
            <div className="relative h-24 sm:h-28 rounded-xl overflow-hidden bg-gradient-to-b from-[#0a1830] via-[#050c18] to-[#02050c] border border-cyan-500/30 flex items-center justify-center shadow-inner group">
              {/* Glowing Nebula and Atmosphere */}
              <div className="absolute w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none animate-pulse" />
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/20 rounded-full blur-xl pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_75%)] pointer-events-none" />

              {/* Central Official Zenemoo Logo (Crisp & Transparent) */}
              <div className="relative z-10 flex flex-col items-center justify-center p-2 text-center">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                  <div className="absolute inset-0 bg-cyan-400/25 rounded-full blur-lg" />
                  <img
                    src="/assets/logo.png"
                    alt="Zenemoo Official Logo"
                    className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.8)] select-none transition-transform duration-300 group-hover:scale-105 relative z-10"
                    loading="eager"
                  />
                </div>
                <div className="mt-1 text-[9px] font-mono font-bold tracking-widest text-cyan-300 uppercase drop-shadow-md">
                  ZENEMOO • A BRIGHT TOMORROW
                </div>
              </div>
            </div>

            {/* Mission Quote */}
            <div className="space-y-1 text-left">
              <h3 className="text-base sm:text-lg font-black font-display tracking-tight leading-snug">
                <span className="text-white block">“Small support.</span>
                <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-400 bg-clip-text text-transparent block">
                  A bigger tomorrow.”
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-normal">
                {contextualMessage}
              </p>
            </div>

            {/* 3 Clean Impact Rows */}
            <div className="space-y-2 pt-1 border-t border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] sm:text-xs font-medium text-slate-200">
                  More opportunities for people
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] sm:text-xs font-medium text-slate-200">
                  Stronger technology and infrastructure
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] sm:text-xs font-medium text-slate-200">
                  A more inclusive and brighter tomorrow
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Pillar Footnote */}
          <div className="pt-2 border-t border-white/10 text-left">
            <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
              PEOPLE • OPPORTUNITIES • IMPACT
            </span>
          </div>
        </div>

        {/* --------------------------------------------------------- */}
        {/* RIGHT COLUMN: CONTRIBUTION FORM & CASHFREE PAYMENT       */}
        {/* --------------------------------------------------------- */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3.5 text-left">
          
          <form onSubmit={handleSupportSubmit} className="space-y-3.5">
            {/* Heading */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                MAKE A DIFFERENCE
              </span>
              <h3 className="text-lg sm:text-2xl font-black font-display text-white tracking-tight">
                Choose an amount to support
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed font-normal">
                Every contribution helps us grow, create more opportunities and build a stronger Zenemoo.
              </p>
            </div>

            {/* Payment Link Info Badge */}
            {linkPurpose && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/30 flex items-center gap-2.5 text-xs text-cyan-200">
                <Link2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-cyan-400 font-bold block">
                    Verified Support Request
                  </span>
                  <span className="font-semibold text-white truncate block">{linkPurpose}</span>
                </div>
              </div>
            )}

            {/* Payment Link Loading */}
            {isLoadingLink && (
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-pulse">
                <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>Verifying payment link details...</span>
              </div>
            )}

            {/* Payment Link Status Error */}
            {linkStatusError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{linkStatusError}</span>
              </div>
            )}

            {/* Error Message if any */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 4 Amount Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_CARDS.map((card) => {
                const isSelected = selectedPreset === card.amount && !customAmount;
                return (
                  <button
                    key={card.amount}
                    type="button"
                    onClick={() => handlePresetSelect(card.amount)}
                    className={`relative p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[68px] sm:min-h-[74px] ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.35)] -translate-y-0.5'
                        : 'bg-[#0b1020]/90 border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.04]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <div className={`text-sm sm:text-base font-black font-display ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                        ₹{card.amount.toLocaleString('en-IN')}
                      </div>
                      <div className={`text-[9px] sm:text-[10px] leading-tight ${isSelected ? 'text-cyan-200 font-medium' : 'text-slate-400'}`}>
                        {card.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Field */}
            <div className="relative">
              <div className="flex items-center justify-between rounded-xl bg-[#0b1020]/90 border border-white/15 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 px-3 py-2 transition-all">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-slate-400 text-sm font-semibold">₹</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter custom amount"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0 pl-2">
                  Min ₹10 • Max ₹5,00,000
                </span>
              </div>
            </div>

            {/* User Details (Optional) */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-300">
                <User className="w-3 h-3 text-cyan-400" />
                <span>Your Details (Optional)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Name Input */}
                <div className="flex items-center gap-2 rounded-xl bg-[#0b1020]/90 border border-white/15 focus-within:border-cyan-400 px-3 py-2 transition-all">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Your name (Anonymous is fine)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Email Input */}
                <div className="flex items-center gap-2 rounded-2xl bg-[#0b1020]/90 border border-white/15 focus-within:border-cyan-400 px-3 py-2 transition-all">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="email"
                    placeholder="Email address (for receipt)"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Terms & Privacy Checkbox */}
            <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer accent-cyan-400 shrink-0"
              />
              <span>
                I agree to the{' '}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                >
                  Support Terms
                </a>{' '}
                and{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            {/* Primary Payment Action Button */}
            <div>
              <button
                type="submit"
                disabled={paymentState === 'processing' || !effectiveAmount}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm font-display shadow-xl shadow-cyan-500/25 hover:shadow-cyan-400/40 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {paymentState === 'processing' ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Preparing Secure Payment...</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 fill-slate-950 text-slate-950" />
                    <span>
                      Continue to Secure Payment (₹{effectiveAmount.toLocaleString('en-IN')})
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>
            </div>

            {/* Payment Security Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/10">
              <div className="flex items-center gap-2 text-left">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-white">
                    Powered by <span className="font-bold text-cyan-300">Cashfree</span>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Trusted by millions across India
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-left">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-white">
                    256-Bit SSL Encrypted
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Your information is always safe
                  </div>
                </div>
              </div>
            </div>
          </form>

        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MODAL FOOTER                                           */}
      {/* ========================================================= */}
      <div className="px-5 pb-3.5 pt-1 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-cyan-500/30" />
          <span className="text-[10px] font-sans text-slate-400 tracking-wide">
            Thank you for being part of the Zenemoo journey.
          </span>
          <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-cyan-500/30" />
        </div>
      </div>
    </div>
  );
};
