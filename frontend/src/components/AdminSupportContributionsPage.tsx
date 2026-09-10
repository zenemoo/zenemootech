import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  X,
  Eye,
  ArrowUpDown,
  Sparkles,
  DollarSign,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Tag,
  Hash,
  FileSpreadsheet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supportApi } from '../services/api';
import { ExportButton } from './ExportButton';

export interface SupportContributionRecord {
  id: string;
  order_id: string;
  cf_order_id?: string;
  payment_id?: string;
  user_id?: string | null;
  amount: number;
  currency: string;
  provider: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  purpose: string;
  source?: string;
  payment_method: string;
  payment_time: string;
  created_at: string;
  updated_at: string;
}

export interface DateCollectionGroup {
  date: string;
  formattedDate: string;
  count: number;
  amount: number;
}

export interface ContributionSummary {
  totalCollected: number;
  successfulCount: number;
  thisMonthCollected: number;
  thisMonthCount: number;
  averageSupport: number;
  currentMonthLabel: string;
  statusCounts: {
    SUCCESS: number;
    PENDING: number;
    FAILED: number;
    CANCELLED: number;
  };
  statusAmounts: {
    SUCCESS: number;
    PENDING: number;
    FAILED: number;
    CANCELLED: number;
  };
}

interface AdminSupportContributionsPageProps {
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Client-side cache singleton to prevent refetching on component re-render or tab switching
interface CachedContributions {
  payments: SupportContributionRecord[];
  summary: ContributionSummary | null;
  collectionByDate: DateCollectionGroup[];
  timestamp: number;
  lastUpdatedStr: string;
}

let globalContributionsCache: CachedContributions | null = null;
let activeFetchPromise: Promise<any> | null = null;

export const AdminSupportContributionsPage: React.FC<AdminSupportContributionsPageProps> = ({
  showToast,
}) => {
  // --- Data State ---
  const [payments, setPayments] = useState<SupportContributionRecord[]>(() => globalContributionsCache?.payments || []);
  const [summary, setSummary] = useState<ContributionSummary | null>(() => globalContributionsCache?.summary || null);
  const [collectionByDate, setCollectionByDate] = useState<DateCollectionGroup[]>(() => globalContributionsCache?.collectionByDate || []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !globalContributionsCache);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedStr, setLastUpdatedStr] = useState<string>(() => globalContributionsCache?.lastUpdatedStr || '');

  const isMountedRef = React.useRef<boolean>(true);

  // --- View Mode: 'detailed' vs 'byDate' ---
  const [viewMode, setViewMode] = useState<'detailed' | 'byDate'>('detailed');

  // --- Chart Time Range: 7d, 30d, 90d, 1y ---
  const [chartRange, setChartRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // --- Search & Filter State ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [amountFilter, setAmountFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [expandedDateRow, setExpandedDateRow] = useState<string | null>(null);

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // --- Detail Drawer State ---
  const [selectedPayment, setSelectedPayment] = useState<SupportContributionRecord | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // --- Fetch Data with Zero-Egress Caching & In-Flight Deduplication ---
  const fetchData = useCallback(async (isManualRefresh = false) => {
    const CACHE_LIFETIME_MS = 2 * 60 * 1000; // 2 minutes client cache
    
    // 1. If not a manual refresh and fresh cache exists, use it instantly (0 Supabase egress)
    if (!isManualRefresh && globalContributionsCache && (Date.now() - globalContributionsCache.timestamp < CACHE_LIFETIME_MS)) {
      setPayments(globalContributionsCache.payments);
      setSummary(globalContributionsCache.summary);
      setCollectionByDate(globalContributionsCache.collectionByDate);
      setLastUpdatedStr(globalContributionsCache.lastUpdatedStr);
      setIsLoading(false);
      return;
    }

    // 2. In-flight request deduplication
    if (activeFetchPromise && !isManualRefresh) {
      try {
        await activeFetchPromise;
      } catch (_) {}
      return;
    }

    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);

    const fetchTask = (async () => {
      try {
        const res = await supportApi.getContributions(isManualRefresh);
        const data = res?.data || res;

        if (data?.success) {
          const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          const newCache: CachedContributions = {
            payments: data.payments || [],
            summary: data.summary || null,
            collectionByDate: data.collectionByDate || [],
            timestamp: Date.now(),
            lastUpdatedStr: nowStr,
          };
          globalContributionsCache = newCache;

          if (isMountedRef.current) {
            setPayments(newCache.payments);
            setSummary(newCache.summary);
            setCollectionByDate(newCache.collectionByDate);
            setLastUpdatedStr(nowStr);
            if (isManualRefresh && showToast) {
              showToast('Support contributions updated successfully.', 'success');
            }
          }
        } else {
          throw new Error(data?.message || 'Failed to retrieve support payments.');
        }
      } catch (err: any) {
        console.error('Failed to load support contributions:', err);
        if (isMountedRef.current) {
          setErrorMessage(err?.response?.data?.message || err?.message || 'Unable to load support contributions. Please try again.');
          if (showToast) {
            showToast('Unable to load support contributions.', 'error');
          }
        }
      } finally {
        activeFetchPromise = null;
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    })();

    activeFetchPromise = fetchTask;
    await fetchTask;
  }, [showToast]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  // Copy to clipboard helper
  const handleCopy = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
    if (showToast) showToast(`Copied ${fieldKey} to clipboard`, 'info');
  };

  // --- Filter Logic ---
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (payment.customer_name || '').toLowerCase().includes(q);
        const matchesEmail = (payment.customer_email || '').toLowerCase().includes(q);
        const matchesOrderId = (payment.order_id || '').toLowerCase().includes(q);
        const matchesPaymentId = (payment.payment_id || '').toLowerCase().includes(q);
        const matchesPurpose = (payment.purpose || '').toLowerCase().includes(q);
        const matchesAmount = String(payment.amount).includes(q);

        if (!matchesName && !matchesEmail && !matchesOrderId && !matchesPaymentId && !matchesPurpose && !matchesAmount) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL') {
        if (payment.status !== statusFilter) return false;
      }

      // 3. Method Filter
      if (methodFilter !== 'ALL') {
        const pMethod = (payment.payment_method || '').toLowerCase();
        if (methodFilter === 'UPI' && !pMethod.includes('upi')) return false;
        if (methodFilter === 'CARD' && !pMethod.includes('card')) return false;
        if (methodFilter === 'NETBANKING' && !pMethod.includes('net') && !pMethod.includes('bank')) return false;
        if (methodFilter === 'WALLET' && !pMethod.includes('wallet')) return false;
      }

      // 4. Amount Range
      if (amountFilter !== 'ALL') {
        const amt = payment.amount;
        if (amountFilter === 'UNDER_500' && amt >= 500) return false;
        if (amountFilter === '500_1000' && (amt < 500 || amt > 1000)) return false;
        if (amountFilter === '1000_2500' && (amt < 1000 || amt > 2500)) return false;
        if (amountFilter === '2500_5000' && (amt < 2500 || amt > 5000)) return false;
        if (amountFilter === 'ABOVE_5000' && amt <= 5000) return false;
      }

      // 5. Date Range Filter
      if (dateRangeFilter !== 'ALL') {
        const pDate = new Date(payment.payment_time || payment.created_at);
        const now = new Date();

        if (dateRangeFilter === 'TODAY') {
          const isToday = pDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (dateRangeFilter === 'YESTERDAY') {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          if (pDate.toDateString() !== yesterday.toDateString()) return false;
        } else if (dateRangeFilter === 'LAST_7_DAYS') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (pDate < sevenDaysAgo) return false;
        } else if (dateRangeFilter === 'LAST_30_DAYS') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          if (pDate < thirtyDaysAgo) return false;
        } else if (dateRangeFilter === 'THIS_MONTH') {
          if (pDate.getMonth() !== now.getMonth() || pDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateRangeFilter === 'LAST_MONTH') {
          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          if (pDate.getMonth() !== lastMonth || pDate.getFullYear() !== lastMonthYear) return false;
        } else if (dateRangeFilter === 'CUSTOM') {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (pDate < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (pDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [payments, searchQuery, statusFilter, methodFilter, amountFilter, dateRangeFilter, customStartDate, customEndDate]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, methodFilter, amountFilter, dateRangeFilter, customStartDate, customEndDate]);

  // Pagination calculation
  const totalRecords = filteredPayments.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayments, currentPage, itemsPerPage]);

  // Date-wise Grouping of filtered records
  const groupedByDateFiltered = useMemo(() => {
    const map = new Map<string, { date: string; formattedDate: string; rawDate: Date; count: number; amount: number; payments: SupportContributionRecord[] }>();
    
    filteredPayments.forEach((p) => {
      if (p.status === 'SUCCESS') {
        const pDate = new Date(p.payment_time || p.created_at);
        const dateKey = pDate.toISOString().split('T')[0];
        if (!map.has(dateKey)) {
          map.set(dateKey, {
            date: dateKey,
            rawDate: pDate,
            formattedDate: pDate.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
            count: 0,
            amount: 0,
            payments: [],
          });
        }
        const grp = map.get(dateKey)!;
        grp.count += 1;
        grp.amount += p.amount;
        grp.payments.push(p);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  }, [filteredPayments]);

  // --- Chart Data Computation ---
  const chartPoints = useMemo(() => {
    const now = new Date();
    let days = 30;
    if (chartRange === '7d') days = 7;
    if (chartRange === '30d') days = 30;
    if (chartRange === '90d') days = 90;
    if (chartRange === '1y') days = 365;

    // Group successful payments by date key
    const dailySums: Record<string, number> = {};
    payments.forEach((p) => {
      if (p.status === 'SUCCESS') {
        const d = new Date(p.payment_time || p.created_at);
        const key = d.toISOString().split('T')[0];
        dailySums[key] = (dailySums[key] || 0) + p.amount;
      }
    });

    const points: { label: string; dateStr: string; amount: number }[] = [];
    const step = days > 90 ? 7 : 1; // Sample weekly for 1y to keep svg clean

    for (let i = days - 1; i >= 0; i -= step) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const amt = dailySums[key] || 0;
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      points.push({ label, dateStr: key, amount: amt });
    }

    const maxAmt = Math.max(...points.map((pt) => pt.amount), 1000);
    return { points, maxAmt };
  }, [payments, chartRange]);

  // Status Badge Component
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Successful
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-semibold">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[11px] font-semibold">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[11px] font-semibold">
            {status}
          </span>
        );
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    methodFilter !== 'ALL' ||
    amountFilter !== 'ALL' ||
    dateRangeFilter !== 'ALL';

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setMethodFilter('ALL');
    setAmountFilter('ALL');
    setDateRangeFilter('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. PAGE HEADER */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#070b14]/90 via-[#0a0f1d]/80 to-[#070b14]/90 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white font-display tracking-tight flex items-center gap-2">
                Support Contributions
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Payment Collections
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Track and manage all support payments received through Zenemoo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Subtle Cache / Last Updated Indicator */}
          {lastUpdatedStr && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Updated {lastUpdatedStr}</span>
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing || isLoading}
            className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-medium flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Export Button -> Enterprise Modal */}
          <ExportButton
            sectionId="support-contributions"
            sectionName="Support Contributions"
            dataset={payments}
            filteredDataset={filteredPayments}
            showToast={showToast}
            label="Export Data"
          />
        </div>
      </div>

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between gap-3 text-rose-300 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchData(true)}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-xs font-mono cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. TOP COLLECTION SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL COLLECTED */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#070b14]/70 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
            <span>Total Collected</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-display tracking-tight">
            {isLoading ? (
              <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
            ) : (
              `₹${(summary?.totalCollected || 0).toLocaleString('en-IN')}`
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-2 font-mono">
            <TrendingUp className="w-3 h-3" />
            <span>100% Verified Successful</span>
          </div>
        </div>

        {/* SUCCESSFUL PAYMENTS */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#070b14]/70 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
            <span>Successful</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-display tracking-tight">
            {isLoading ? (
              <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
            ) : (
              (summary?.successfulCount || 0).toLocaleString('en-IN')
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            Payments processed
          </div>
        </div>

        {/* THIS MONTH */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#070b14]/70 relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
            <span>This Month</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-display tracking-tight">
            {isLoading ? (
              <div className="h-8 w-28 bg-white/10 rounded animate-pulse" />
            ) : (
              `₹${(summary?.thisMonthCollected || 0).toLocaleString('en-IN')}`
            )}
          </div>
          <div className="text-[11px] text-purple-300/80 mt-2 font-mono truncate">
            {summary?.currentMonthLabel || 'Current Month'} ({summary?.thisMonthCount || 0} payments)
          </div>
        </div>

        {/* AVERAGE SUPPORT */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#070b14]/70 relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
            <span>Average Support</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-display tracking-tight">
            {isLoading ? (
              <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
            ) : (
              `₹${(summary?.averageSupport || 0).toLocaleString('en-IN')}`
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            Per verified contribution
          </div>
        </div>
      </div>

      {/* 3. PAYMENT STATUS OVERVIEW PILLS */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-[#060911]/60 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Status Filter Breakdown:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* ALL */}
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer border ${
              statusFilter === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'bg-white/[0.02] text-slate-400 border-white/10 hover:bg-white/[0.05] hover:text-white'
            }`}
          >
            All <span className="ml-1 opacity-70">({payments.length})</span>
          </button>

          {/* SUCCESS */}
          <button
            type="button"
            onClick={() => setStatusFilter('SUCCESS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer border ${
              statusFilter === 'SUCCESS'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-emerald-500/5 text-emerald-400/80 border-emerald-500/20 hover:bg-emerald-500/10'
            }`}
          >
            ✓ Successful <span className="ml-1 font-bold">({summary?.statusCounts?.SUCCESS || 0})</span>
          </button>

          {/* PENDING */}
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer border ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                : 'bg-amber-500/5 text-amber-400/80 border-amber-500/20 hover:bg-amber-500/10'
            }`}
          >
            ◷ Pending <span className="ml-1 font-bold">({summary?.statusCounts?.PENDING || 0})</span>
          </button>

          {/* FAILED */}
          <button
            type="button"
            onClick={() => setStatusFilter('FAILED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer border ${
              statusFilter === 'FAILED'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20'
                : 'bg-rose-500/5 text-rose-400/80 border-rose-500/20 hover:bg-rose-500/10'
            }`}
          >
            ! Failed <span className="ml-1 font-bold">({summary?.statusCounts?.FAILED || 0})</span>
          </button>

          {/* CANCELLED */}
          <button
            type="button"
            onClick={() => setStatusFilter('CANCELLED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer border ${
              statusFilter === 'CANCELLED'
                ? 'bg-slate-500/20 text-slate-300 border-slate-500/40 shadow-sm shadow-slate-500/20'
                : 'bg-slate-500/5 text-slate-400 border-slate-500/20 hover:bg-slate-500/10'
            }`}
          >
            × Cancelled <span className="ml-1 font-bold">({summary?.statusCounts?.CANCELLED || 0})</span>
          </button>
        </div>
      </div>

      {/* 4. COLLECTION OVERVIEW CHART */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#070b14]/70 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Collection Overview
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Total successful support collections over time
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/10">
            {(['7d', '30d', '90d', '1y'] as const).map((rng) => (
              <button
                key={rng}
                type="button"
                onClick={() => setChartRange(rng)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer ${
                  chartRange === rng
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {rng === '7d' ? 'Last 7 Days' : rng === '30d' ? '30 Days' : rng === '90d' ? '3 Months' : '1 Year'}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Chart */}
        <div className="h-44 w-full relative pt-4 pb-2">
          {isLoading ? (
            <div className="h-full w-full bg-white/5 rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-500 font-mono">
              Generating collection trend...
            </div>
          ) : chartPoints.points.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-slate-500 font-mono">
              No collection activity recorded in this period.
            </div>
          ) : (
            <div className="h-full w-full flex flex-col justify-between">
              {/* Bars rendering */}
              <div className="h-32 w-full flex items-end gap-1.5 sm:gap-2 px-2">
                {chartPoints.points.map((pt, idx) => {
                  const heightPercent = chartPoints.maxAmt > 0 ? Math.max((pt.amount / chartPoints.maxAmt) * 100, 4) : 4;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0f172a] text-white text-[10px] font-mono px-2 py-1 rounded-lg border border-cyan-500/30 whitespace-nowrap shadow-xl z-20 pointer-events-none">
                        <div>{pt.label}</div>
                        <div className="text-cyan-300 font-bold">₹{pt.amount.toLocaleString('en-IN')}</div>
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          pt.amount > 0
                            ? 'bg-gradient-to-t from-cyan-600/40 via-cyan-400/80 to-cyan-300 shadow-sm shadow-cyan-500/30 group-hover:from-cyan-500 group-hover:to-cyan-200'
                            : 'bg-white/[0.04] group-hover:bg-white/[0.08]'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X Axis Labels */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-2 pt-2 border-t border-white/5">
                <span>{chartPoints.points[0]?.label || ''}</span>
                <span>
                  {chartPoints.points[Math.floor(chartPoints.points.length / 2)]?.label || ''}
                </span>
                <span>{chartPoints.points[chartPoints.points.length - 1]?.label || ''}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. SEARCH & FILTER CONTROLS */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-[#070b14]/80 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search supporter, email, payment ID, order ID, amount..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Switcher (Detailed vs By Date) */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'detailed'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Detailed View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('byDate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'byDate'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>By Date Summary</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Date Range Dropdown */}
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Date Range
            </label>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL" className="bg-[#090d16] text-white">All Time</option>
              <option value="TODAY" className="bg-[#090d16] text-white">Today</option>
              <option value="YESTERDAY" className="bg-[#090d16] text-white">Yesterday</option>
              <option value="LAST_7_DAYS" className="bg-[#090d16] text-white">Last 7 Days</option>
              <option value="LAST_30_DAYS" className="bg-[#090d16] text-white">Last 30 Days</option>
              <option value="THIS_MONTH" className="bg-[#090d16] text-white">This Month</option>
              <option value="LAST_MONTH" className="bg-[#090d16] text-white">Last Month</option>
              <option value="CUSTOM" className="bg-[#090d16] text-white">Custom Range</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL" className="bg-[#090d16] text-white">All Statuses</option>
              <option value="SUCCESS" className="bg-[#090d16] text-emerald-300">Successful</option>
              <option value="PENDING" className="bg-[#090d16] text-amber-300">Pending</option>
              <option value="FAILED" className="bg-[#090d16] text-rose-300">Failed</option>
              <option value="CANCELLED" className="bg-[#090d16] text-slate-300">Cancelled</option>
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Payment Method
            </label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL" className="bg-[#090d16] text-white">All Methods</option>
              <option value="UPI" className="bg-[#090d16] text-white">UPI</option>
              <option value="CARD" className="bg-[#090d16] text-white">Card (Debit/Credit)</option>
              <option value="NETBANKING" className="bg-[#090d16] text-white">Net Banking</option>
              <option value="WALLET" className="bg-[#090d16] text-white">Wallet</option>
            </select>
          </div>

          {/* Amount Filter Dropdown */}
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Amount
            </label>
            <select
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL" className="bg-[#090d16] text-white">All Amounts</option>
              <option value="UNDER_500" className="bg-[#090d16] text-white">Under ₹500</option>
              <option value="500_1000" className="bg-[#090d16] text-white">₹500 – ₹1,000</option>
              <option value="1000_2500" className="bg-[#090d16] text-white">₹1,000 – ₹2,500</option>
              <option value="2500_5000" className="bg-[#090d16] text-white">₹2,500 – ₹5,000</option>
              <option value="ABOVE_5000" className="bg-[#090d16] text-white">Above ₹5,000</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs if selected */}
        {dateRangeFilter === 'CUSTOM' && (
          <div className="flex items-center gap-3 pt-2 bg-white/[0.02] p-3 rounded-xl border border-white/5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        )}

        {/* Active Filters Clear Indicator */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
            <span>
              Found <strong className="text-cyan-300">{filteredPayments.length}</strong> matching payments
            </span>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer font-mono"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* 6. MAIN CONTENT AREA */}
      {viewMode === 'detailed' ? (
        /* DETAILED TABLE VIEW */
        <div className="glass-panel rounded-3xl border border-white/10 bg-[#070b14]/70 overflow-hidden shadow-2xl">
          {isLoading ? (
            /* Skeleton Loading State */
            <div className="p-6 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : paginatedPayments.length === 0 ? (
            /* Empty State */
            <div className="py-16 px-6 text-center space-y-3 font-mono">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-500 mx-auto">
                <CreditCard className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">No Support Contributions Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No payments match the selected search or filter criteria. Try adjusting your filters.'
                  : 'Payments received through Support Zenemoo will appear here in real-time.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold hover:bg-cyan-500/30 transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            /* Payment Data Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                    <th className="py-3.5 px-4 font-semibold">Supporter</th>
                    <th className="py-3.5 px-4 font-semibold">Email</th>
                    <th className="py-3.5 px-4 font-semibold">Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Payment ID</th>
                    <th className="py-3.5 px-4 font-semibold">Order ID</th>
                    <th className="py-3.5 px-4 font-semibold">Method</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedPayments.map((p) => {
                    const dateObj = new Date(p.payment_time || p.created_at);
                    const formattedDate = dateObj.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                    const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr
                        key={p.order_id || p.id}
                        onClick={() => setSelectedPayment(p)}
                        className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      >
                        {/* Date & Time */}
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          <div className="font-semibold text-white">{formattedDate}</div>
                          <div className="text-[10px] text-slate-500">{formattedTime}</div>
                        </td>

                        {/* Supporter */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold text-cyan-300 shrink-0">
                              {(p.customer_name || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-white truncate max-w-[140px]">
                                {p.customer_name || 'Anonymous Supporter'}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {p.purpose && (
                                  <span className="text-[9px] text-cyan-400 truncate max-w-[100px]">
                                    {p.purpose}
                                  </span>
                                )}
                                {(p.source === 'Admin Payment Link' || p.order_id?.startsWith('PL_')) ? (
                                  <span className="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[8px] font-semibold">
                                    🔗 Link
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-500/15 text-slate-400 border border-slate-500/20 text-[8px]">
                                    Web
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap truncate max-w-[160px]">
                          {p.customer_email || '—'}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-extrabold text-sm text-cyan-300 font-display">
                            ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Payment ID */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {p.payment_id ? (
                            <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10 text-[11px]">
                              {p.payment_id}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        {/* Order ID */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-slate-400 font-mono text-[11px] truncate max-w-[120px] block">
                            {p.order_id}
                          </span>
                        </td>

                        {/* Method */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/5 text-[10px] uppercase">
                            {p.payment_method || 'Cashfree'}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusBadge(p.status)}
                        </td>

                        {/* Action View */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPayment(p);
                            }}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer"
                            title="View Payment Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer: Pagination & Record Selector */}
          {!isLoading && paginatedPayments.length > 0 && (
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-3">
                <span>
                  Showing{' '}
                  <strong className="text-white">
                    {(currentPage - 1) * itemsPerPage + 1}–
                    {Math.min(currentPage * itemsPerPage, totalRecords)}
                  </strong>{' '}
                  of <strong className="text-white">{totalRecords}</strong> payments
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-[11px] text-slate-500">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="10" className="bg-[#090d16] text-white">10</option>
                    <option value="20" className="bg-[#090d16] text-white">20</option>
                    <option value="50" className="bg-[#090d16] text-white">50</option>
                    <option value="100" className="bg-[#090d16] text-white">100</option>
                  </select>
                </div>
              </div>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 3 + i + 1;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05] border border-white/5'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* BY DATE SUMMARY VIEW */
        <div className="glass-panel rounded-3xl border border-white/10 bg-[#070b14]/70 overflow-hidden shadow-2xl p-6 space-y-4">
          <div className="border-b border-white/10 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" /> Collection Grouped by Date
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Displays verified successful payments accumulated per day.
              </p>
            </div>
            <div className="text-xs font-mono text-cyan-300">
              {groupedByDateFiltered.length} Active Dates
            </div>
          </div>

          {groupedByDateFiltered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              No successful payment dates recorded under current filters.
            </div>
          ) : (
            <div className="space-y-3 font-mono">
              {groupedByDateFiltered.map((grp) => {
                const isExpanded = expandedDateRow === grp.date;
                return (
                  <div
                    key={grp.date}
                    className="glass-panel rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-cyan-500/30 transition-all"
                  >
                    <div
                      onClick={() => setExpandedDateRow(isExpanded ? null : grp.date)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-500/20">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{grp.formattedDate}</div>
                          <div className="text-[11px] text-slate-400">
                            {grp.count} successful {grp.count === 1 ? 'payment' : 'payments'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-base font-extrabold text-cyan-300 font-display">
                            ₹{grp.amount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-mono">
                            Avg: ₹{Math.round(grp.amount / grp.count).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div className="p-1 rounded-lg bg-white/[0.04] text-slate-400">
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-cyan-400' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expandable Individual Payments in this Date */}
                    {isExpanded && (
                      <div className="border-t border-white/10 bg-black/40 p-4 space-y-2">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-bold">
                          Individual Payments on {grp.formattedDate}
                        </div>
                        <div className="divide-y divide-white/5">
                          {grp.payments.map((p) => (
                            <div
                              key={p.order_id}
                              onClick={() => setSelectedPayment(p)}
                              className="py-2.5 flex items-center justify-between text-xs hover:text-cyan-300 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{p.customer_name}</span>
                                <span className="text-slate-500 text-[11px]">({p.customer_email || 'No email'})</span>
                                {p.purpose && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[9px]">
                                    {p.purpose}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-white">
                                  ₹{p.amount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {p.order_id}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. PAYMENT DETAILS SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPayment(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />

            {/* Slide Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="relative w-full max-w-md bg-[#070b14] border-l border-white/10 h-full overflow-y-auto p-6 z-10 space-y-6 shadow-2xl flex flex-col justify-between font-mono"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-display">Payment Details</h3>
                      <p className="text-[10px] text-slate-400">Cashfree PG Transaction Info</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPayment(null)}
                    className="p-1.5 rounded-xl bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Amount & Status Card */}
                <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 text-center space-y-2">
                  <div className="flex justify-center">{renderStatusBadge(selectedPayment.status)}</div>
                  <div className="text-3xl font-extrabold text-white font-display">
                    ₹{Number(selectedPayment.amount || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-400">
                    Currency: <strong className="text-white">{selectedPayment.currency || 'INR'}</strong>
                  </div>
                </div>

                {/* Supporter Section */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" /> Supporter Information
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Name:</span>
                      <span className="text-white font-semibold">
                        {selectedPayment.customer_name || 'Anonymous Supporter'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-cyan-300">{selectedPayment.customer_email || '—'}</span>
                    </div>
                    {selectedPayment.customer_phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="text-slate-200">{selectedPayment.customer_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Identifiers Section */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-cyan-400" /> Transaction Identifiers
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3 text-xs">
                    {/* Order ID */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span>Order ID:</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedPayment.order_id, 'order_id')}
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === 'order_id' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === 'order_id' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="p-2 rounded-lg bg-black/50 text-white font-mono text-[11px] break-all border border-white/5">
                        {selectedPayment.order_id}
                      </div>
                    </div>

                    {/* Payment ID */}
                    {selectedPayment.payment_id && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>Cashfree Payment ID:</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedPayment.payment_id!, 'payment_id')}
                            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedField === 'payment_id' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedField === 'payment_id' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="p-2 rounded-lg bg-black/50 text-emerald-300 font-mono text-[11px] break-all border border-white/5">
                          {selectedPayment.payment_id}
                        </div>
                      </div>
                    )}

                    {/* CF Order ID */}
                    {selectedPayment.cf_order_id && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">CF Order ID:</span>
                        <span className="text-slate-200">{selectedPayment.cf_order_id}</span>
                      </div>
                    )}

                    {/* Payment Method */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Payment Method:</span>
                      <span className="text-white font-bold uppercase">
                        {selectedPayment.payment_method || 'Cashfree'}
                      </span>
                    </div>

                    {/* Purpose */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Support Purpose:</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-semibold">
                        {selectedPayment.purpose || 'HELP US BUILD'}
                      </span>
                    </div>

                    {/* Source */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Origin / Source:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        (selectedPayment.source === 'Admin Payment Link' || selectedPayment.order_id?.startsWith('PL_'))
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                      }`}>
                        {(selectedPayment.source === 'Admin Payment Link' || selectedPayment.order_id?.startsWith('PL_'))
                          ? 'Admin Payment Link'
                          : 'Direct Support Page'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline Section */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" /> Timestamp
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Payment Time:</span>
                      <span className="text-slate-200">
                        {new Date(selectedPayment.payment_time || selectedPayment.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Created At:</span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(selectedPayment.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  Zenemoo Secure Payment Gateway
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold transition-all cursor-pointer"
                >
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
