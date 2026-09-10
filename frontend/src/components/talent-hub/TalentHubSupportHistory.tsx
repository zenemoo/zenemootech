import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Receipt,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Calendar,
  IndianRupee,
  X,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';
import { api, supportApi } from '../../services/api';
import { downloadPaymentReceiptPdf, PaymentReceiptData } from '../../services/receiptService';
import { SupportContributionSection } from '../SupportContributionSection';

interface ContributionItem {
  id?: string;
  orderId: string;
  receiptNo: string;
  paymentId?: string | null;
  amount: number;
  currency: string;
  purpose: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  paymentMethod?: string;
  paymentTime?: string;
  createdAt?: string;
}

interface TalentHubSupportHistoryProps {
  onNavigateBack: () => void;
  onOpenSupportModal?: () => void;
}

export const TalentHubSupportHistory: React.FC<TalentHubSupportHistoryProps> = ({
  onNavigateBack,
  onOpenSupportModal,
}) => {
  const { user, talentProfile } = useTalentHubAuth();

  const [contributions, setContributions] = useState<ContributionItem[]>([]);
  const [totalSupported, setTotalSupported] = useState<number>(0);
  const [successfulCount, setSuccessfulCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);

  const fullName =
    talentProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Zenemoo Member';

  const userEmail = user?.email || '';
  const userPhone = talentProfile?.phone || (user as any)?.phone || '';

  const fetchContributions = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await supportApi.getMyContributions(userEmail, isManualRefresh);
      const data = res?.data || res;

      if (data?.success) {
        setContributions(data.contributions || []);
        setTotalSupported(data.totalSupported || 0);
        setSuccessfulCount(data.successfulCount || 0);
        setTotalCount(data.totalCount || (data.contributions?.length || 0));
      } else {
        throw new Error(data?.message || 'Failed to load support payment history.');
      }
    } catch (err: any) {
      console.error('Failed to load contributions:', err);
      setError(err?.response?.data?.message || err?.message || 'Unable to load your payment history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, [user?.id, user?.email]);

  const handleDownloadReceipt = async (item: ContributionItem) => {
    if (downloadingId) return;
    setDownloadingId(item.orderId);

    try {
      // First try fetching authoritative receipt details from backend
      let receiptData: PaymentReceiptData;
      try {
        const res = await supportApi.getMemberReceipt(item.orderId, userEmail);
        const data = res?.data || res;
        if (data?.success && data?.receipt) {
          const r = data.receipt;
          receiptData = {
            receiptNo: r.receiptNo || item.receiptNo,
            paymentDate: r.paymentDate || item.paymentTime || item.createdAt || new Date(),
            orderId: r.orderId || item.orderId,
            paymentId: r.paymentId || item.paymentId,
            transactionId: r.transactionId || item.paymentId,
            customerName: r.customerName || item.customerName || fullName,
            customerEmail: r.customerEmail || item.customerEmail || userEmail,
            customerPhone: r.customerPhone || item.customerPhone || userPhone,
            purpose: r.purpose || item.purpose || 'Support Zenemoo — Platform & Technology',
            paymentType: 'Support Payment',
            gateway: 'Cashfree Payments',
            paymentMethod: r.paymentMethod || item.paymentMethod || 'Online / UPI',
            amount: r.amount || item.amount,
            currency: r.currency || item.currency || 'INR',
            status: r.status || item.status || 'PAID',
          };
        } else {
          throw new Error('Fallback to local contribution data');
        }
      } catch (_) {
        // Fallback to local item data
        receiptData = {
          receiptNo: item.receiptNo,
          paymentDate: item.paymentTime || item.createdAt || new Date(),
          orderId: item.orderId,
          paymentId: item.paymentId,
          transactionId: item.paymentId,
          customerName: item.customerName || fullName,
          customerEmail: item.customerEmail || userEmail,
          customerPhone: item.customerPhone || userPhone,
          purpose: item.purpose || 'Support Zenemoo — Platform & Technology',
          paymentType: 'Support Payment',
          gateway: 'Cashfree Payments',
          paymentMethod: item.paymentMethod || 'Online / UPI',
          amount: item.amount,
          currency: item.currency || 'INR',
          status: item.status || 'PAID',
        };
      }

      await downloadPaymentReceiptPdf(receiptData);
    } catch (downloadErr: any) {
      console.error('Receipt download error:', downloadErr);
      alert('Could not download receipt. Please try again or contact support@zenemoo.in.');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'SUCCESS' || s === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Successful</span>
        </span>
      );
    }
    if (s === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-semibold">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          <span>Pending</span>
        </span>
      );
    }
    if (s === 'CANCELLED' || s === 'USER_DROPPED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-400 font-mono text-xs font-semibold">
          <XCircle className="w-3.5 h-3.5" />
          <span>Cancelled</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-xs font-semibold">
        <XCircle className="w-3.5 h-3.5" />
        <span>Failed</span>
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 w-full max-w-full min-w-0 overflow-hidden">
      {/* ── 1. Top Header Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1020] via-[#080d19] to-[#05070e] border border-cyan-500/20 p-6 sm:p-8 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-mono font-bold uppercase tracking-wider shadow-sm">
                <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/30" />
                <span>MEMBER SUPPORT HISTORY</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Verified Account: {userEmail}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
              My Support Payments
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-2xl">
              View your voluntary Support Zenemoo payment history, transaction references, and download official A4 receipts.
            </p>
          </div>

          {/* Header Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => fetchContributions(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-medium transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Refresh payment records"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              onClick={() => setIsSupportModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-mono text-xs font-bold shadow-lg shadow-pink-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Heart className="w-3.5 h-3.5 fill-white" />
              <span>Support Zenemoo</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Stat Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Supported */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Total Amount Supported
            </span>
            <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-display text-white">
              {loading ? (
                <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
              ) : (
                `₹${totalSupported.toLocaleString('en-IN')}`
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Cumulative voluntary contribution
            </p>
          </div>
        </div>

        {/* Successful Payments */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Successful Payments
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-display text-emerald-300">
              {loading ? (
                <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
              ) : (
                successfulCount
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Verified Cashfree transactions
            </p>
          </div>
        </div>

        {/* Total Records */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Total Support Initiations
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-display text-cyan-300">
              {loading ? (
                <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
              ) : (
                totalCount
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              All payment attempts
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Payment History Section ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display">
              Payment Records &amp; Receipts
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Official receipts are available for instant PDF download for all verified successful payments.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted &amp; Verified</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3 py-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 bg-white/10 rounded" />
                  <div className="h-3 w-32 bg-white/5 rounded" />
                </div>
                <div className="h-9 w-28 bg-white/10 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-sm text-rose-200 font-medium">{error}</p>
            <button
              onClick={() => fetchContributions(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && contributions.length === 0 && (
          <div className="py-12 px-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto shadow-inner">
              <Heart className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-white font-display">
                No Support Payments Yet
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your Support payment history will appear here after your first successful contribution.
              </p>
            </div>
            <button
              onClick={() => setIsSupportModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Heart className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>Support Zenemoo</span>
            </button>
          </div>
        )}

        {/* Payment History List (Responsive Table / Card Layout) */}
        {!loading && !error && contributions.length > 0 && (
          <div className="space-y-3">
            {contributions.map((item) => {
              const isSuccess = (item.status || '').toUpperCase() === 'SUCCESS' || (item.status || '').toUpperCase() === 'PAID';
              const isDownloading = downloadingId === item.orderId;
              const formattedDate = new Date(item.paymentTime || item.createdAt || Date.now()).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={item.orderId || item.id}
                  className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 hover:border-cyan-500/30 transition-all space-y-4 shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Amount & Purpose */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-xl sm:text-2xl font-black font-display text-white">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </span>
                        {getStatusBadge(item.status)}
                        {item.paymentMethod && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                            <CreditCard className="w-3 h-3 text-slate-400" />
                            <span>{item.paymentMethod}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-slate-200 truncate">
                        {item.purpose || 'Support Zenemoo — Platform & Technology'}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-cyan-400" />
                          <span>{formattedDate}</span>
                        </span>
                        <span className="text-slate-500">•</span>
                        <span>Order: <strong className="text-slate-300 select-all">{item.orderId}</strong></span>
                        {item.receiptNo && (
                          <>
                            <span className="text-slate-500">•</span>
                            <span className="text-cyan-300">Receipt: <strong className="select-all">{item.receiptNo}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                      {isSuccess ? (
                        <button
                          onClick={() => handleDownloadReceipt(item)}
                          disabled={isDownloading}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <Download className={`w-3.5 h-3.5 text-slate-950 ${isDownloading ? 'animate-bounce' : ''}`} />
                          <span>{isDownloading ? 'Generating PDF...' : 'Download Receipt'}</span>
                        </button>
                      ) : (
                        <span className="text-xs font-mono text-slate-500 italic">
                          Receipt available upon verification
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. Bottom Return Navigation ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#080d19] via-[#0d152a] to-[#080d19] border border-white/10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="space-y-1">
          <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
            Zenemoo Community
          </p>
          <p className="text-base sm:text-lg font-bold text-white font-display">
            Thank you for being an active contributor and supporter.
          </p>
        </div>

        <button
          onClick={onNavigateBack}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-mono font-semibold transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Back to Support Page</span>
        </button>
      </div>

      {/* ── 5. Modal for Support Payment ── */}
      <AnimatePresence>
        {isSupportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl bg-[#080e1d] border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
            >
              <div className="overflow-y-auto flex-1">
                <SupportContributionSection
                  initialCustomerName={fullName}
                  initialCustomerEmail={userEmail}
                  initialCustomerPhone={userPhone}
                  onClose={() => setIsSupportModalOpen(false)}
                  onSuccess={() => {
                    fetchContributions(true);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
