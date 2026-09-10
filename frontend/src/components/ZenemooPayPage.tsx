import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ArrowRight,
  User,
  Mail,
  Phone,
  Building2,
  RefreshCw,
  Copy,
  Check,
  Heart,
  FileText,
  CreditCard,
  Sparkles,
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

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans relative selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-between overflow-x-hidden">
      <SeoMeta
        title={linkData ? `Pay ₹${Number(linkData.amount).toLocaleString('en-IN')} — ${linkData.purpose} | Zenemoo` : 'Secure Payment | Zenemoo'}
        description="Complete your secure payment with Zenemoo Data Solutions via Cashfree Payment Gateway. Instant confirmation and verified receipts."
        robots="noindex, nofollow"
      />

      {/* Ambient Cybernetic Neon Glow Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0e1e3810_1px,transparent_1px),linear-gradient(to_bottom,#0e1e3810_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-60" />
      </div>

      {/* Top Navbar Header */}
      <header className="relative z-10 border-b border-white/10 bg-[#070b14]/80 backdrop-blur-xl py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a
            href="/"
            onClick={(e) => {
              if (onBackToHome) {
                e.preventDefault();
                onBackToHome();
              }
            }}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="Zenemoo" className="w-full h-full object-contain rounded-lg" onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }} />
            </div>
            <div>
              <span className="font-display font-extrabold text-white text-base tracking-tight group-hover:text-cyan-400 transition-colors">
                ZENEMOO
              </span>
              <span className="text-[10px] text-cyan-400 font-mono block -mt-1 tracking-wider uppercase font-semibold">
                Secure Pay
              </span>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
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
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1 transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Payment Container */}
      <main className="relative z-10 max-w-xl mx-auto w-full px-4 py-8 sm:py-12 flex-1 flex flex-col justify-center">
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
          <div className="glass-panel p-8 rounded-3xl border border-white/10 bg-[#070b14]/90 backdrop-blur-2xl shadow-2xl space-y-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto animate-pulse">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white font-display">Loading Secure Payment Link...</h2>
              <p className="text-xs text-slate-400 font-mono">Verifying details with Zenemoo Payment Server.</p>
            </div>
            <div className="space-y-3 pt-4">
              <div className="h-4 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
              <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
            </div>
          </div>
        ) : errorStatus || !linkData ? (
          /* ERROR / EXPIRED / INVALID LINK STATE */
          <div className="glass-panel p-8 rounded-3xl border border-white/10 bg-[#070b14]/90 backdrop-blur-2xl shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/20">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white font-display">
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
          /* GENERIC PAYMENT CARD VIEW */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl border border-white/10 bg-[#070b14]/90 backdrop-blur-2xl shadow-2xl overflow-hidden"
          >
            {/* CARD TOP BANNER */}
            <div className="p-6 sm:p-7 border-b border-white/10 bg-gradient-to-b from-cyan-500/[0.08] to-transparent space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-semibold">
                  <Lock className="w-3 h-3 text-cyan-400" />
                  <span>Verified Payment Link</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                  <span className="text-slate-500">ID:</span>
                  <span className="text-slate-300 font-bold">{linkData.link_id}</span>
                </div>
              </div>

              {/* Purpose & Amount */}
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight leading-snug">
                  {linkData.purpose}
                </h1>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 font-display">
                    ₹{Number(linkData.amount).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-mono uppercase text-cyan-300 font-bold tracking-wider">
                    {linkData.currency || 'INR'}
                  </span>
                </div>
              </div>

              {/* Expiry Pill */}
              {linkData.link_expiry_time && (
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300/80">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Valid until{' '}
                    {new Date(linkData.link_expiry_time).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* FORM BODY */}
            <form onSubmit={handlePay} className="p-6 sm:p-7 space-y-5 font-mono text-xs">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Customer Info Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                    Payer Information
                  </label>
                  <span className="text-[10px] text-slate-500">Receipt will be emailed here</span>
                </div>

                <div className="space-y-2.5">
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
                    />
                  </div>

                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email ID (for instant receipt)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                      placeholder="Phone Number (+91)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Payment Amount</span>
                  <span className="text-white font-bold">₹{Number(linkData.amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Gateway & Platform Fee</span>
                  <span className="text-emerald-400 font-medium">₹0 (Waived)</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm">
                  <span className="font-bold text-white">Total Payable</span>
                  <span className="font-extrabold text-cyan-300 font-display text-base">
                    ₹{Number(linkData.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Supported Payment Methods Pill */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Supported Methods:</span>
                <span className="text-slate-300 font-semibold">UPI, Cards, NetBanking, Wallets</span>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-400 select-none pt-1">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="leading-tight">
                  I agree to Zenemoo's support and payment terms. I understand this contribution directly supports Zenemoo's technological operations.
                </span>
              </label>

              {/* PAY CTA BUTTON */}
              <button
                type="submit"
                disabled={paymentState === 'processing' || !agreedToTerms}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:via-sky-400 hover:to-blue-500 text-white font-bold font-mono text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paymentState === 'processing' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Connecting Cashfree PG...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Proceed to Secure Pay (₹{Number(linkData.amount).toLocaleString('en-IN')})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Trust Footer */}
              <div className="pt-2 text-center text-[10px] text-slate-500 space-y-1">
                <p>Secured by Cashfree Payments India Private Limited &bull; PCI-DSS Level 1 Compliant</p>
                <p>Zenemoo Data Solutions &bull; UDYAM-OD-11-0124893</p>
              </div>
            </form>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#070b14]/70 py-4 px-6 text-center text-xs font-mono text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Zenemoo Data Solutions. All rights reserved.</span>
          <div className="flex items-center gap-4 text-slate-400">
            <a href="/privacy" className="hover:text-cyan-400 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-cyan-400 transition-colors">Terms</a>
            <a href="mailto:support@zenemoo.in" className="hover:text-cyan-400 transition-colors">support@zenemoo.in</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
