import React, { useState, useEffect } from 'react';
import {
  Heart,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Info,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
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
}

interface SupportContributionSectionProps {
  variant?: 'hero' | 'section' | 'modal';
  onSuccess?: (receipt: ReceiptInfo) => void;
  className?: string;
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000];

export const SupportContributionSection: React.FC<SupportContributionSectionProps> = ({
  variant = 'section',
  onSuccess,
  className = '',
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  const [paymentState, setPaymentState] = useState<
    'idle' | 'processing' | 'checkout' | 'pending' | 'success' | 'failed' | 'cancelled'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptInfo | null>(null);
  const [needsCredentialsNotice, setNeedsCredentialsNotice] = useState<boolean>(false);

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
        setErrorMessage('The payment could not be processed by your bank or payment provider.');
      } else if (data.status === 'CANCELLED') {
        setPaymentState('cancelled');
      } else {
        // Still pending: Poll once or twice
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

    if (!effectiveAmount || isNaN(effectiveAmount) || effectiveAmount < 10) {
      setErrorMessage('Please select or enter a valid contribution amount (minimum ₹10).');
      return;
    }

    if (effectiveAmount > 500000) {
      setErrorMessage('Contribution amount cannot exceed ₹5,00,000.');
      return;
    }

    setPaymentState('processing');
    setErrorMessage(null);
    setNeedsCredentialsNotice(false);

    try {
      const returnUrl = window.location.origin.startsWith('https://')
        ? `${window.location.origin}/support-zenemooindia?order_id={order_id}`
        : 'https://www.zenemoo.in/support-zenemooindia?order_id={order_id}';

      const res = await api.post('/support/create-payment', {
        amount: effectiveAmount,
        currency: 'INR',
        customer_name: customerName || 'Zenemoo Supporter',
        customer_email: customerEmail || 'supporter@zenemoo.in',
        customer_phone: customerPhone || '9999999999',
        return_url: returnUrl,
      });

      if (!res.data || !res.data.success) {
        throw new Error(res.data?.message || 'Failed to initialize payment session.');
      }

      const { orderId, paymentSessionId, env } = res.data;
      setActiveOrderId(orderId);
      setPaymentState('checkout');

      // Launch official Cashfree Checkout
      try {
        const checkoutResult = await launchCashfreeCheckout({
          paymentSessionId,
          mode: env === 'production' ? 'production' : 'sandbox',
        });

        // After checkout modal resolves or closes, verify status from backend
        if (checkoutResult?.error) {
          console.log('Cashfree checkout modal message:', checkoutResult.error);
        }
        await verifyPaymentStatus(orderId);
      } catch (sdkErr: any) {
        console.warn('Cashfree Checkout invocation issue:', sdkErr.message);
        // Direct verification attempt in case user completed payment in another tab/modal
        await verifyPaymentStatus(orderId);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Payment initialization failed.';
      console.error('Payment initiation error:', err);

      if (err.response?.status === 503 || msg.includes('CASHFREE_CLIENT_ID') || msg.includes('credentials not configured')) {
        setNeedsCredentialsNotice(true);
        setErrorMessage(msg);
      } else {
        setErrorMessage(msg);
      }
      setPaymentState('idle');
    }
  };

  // Safe developer sandbox simulation for local preview before Cashfree credentials are set
  const handleSimulateSandboxSuccess = () => {
    const mockOrderId = `ZNM_SUP_${Date.now()}_DEMO`;
    const mockReceipt: ReceiptInfo = {
      orderId: mockOrderId,
      paymentId: `cf_pay_demo_${Math.floor(100000 + Math.random() * 900000)}`,
      amount: effectiveAmount || 1000,
      currency: 'INR',
      status: 'Successful',
      date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      customerName: customerName || 'Zenemoo Supporter',
      customerEmail: customerEmail || 'supporter@zenemoo.in',
      paymentMethod: 'Cashfree Sandbox Demo',
    };
    setActiveOrderId(mockOrderId);
    setReceipt(mockReceipt);
    setPaymentState('success');
    if (onSuccess) onSuccess(mockReceipt);
  };

  const resetForm = () => {
    setPaymentState('idle');
    setErrorMessage(null);
    setReceipt(null);
    setActiveOrderId(null);
    setNeedsCredentialsNotice(false);
  };

  // -------------------------------------------------------------
  // RENDER: SUCCESS STATE (RECEIPT)
  // -------------------------------------------------------------
  if (paymentState === 'success' && receipt) {
    return (
      <div className={`p-6 sm:p-8 rounded-3xl bg-[#090e1a]/95 border border-emerald-500/40 shadow-2xl shadow-emerald-500/10 text-white text-left relative overflow-hidden backdrop-blur-xl ${className}`}>
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5 mb-5 border-b border-white/10 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/20">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
              Contribution Received
            </span>
            <h3 className="text-xl sm:text-2xl font-bold font-display text-white">
              Thank You for Supporting Zenemoo
            </h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
          Your support has been received successfully. Your contribution helps us build technology, resources, and more opportunities for people across India.
        </p>

        {/* Digital Receipt Card */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/15 p-5 space-y-3.5 mb-6 text-xs sm:text-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider border-b border-white/10 pb-2.5">
            <span>Support Receipt</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified & Complete
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Amount:</span>
            <span className="font-bold text-lg sm:text-xl text-cyan-300 font-display">
              ₹{receipt.amount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Status:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-xs">
              {receipt.status}
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
              <span className="text-slate-400">Payment ID:</span>
              <span className="font-mono text-slate-300 text-xs select-all">
                {receipt.paymentId}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Date:</span>
            <span className="text-slate-200">
              {receipt.date}
            </span>
          </div>

          {receipt.customerName && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Supporter:</span>
              <span className="text-white font-medium">
                {receipt.customerName}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            type="button"
            onClick={resetForm}
            className="flex-1 px-6 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 text-white font-semibold text-xs sm:text-sm text-center transition-all cursor-pointer"
          >
            Support Again
          </button>
          <a
            href="/"
            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm text-center shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Continue Exploring Zenemoo</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: FAILED STATE
  // -------------------------------------------------------------
  if (paymentState === 'failed') {
    return (
      <div className={`p-6 sm:p-8 rounded-3xl bg-[#0a0f1d]/95 border border-red-500/30 text-white text-left space-y-5 backdrop-blur-xl ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg sm:text-xl font-bold font-display text-white">
            Payment could not be completed
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            No worries — your support was not successfully processed. No amount was deducted from your account.
          </p>
        </div>
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-mono">
            {errorMessage}
          </div>
        )}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-500 hover:from-sky-300 hover:to-cyan-400 text-slate-950 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: CANCELLED STATE
  // -------------------------------------------------------------
  if (paymentState === 'cancelled') {
    return (
      <div className={`p-6 sm:p-8 rounded-3xl bg-[#0a0f1d]/95 border border-cyan-500/30 text-white text-left space-y-5 backdrop-blur-xl ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
          <RotateCcw className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg sm:text-xl font-bold font-display text-white">
            Payment Cancelled
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            You can support Zenemoo whenever you're ready. Thank you for your interest and goodwill.
          </p>
        </div>
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-500 hover:from-sky-300 hover:to-cyan-400 text-slate-950 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: PENDING / VERIFYING STATE
  // -------------------------------------------------------------
  if (paymentState === 'pending') {
    return (
      <div className={`p-6 sm:p-8 rounded-3xl bg-[#0a0f1d]/95 border border-amber-500/30 text-white text-left space-y-5 backdrop-blur-xl ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold font-display text-white">
              Payment verification in progress...
            </h3>
            <p className="text-xs text-amber-300">
              Please wait while we confirm your payment with Cashfree.
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          We are confirming the transaction with the payment gateway. This typically takes just a few seconds.
        </p>

        {activeOrderId && (
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300">
            Order Reference: <span className="text-cyan-300">{activeOrderId}</span>
          </div>
        )}

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => activeOrderId && verifyPaymentStatus(activeOrderId)}
            className="px-5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Verification</span>
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: IDLE / FORM STATE (CHOOSE AMOUNT & SUPPORT)
  // -------------------------------------------------------------
  return (
    <div
      className={`rounded-3xl bg-[#0a0f1d]/90 border border-cyan-500/30 p-5 sm:p-7 text-white text-left space-y-5 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl relative ${className}`}
    >
      {/* Header Eyebrow & Subtitle */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>HELP US BUILD MORE OPPORTUNITIES</span>
        </div>
        <h3 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
          Support Zenemoo
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Your support helps Zenemoo build technology, infrastructure, contributor resources and new opportunities.
        </p>
      </div>

      <form onSubmit={handleSupportSubmit} className="space-y-5">
        {/* 1. Choose Amount Presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Choose an amount
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {PRESET_AMOUNTS.map((amt) => {
              const isSelected = selectedPreset === amt && !customAmount;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handlePresetSelect(amt)}
                  className={`py-3 px-3.5 rounded-2xl text-center font-bold text-sm sm:text-base font-display transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-gradient-to-b from-cyan-500/25 to-blue-600/25 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/80 scale-[1.02]'
                      : 'bg-white/[0.04] border-white/10 hover:border-cyan-400/40 hover:bg-white/[0.08] text-slate-200'
                  }`}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Custom Amount Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span>Or enter custom amount</span>
            <span className="text-[10px] text-slate-400 font-mono">Min ₹10 &bull; Max ₹5,00,000</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold text-base">
              ₹
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={customAmount}
              onChange={handleCustomAmountChange}
              placeholder="Enter custom amount (e.g. 1500)"
              className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/15 focus:border-cyan-400 focus:bg-white/[0.07] text-white text-sm placeholder-slate-500 transition-all outline-none font-medium"
            />
          </div>
        </div>

        {/* 3. Optional Supporter Info (for official email receipt) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Your Name (optional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Name or Supporter"
              maxLength={50}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-cyan-400/60 text-white text-xs placeholder-slate-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Your Email (for receipt)
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="name@example.com"
              maxLength={80}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-cyan-400/60 text-white text-xs placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>{errorMessage}</p>
              {needsCredentialsNotice && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSimulateSandboxSuccess}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[11px] font-mono cursor-pointer transition-all"
                  >
                    Simulate Sandbox Success Preview
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Action Button */}
        <div className="space-y-3 pt-1">
          <button
            type="submit"
            disabled={paymentState === 'processing' || paymentState === 'checkout'}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-500 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-extrabold text-sm sm:text-base font-display shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {paymentState === 'processing' || paymentState === 'checkout' ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                <span>Preparing Secure Payment...</span>
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 fill-slate-950 text-slate-950 group-hover:scale-110 transition-transform" />
                <span>
                  Support Zenemoo
                  {effectiveAmount > 0 && ` &bull; ₹${effectiveAmount.toLocaleString('en-IN')}`}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {/* 5. Security & Trust Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                Secure payment powered by{' '}
                <span className="text-white font-semibold">Cashfree</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>256-Bit SSL Encrypted</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
