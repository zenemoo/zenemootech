import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Link2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Trash2,
  X,
  Send,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  Mail,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MessageCircle,
  Share2,
  Lock,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { paymentLinksApi } from '../services/api';

export interface PaymentLinkRecord {
  id?: string;
  link_id: string;
  cf_link_id?: string;
  link_url: string;
  link_amount: number;
  link_currency: string;
  link_purpose: string;
  customer_phone?: string;
  customer_email?: string;
  customer_name?: string;
  link_status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  link_expiry_time?: string | null;
  order_id?: string | null;
  payment_id?: string | null;
  last_email_sent_at?: string | null;
  last_email_sent_to?: string | null;
  created_by?: string;
  source?: string;
  created_at: string;
  updated_at: string;
}

interface PaymentLinksSummary {
  totalLinks: number;
  totalLinkAmount: number;
  paidAmount: number;
  statusCounts: {
    ACTIVE: number;
    PAID: number;
    EXPIRED: number;
    CANCELLED: number;
  };
}

interface AdminPaymentLinksPageProps {
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Client-side cache singleton to prevent refetching on re-renders, tab switches, or filter changes
interface CachedPaymentLinks {
  links: PaymentLinkRecord[];
  summary: PaymentLinksSummary | null;
  timestamp: number;
}

let globalPaymentLinksCache: CachedPaymentLinks | null = null;
let activeFetchPromise: Promise<any> | null = null;

export const AdminPaymentLinksPage: React.FC<AdminPaymentLinksPageProps> = ({
  showToast,
}) => {
  const [links, setLinks] = useState<PaymentLinkRecord[]>(() => globalPaymentLinksCache?.links || []);
  const [summary, setSummary] = useState<PaymentLinksSummary | null>(() => globalPaymentLinksCache?.summary || null);
  const [isLoading, setIsLoading] = useState<boolean>(() => !globalPaymentLinksCache);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // Search & Filters (100% Client-Side)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination State (Client-Side)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal State for creating payment link
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createdLinkResult, setCreatedLinkResult] = useState<PaymentLinkRecord | null>(null);

  // Form Fields
  const [formType, setFormType] = useState<'onetime' | 'subscription'>('onetime');
  const [formPurpose, setFormPurpose] = useState<string>('Support Zenemoo — Platform & Technology');
  const [formAmount, setFormAmount] = useState<string>('1000');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formExpiryDays, setFormExpiryDays] = useState<number>(30);
  const [formSendSms, setFormSendSms] = useState<boolean>(false);
  const [formSendEmail, setFormSendEmail] = useState<boolean>(true);
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Details Drawer State
  const [selectedLink, setSelectedLink] = useState<PaymentLinkRecord | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Send Payment Link via Email Modal State
  const [emailModalLink, setEmailModalLink] = useState<PaymentLinkRecord | null>(null);
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [emailCustomerName, setEmailCustomerName] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailSendError, setEmailSendError] = useState<string | null>(null);

  // Custom Toast Notification State
  interface CustomToastInfo {
    type: 'success' | 'error';
    title: string;
    recipient?: string;
    detail?: string;
  }
  const [customToast, setCustomToast] = useState<CustomToastInfo | null>(null);

  useEffect(() => {
    if (customToast) {
      const timer = setTimeout(() => {
        setCustomToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [customToast]);

  const openEmailModal = (link: PaymentLinkRecord) => {
    setEmailModalLink(link);
    setEmailRecipient(link.customer_email || '');
    setEmailCustomerName(link.customer_name || '');
    setEmailSendError(null);
    setIsSendingEmail(false);
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailModalLink || isSendingEmail) return;

    const targetEmail = emailRecipient.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setEmailSendError('Please enter a valid recipient email address.');
      return;
    }

    setIsSendingEmail(true);
    setEmailSendError(null);

    try {
      const res = await paymentLinksApi.sendLinkEmail(emailModalLink.link_id, {
        recipient_email: targetEmail,
        recipient_name: emailCustomerName.trim(),
      });

      const data = res?.data || res;
      if (data?.success) {
        const nowIso = new Date().toISOString();
        // Update local memory state
        setLinks((prev) =>
          prev.map((l) =>
            l.link_id === emailModalLink.link_id
              ? { ...l, last_email_sent_at: nowIso, last_email_sent_to: targetEmail }
              : l
          )
        );
        if (globalPaymentLinksCache) {
          globalPaymentLinksCache.links = globalPaymentLinksCache.links.map((l) =>
            l.link_id === emailModalLink.link_id
              ? { ...l, last_email_sent_at: nowIso, last_email_sent_to: targetEmail }
              : l
          );
        }
        if (selectedLink && selectedLink.link_id === emailModalLink.link_id) {
          setSelectedLink((prev) =>
            prev ? { ...prev, last_email_sent_at: nowIso, last_email_sent_to: targetEmail } : null
          );
        }

        // Close modal
        setEmailModalLink(null);

        // Show Green Success Toast
        setCustomToast({
          type: 'success',
          title: 'Payment link sent successfully',
          recipient: targetEmail,
          detail: 'Sent securely from Zenemoo via Brevo.',
        });
      } else {
        throw new Error(data?.message || 'Failed to dispatch email.');
      }
    } catch (err: any) {
      console.error('Send payment link email error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Email could not be sent.';
      setEmailSendError(msg);
      // Show Red Error Toast
      setCustomToast({
        type: 'error',
        title: 'Email could not be sent',
        recipient: targetEmail,
        detail: msg,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const fetchPaymentLinks = useCallback(async (isManual = false) => {
    // 1. If not manual refresh and cache exists and is fresh (< 60s), avoid network call
    if (!isManual && globalPaymentLinksCache && Date.now() - globalPaymentLinksCache.timestamp < 60000) {
      setLinks(globalPaymentLinksCache.links);
      setSummary(globalPaymentLinksCache.summary);
      setIsLoading(false);
      return;
    }

    // 2. Request deduplication: if a request is already in-flight, await it
    if (activeFetchPromise) {
      return activeFetchPromise;
    }

    if (isManual) setIsRefreshing(true);
    else if (!globalPaymentLinksCache) setIsLoading(true);
    setErrorMessage(null);

    console.log('[PaymentLinks] request:', isManual ? 'manual-refresh' : 'initial-load');

    activeFetchPromise = (async () => {
      try {
        const res = await paymentLinksApi.getLinks(isManual);
        const data = res?.data || res;

        if (data?.success) {
          const freshLinks = data.links || [];
          const freshSummary = data.summary || null;

          setLinks(freshLinks);
          setSummary(freshSummary);

          // Update singleton cache
          globalPaymentLinksCache = {
            links: freshLinks,
            summary: freshSummary,
            timestamp: Date.now(),
          };

          if (isManual && showToastRef.current) {
            showToastRef.current('Payment links refreshed successfully.', 'success');
          }
        } else {
          throw new Error(data?.message || 'Failed to retrieve payment links.');
        }
      } catch (err: any) {
        console.error('Failed to load payment links:', err);
        setErrorMessage(err?.response?.data?.message || err?.message || 'Unable to load payment links.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        activeFetchPromise = null;
      }
    })();

    return activeFetchPromise;
  }, []);

  // Run exactly once on mount
  useEffect(() => {
    fetchPaymentLinks(false);
  }, []);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
    if (showToastRef.current) showToastRef.current(`Copied ${label} to clipboard`, 'info');
  };

  const getWhatsAppShareUrl = (link: PaymentLinkRecord) => {
    const text = encodeURIComponent(
      `Hello ${link.customer_name || 'Supporter'},\n\nHere is your secure Zenemoo payment link for ${link.link_purpose || 'Support Zenemoo'} (₹${Number(link.link_amount || 0).toLocaleString('en-IN')}):\n${link.link_url}\n\nThank you for supporting Zenemoo!`
    );
    const cleanPhone = (link.customer_phone || '').replace(/[^0-9]/g, '').slice(-10);
    return cleanPhone ? `https://wa.me/91${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
  };

  const getEmailShareUrl = (link: PaymentLinkRecord) => {
    const subject = encodeURIComponent(`Secure Payment Link — ${link.link_purpose || 'Support Zenemoo'}`);
    const body = encodeURIComponent(
      `Hello ${link.customer_name || 'Supporter'},\n\nPlease find your secure payment link for ₹${Number(link.link_amount || 0).toLocaleString('en-IN')} below:\n\n${link.link_url}\n\nPurpose: ${link.link_purpose || 'Support Zenemoo'}\n\nThank you,\nZenemoo Data Solutions\nhttps://www.zenemoo.in`
    );
    return `mailto:${link.customer_email || ''}?subject=${subject}&body=${body}`;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numAmount = Number(formAmount);
    if (!numAmount || isNaN(numAmount) || numAmount < 10) {
      setFormError('Amount must be at least ₹10.');
      return;
    }

    if (!formPurpose.trim()) {
      setFormError('Payment reason is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await paymentLinksApi.createLink({
        amount: numAmount,
        purpose: formPurpose.trim(),
        customer_phone: formPhone.trim(),
        customer_email: formEmail.trim(),
        customer_name: formName.trim(),
        expiry_days: formExpiryDays,
        send_sms: formSendSms,
        send_email: formSendEmail,
      });

      const data = res?.data || res;
      if (data?.success && data?.link) {
        const created = data.link as PaymentLinkRecord;
        setCreatedLinkResult(created);

        // Targeted local update (0 extra network requests)
        console.log('[PaymentLinks] request: create-update (local state updated, 0 requests)');
        setLinks((prev) => [created, ...prev]);
        setSummary((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            totalLinks: prev.totalLinks + 1,
            totalLinkAmount: prev.totalLinkAmount + (created.link_amount || 0),
            statusCounts: {
              ...prev.statusCounts,
              ACTIVE: (prev.statusCounts.ACTIVE || 0) + 1,
            },
          };
        });

        if (globalPaymentLinksCache) {
          globalPaymentLinksCache.links = [created, ...globalPaymentLinksCache.links];
          if (globalPaymentLinksCache.summary) {
            globalPaymentLinksCache.summary.totalLinks += 1;
            globalPaymentLinksCache.summary.totalLinkAmount += (created.link_amount || 0);
            globalPaymentLinksCache.summary.statusCounts.ACTIVE = (globalPaymentLinksCache.summary.statusCounts.ACTIVE || 0) + 1;
          }
        }

        if (showToastRef.current) showToastRef.current('Cashfree payment link generated successfully.', 'success');
      } else {
        throw new Error(data?.message || 'Failed to create payment link.');
      }
    } catch (err: any) {
      console.error('Create link error:', err);
      setFormError(err?.response?.data?.message || err?.message || 'Failed to generate payment link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelLink = async (linkId: string) => {
    if (!confirm(`Are you sure you want to cancel / disable payment link ${linkId}?`)) return;

    try {
      const res = await paymentLinksApi.cancelLink(linkId);
      const data = res?.data || res;
      if (data?.success) {
        if (showToastRef.current) showToastRef.current(`Payment link ${linkId} cancelled.`, 'info');

        // Targeted local state update (0 extra network requests)
        setLinks((prev) =>
          prev.map((l) => (l.link_id === linkId ? { ...l, link_status: 'CANCELLED' as const } : l))
        );
        if (globalPaymentLinksCache) {
          globalPaymentLinksCache.links = globalPaymentLinksCache.links.map((l) =>
            l.link_id === linkId ? { ...l, link_status: 'CANCELLED' as const } : l
          );
        }

        if (selectedLink && selectedLink.link_id === linkId) {
          setSelectedLink((prev) => (prev ? { ...prev, link_status: 'CANCELLED' } : null));
        }
      }
    } catch (err: any) {
      if (showToastRef.current) showToastRef.current('Failed to cancel payment link.', 'error');
    }
  };

  const resetCreateForm = () => {
    setFormType('onetime');
    setFormPurpose('Support Zenemoo — Platform & Technology');
    setFormAmount('1000');
    setFormPhone('');
    setFormEmail('');
    setFormName('');
    setFormExpiryDays(30);
    setFormSendSms(false);
    setFormSendEmail(true);
    setFormError(null);
    setCreatedLinkResult(null);
    setIsCreateModalOpen(false);
  };

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Filtered links list (100% Client-Side, 0 Requests)
  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = (link.link_id || '').toLowerCase().includes(q);
        const matchesPurpose = (link.link_purpose || '').toLowerCase().includes(q);
        const matchesName = (link.customer_name || '').toLowerCase().includes(q);
        const matchesEmail = (link.customer_email || '').toLowerCase().includes(q);
        const matchesPhone = (link.customer_phone || '').includes(q);
        const matchesAmount = String(link.link_amount).includes(q);
        if (!matchesId && !matchesPurpose && !matchesName && !matchesEmail && !matchesPhone && !matchesAmount) {
          return false;
        }
      }

      if (statusFilter !== 'ALL') {
        if ((link.link_status || '').toUpperCase() !== statusFilter) return false;
      }

      return true;
    });
  }, [links, searchQuery, statusFilter]);

  // Paginated records for table
  const totalPages = Math.max(1, Math.ceil(filteredLinks.length / pageSize));
  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLinks.slice(start, start + pageSize);
  }, [filteredLinks, currentPage, pageSize]);

  const renderStatusBadge = (status: string) => {
    const st = (status || 'ACTIVE').toUpperCase();
    switch (st) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-semibold">
            <Clock className="w-3 h-3" /> Active
          </span>
        );
      case 'CANCELLED':
      case 'TERMINATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[11px] font-semibold">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
            <AlertCircle className="w-3 h-3" /> Expired
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. PAGE HEADER */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#070b14]/90 via-[#0a0f1d]/80 to-[#070b14]/90 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-display tracking-tight flex items-center gap-2">
              Payment Links
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Cashfree PG
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Create and manage secure Cashfree payment links for supporters and clients.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => fetchPaymentLinks(true)}
            disabled={isRefreshing || isLoading}
            className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-medium flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Payment Link</span>
          </button>
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
            onClick={() => fetchPaymentLinks(true)}
            className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/30 text-xs font-mono cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#070b14]/70">
          <div className="text-slate-400 text-xs font-mono uppercase mb-2">Total Links</div>
          <div className="text-2xl font-extrabold text-white font-display">
            {summary?.totalLinks ?? links.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">Created via Admin</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#070b14]/70">
          <div className="text-slate-400 text-xs font-mono uppercase mb-2">Active Links</div>
          <div className="text-2xl font-extrabold text-cyan-400 font-display">
            {summary?.statusCounts?.ACTIVE ?? 0}
          </div>
          <div className="text-[11px] text-cyan-300/80 mt-1 font-mono">Awaiting customer payment</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#070b14]/70">
          <div className="text-slate-400 text-xs font-mono uppercase mb-2">Paid Links</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-display">
            {summary?.statusCounts?.PAID ?? 0}
          </div>
          <div className="text-[11px] text-emerald-300/80 mt-1 font-mono">Successfully collected</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#070b14]/70">
          <div className="text-slate-400 text-xs font-mono uppercase mb-2">Collected Amount</div>
          <div className="text-2xl font-extrabold text-white font-display">
            ₹{(summary?.paidAmount || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Via payment links</div>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-[#070b14]/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, reason, supporter, phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {['ALL', 'ACTIVE', 'PAID', 'EXPIRED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer border ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-white/[0.02] text-slate-400 border-white/10 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 4. PAYMENT LINKS DATA TABLE */}
      <div className="glass-panel rounded-3xl border border-white/10 bg-[#070b14]/70 overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="py-16 text-center space-y-3 font-mono">
            <Link2 className="w-12 h-12 text-slate-500 mx-auto" />
            <h4 className="text-base font-bold text-white">No Payment Links Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create a payment link above to generate a direct Cashfree checkout URL for customers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Payment Link</th>
                  <th className="py-3.5 px-4 font-semibold">Reason</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Created</th>
                  <th className="py-3.5 px-4 font-semibold">Expires</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedLinks.map((link) => (
                  <tr
                    key={link.link_id}
                    onClick={() => setSelectedLink(link)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    {/* Link ID */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-cyan-400 text-[11px] block">{link.link_id}</span>
                      {link.cf_link_id && (
                        <span className="text-[9px] text-slate-500">CF: {link.cf_link_id}</span>
                      )}
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4 max-w-[200px] truncate text-white">
                      {link.link_purpose || 'Support Zenemoo'}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-white font-medium">{link.customer_name || 'Supporter'}</div>
                      <div className="text-[10px] text-slate-400">
                        {link.customer_phone ? `+91 ${link.customer_phone}` : link.customer_email || '—'}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-sm text-cyan-300 font-display">
                      ₹{Number(link.link_amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Created */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                      {new Date(link.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>

                    {/* Expires */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                      {link.link_expiry_time
                        ? new Date(link.link_expiry_time).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })
                        : 'No Expiry'}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(link.link_status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleCopy(link.link_url, `Link ${link.link_id}`)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-white/10 transition-colors"
                          title="Copy Secure Link URL"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={getWhatsAppShareUrl(link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 border border-white/10 transition-colors"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => openEmailModal(link)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-blue-500/20 text-slate-400 hover:text-blue-300 border border-white/10 transition-colors cursor-pointer"
                          title="Share via Email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={link.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-white/10 transition-colors"
                          title="Open Payment Link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        {link.link_status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleCancelLink(link.link_id)}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 transition-colors"
                            title="Cancel / Disable Link"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        {filteredLinks.length > 0 && (
          <div className="py-3 px-4 border-t border-white/10 bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span>Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredLinks.length)} of {filteredLinks.length} records</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="ml-2 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white text-[11px] focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value={10} className="bg-[#070b14] text-white">10 / page</option>
                <option value={20} className="bg-[#070b14] text-white">20 / page</option>
                <option value={50} className="bg-[#070b14] text-white">50 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 py-1 rounded-lg bg-white/[0.04] text-white font-bold text-[11px]">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. CREATE PAYMENT LINK MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetCreateForm}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#070b14] border border-white/10 rounded-3xl p-6 sm:p-7 z-10 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto font-mono text-xs"
            >
              {!createdLinkResult ? (
                /* FORM VIEW */
                <form onSubmit={handleCreateSubmit} className="space-y-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white font-display">Create Payment Link</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Create a one-time payment link or configure a support payment request.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetCreateForm}
                      className="p-1.5 rounded-xl bg-white/[0.04] text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Payment Link Type */}
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                      Payment Link Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormType('onetime')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          formType === 'onetime'
                            ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-sm'
                            : 'bg-white/[0.02] border-white/10 text-slate-400'
                        }`}
                      >
                        <div className="font-bold text-white text-xs">● One-time Payment</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Standard single contribution</div>
                      </button>

                      <button
                        type="button"
                        disabled
                        className="p-3 rounded-xl border border-white/5 bg-white/[0.01] text-slate-600 text-left cursor-not-allowed opacity-50"
                      >
                        <div className="font-bold text-xs">○ Subscription</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">Requires Cashfree recurring auth</div>
                      </button>
                    </div>
                  </div>

                  {/* Payment Reason */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                        Payment Reason <span className="text-cyan-400">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500">{formPurpose.length}/500</span>
                    </div>
                    <input
                      type="text"
                      maxLength={500}
                      required
                      value={formPurpose}
                      onChange={(e) => setFormPurpose(e.target.value)}
                      placeholder="e.g. Support Zenemoo — Platform & Technology"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    />
                    <p className="text-[10px] text-slate-500">
                      This will appear on the payment page and customer confirmation email.
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                      Amount (INR ₹) <span className="text-cyan-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 font-bold text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="10"
                        max="500000"
                        required
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        placeholder="1000"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-display text-base font-bold focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="space-y-3 pt-1 border-t border-white/10">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                        Customer Details
                      </label>
                      <p className="text-[10px] text-slate-500">
                        The customer will receive the payment link and receipt via this contact info.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Phone Number (+91)</label>
                        <input
                          type="tel"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                          placeholder="9876543210"
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Customer Name</label>
                        <input
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Prem Prasad"
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Email ID</label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="supporter@example.com"
                        className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {/* More Options Collapsible */}
                  <div className="border-t border-white/10 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowMoreOptions(!showMoreOptions)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer font-bold"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          showMoreOptions ? 'rotate-180' : ''
                        }`}
                      />
                      <span>{showMoreOptions ? 'Hide Additional Options' : 'More Options (Expiry, Notifications)'}</span>
                    </button>

                    {showMoreOptions && (
                      <div className="mt-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Link Expiry</label>
                          <select
                            value={formExpiryDays}
                            onChange={(e) => setFormExpiryDays(Number(e.target.value))}
                            className="w-full px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none"
                          >
                            <option value={7} className="bg-[#070b14]">7 Days</option>
                            <option value={15} className="bg-[#070b14]">15 Days</option>
                            <option value={30} className="bg-[#070b14]">30 Days (Default)</option>
                            <option value={60} className="bg-[#070b14]">60 Days</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-4 text-[11px]">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                            <input
                              type="checkbox"
                              checked={formSendEmail}
                              onChange={(e) => setFormSendEmail(e.target.checked)}
                              className="rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-0"
                            />
                            <span>Email Notification</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                            <input
                              type="checkbox"
                              checked={formSendSms}
                              onChange={(e) => setFormSendSms(e.target.checked)}
                              className="rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-0"
                            />
                            <span>SMS Notification</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={resetCreateForm}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl bg-white/[0.04] text-slate-300 hover:text-white border border-white/10 cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold cursor-pointer transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating Secure Link...</span>
                        </>
                      ) : (
                        <span>Create Payment Link</span>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* LINK CREATED SUCCESS VIEW */
                <div className="space-y-5 text-center py-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20">
                    <Check className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white font-display">Payment Link Created!</h3>
                    <p className="text-xs text-slate-400">
                      Share this link directly with the customer to complete payment.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Amount:</span>
                      <span className="text-cyan-300 font-bold font-display text-base">
                        ₹{createdLinkResult.link_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Reason:</span>
                      <span className="text-white truncate max-w-[220px]">{createdLinkResult.link_purpose}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Link ID:</span>
                      <span className="text-slate-300 font-mono text-[11px]">{createdLinkResult.link_id}</span>
                    </div>
                  </div>

                  {/* URL Box */}
                  <div className="p-3 rounded-xl bg-black/60 border border-cyan-500/30 flex items-center justify-between gap-2">
                    <span className="text-cyan-300 font-mono text-[11px] truncate select-all">
                      {createdLinkResult.link_url}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(createdLinkResult.link_url, 'Payment Link')}
                      className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold cursor-pointer transition-all shrink-0 flex items-center gap-1"
                    >
                      {copiedField === 'Payment Link' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'Payment Link' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* WhatsApp & Email Quick Share */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={getWhatsAppShareUrl(createdLinkResult)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-2 transition-all font-bold"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Share WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => openEmailModal(createdLinkResult)}
                      className="py-2.5 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center gap-2 transition-all font-bold cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Share Email</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <a
                      href={createdLinkResult.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Link</span>
                    </a>

                    <button
                      type="button"
                      onClick={resetCreateForm}
                      className="py-2.5 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-bold transition-all cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. LINK DETAILS SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {selectedLink && (
          <div className="fixed inset-0 z-50 flex justify-end font-mono">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLink(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="relative w-full max-w-md bg-[#070b14] border-l border-white/10 h-full overflow-y-auto p-6 z-10 space-y-6 shadow-2xl flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                      <Link2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-display">Payment Link Details</h3>
                      <p className="text-[10px] text-slate-400">{selectedLink.link_id}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLink(null)}
                    className="p-1.5 rounded-xl bg-white/[0.04] text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Amount & Status */}
                <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-transparent text-center space-y-2">
                  <div className="flex justify-center">{renderStatusBadge(selectedLink.link_status)}</div>
                  <div className="text-3xl font-extrabold text-white font-display">
                    ₹{Number(selectedLink.link_amount || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-400">{selectedLink.link_purpose}</div>
                </div>

                {/* Customer Info */}
                <div className="space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Customer Information
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Name:</span>
                      <span className="text-white font-semibold">{selectedLink.customer_name || 'Supporter'}</span>
                    </div>
                    {selectedLink.customer_phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="text-slate-200">+91 {selectedLink.customer_phone}</span>
                      </div>
                    )}
                    {selectedLink.customer_email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Email:</span>
                        <span className="text-cyan-300">{selectedLink.customer_email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Details */}
                <div className="space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Link Identifiers
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Link URL:</span>
                      <a
                        href={selectedLink.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {selectedLink.order_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Paid Order ID:</span>
                        <span className="text-emerald-300">{selectedLink.order_id}</span>
                      </div>
                    )}
                    {selectedLink.payment_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Payment ID:</span>
                        <span className="text-emerald-300">{selectedLink.payment_id}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Created At:</span>
                      <span className="text-slate-200">
                        {new Date(selectedLink.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Share Actions */}
                <div className="space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Share Payment Link
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={getWhatsAppShareUrl(selectedLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-2 transition-all font-bold"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => openEmailModal(selectedLink)}
                      className="py-2.5 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center gap-2 transition-all font-bold cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                {selectedLink.link_status === 'ACTIVE' ? (
                  <button
                    type="button"
                    onClick={() => handleCancelLink(selectedLink.link_id)}
                    className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer"
                  >
                    Cancel Link
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="button"
                  onClick={() => setSelectedLink(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. SEND PAYMENT LINK VIA EMAIL MODAL (2-Column Desktop, 1-Column Mobile) */}
      <AnimatePresence>
        {emailModalLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 font-mono text-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSendingEmail) setEmailModalLink(null);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="relative w-full max-w-4xl bg-[#070b14] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 z-10 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shadow-md">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                      Send Payment Link via Email
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Send this secure payment link directly from Zenemoo.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={() => setEmailModalLink(null)}
                  className="p-1.5 rounded-xl bg-white/[0.04] text-slate-400 hover:text-white cursor-pointer transition-colors disabled:opacity-30"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {emailSendError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{emailSendError}</span>
                </div>
              )}

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Configuration & Sender Form */}
                <form onSubmit={handleSendEmailSubmit} className="lg:col-span-5 space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                        Recipient Email <span className="text-cyan-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={emailRecipient}
                          onChange={(e) => setEmailRecipient(e.target.value)}
                          placeholder="customer@example.com"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                        Recipient Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={emailCustomerName}
                          onChange={(e) => setEmailCustomerName(e.target.value)}
                          placeholder="e.g. Prem Prasad Pradhan"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                        Email Subject Preview
                      </label>
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-300 text-[11px] select-all">
                        Payment Request from Zenemoo — ₹{Number(emailModalLink.link_amount).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Payment Metadata Snapshot */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 text-[11px]">
                    <div className="text-slate-400 uppercase font-bold text-[10px] tracking-wider mb-1">
                      Payment Link Details
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Amount:</span>
                      <span className="text-cyan-300 font-bold font-display text-sm">
                        ₹{Number(emailModalLink.link_amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Reason:</span>
                      <span className="text-white truncate max-w-[170px]">{emailModalLink.link_purpose}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Link ID:</span>
                      <span className="text-slate-300 font-mono text-[10px]">{emailModalLink.link_id}</span>
                    </div>
                    {emailModalLink.link_expiry_time && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Valid Until:</span>
                        <span className="text-emerald-400 font-semibold">
                          {new Date(emailModalLink.link_expiry_time).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Brevo Delivery Assurance */}
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300/90 leading-relaxed flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Dispatched securely via <strong>Zenemoo Brevo SMTP service</strong> with real-time delivery confirmation.
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isSendingEmail}
                      onClick={() => setEmailModalLink(null)}
                      className="w-1/3 py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSendingEmail}
                      className="w-2/3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                    >
                      {isSendingEmail ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Sending Email...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* RIGHT COLUMN: Live Email Preview matching the attached screenshot */}
                <div className="lg:col-span-7 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Email Preview <span className="text-slate-500 font-normal lowercase">(as it will be sent)</span></span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      Live Template
                    </span>
                  </div>

                  <div className="rounded-2xl bg-white text-slate-900 overflow-hidden shadow-2xl border border-white/20 text-xs select-none">
                    {/* Top Header Banner */}
                    <div className="bg-[#030712] p-4 text-white flex items-center justify-between border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white p-1 shadow shrink-0 flex items-center justify-center">
                          <img src="/assets/logo.png" alt="Zenemoo" className="w-full h-full object-contain rounded-lg" />
                        </div>
                        <div>
                          <div className="font-extrabold text-white text-sm tracking-wide">ZENEMOO</div>
                          <div className="text-[9px] text-slate-400">People &bull; Opportunities &bull; Impact</div>
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-cyan-400 font-mono">
                        <div>Building</div>
                        <div className="text-slate-400 -mt-0.5">A Brighter Tomorrow Together</div>
                        <div className="h-0.5 w-12 bg-cyan-400 ml-auto mt-0.5 rounded-full" />
                      </div>
                    </div>

                    {/* Email Content Body */}
                    <div className="p-5 space-y-3.5 font-sans">
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900 leading-tight">Payment Request</h4>
                        <div className="text-[11px] font-bold text-sky-600">from Zenemoo</div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                        <p>
                          Dear <strong className="text-slate-900">{emailCustomerName.trim() || 'Supporter'}</strong>,
                        </p>
                        <p>
                          You have a payment request from <strong>Zenemoo</strong>. Please find the details below and use the secure payment link to complete your payment.
                        </p>
                      </div>

                      {/* Details Box */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-slate-500 font-medium shrink-0">
                            <FileText className="w-3.5 h-3.5 text-sky-600" />
                            <span>Payment For</span>
                          </div>
                          <span className="font-bold text-slate-900 text-right">
                            {emailModalLink.link_purpose || 'Support Zenemoo — Platform & Technology'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <span className="font-bold text-sky-600">₹</span>
                            <span>Amount</span>
                          </div>
                          <span className="font-extrabold text-slate-900 text-sm">
                            ₹{Number(emailModalLink.link_amount).toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] text-slate-500 font-normal">INR</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-sky-600" />
                            <span>Valid Until</span>
                          </div>
                          <span className="font-bold text-slate-900">
                            {emailModalLink.link_expiry_time
                              ? new Date(emailModalLink.link_expiry_time).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '30 Days Validity'}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-sky-700 font-semibold text-[11px]">
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Payment Link</span>
                          </div>
                          <a
                            href={emailModalLink.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Pay Now Securely</span>
                            <ArrowRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Security Note */}
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-[11px] text-emerald-900">
                        <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="leading-tight">
                          <strong>This is a secure payment link powered by Cashfree.</strong>
                          <div className="text-emerald-700 text-[10px] mt-0.5">You can pay using UPI, Cards, NetBanking or Wallets.</div>
                        </div>
                      </div>

                      {/* Assistance Note */}
                      <div className="p-2 rounded-lg bg-sky-50 border border-sky-100 flex items-center gap-2 text-[11px] text-sky-900">
                        <AlertCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>If you have any questions or need assistance, feel free to contact us.</span>
                      </div>

                      {/* Sign-off */}
                      <div className="text-xs text-slate-600 border-t border-slate-100 pt-2.5 leading-tight">
                        <div>Thank you,</div>
                        <div className="font-bold text-slate-900 mt-0.5">Team Zenemoo</div>
                        <div className="text-[11px] text-slate-500">Zenemoo AI Data Solutions</div>
                      </div>

                      {/* Footer */}
                      <div className="text-center pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                        <div className="flex items-center justify-center gap-3 text-sky-600 text-[10px] font-medium">
                          <span>Website</span> &bull;
                          <span>Support</span> &bull;
                          <span>Privacy Policy</span> &bull;
                          <span>Terms of Service</span>
                        </div>
                        <div className="font-medium text-slate-600">Building a brighter tomorrow, together.</div>
                        <div className="text-[9px] text-slate-400">&copy; {new Date().getFullYear()} Zenemoo AI Data Solutions. All rights reserved.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. CUSTOM FLOATING TOAST (Green for Success, Red for Error) */}
      <AnimatePresence>
        {customToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 max-w-sm w-full font-mono text-xs"
          >
            <div
              className={`p-4 rounded-2xl backdrop-blur-xl border shadow-2xl flex items-start gap-3 ${
                customToast.type === 'success'
                  ? 'bg-[#041a14]/95 border-emerald-500/40 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                  : 'bg-[#1a0408]/95 border-rose-500/40 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.25)]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  customToast.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {customToast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
              </div>

              <div className="space-y-1 flex-1">
                <div className="font-bold text-white text-xs">{customToast.title}</div>
                {customToast.recipient && (
                  <div className="text-[11px] text-slate-300">
                    Email sent to: <span className="text-cyan-300 font-semibold">{customToast.recipient}</span>
                  </div>
                )}
                {customToast.detail && (
                  <div
                    className={`text-[10px] ${
                      customToast.type === 'success' ? 'text-emerald-300/80' : 'text-rose-300/80'
                    }`}
                  >
                    {customToast.detail}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setCustomToast(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
