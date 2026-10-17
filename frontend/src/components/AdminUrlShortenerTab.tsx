import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Link2,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Trash2,
  Edit,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  Globe,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  FileSpreadsheet,
  ShieldCheck,
  History,
  AlertCircle,
  Video,
  FileText,
  MessageCircle,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { shortenerApi, ShortenerLinkItem, ShortenerStats } from '../services/api';

interface AdminUrlShortenerTabProps {
  onShowConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    opts?: { confirmText?: string; cancelText?: string; intent?: 'danger' | 'warning' | 'info' }
  ) => void;
  onAddToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminUrlShortenerTab: React.FC<AdminUrlShortenerTabProps> = ({
  onShowConfirm,
  onAddToast,
}) => {
  // State
  const [links, setLinks] = useState<ShortenerLinkItem[]>([]);
  const [stats, setStats] = useState<ShortenerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'expired'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [totalLinks, setTotalLinks] = useState(0);

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ShortenerLinkItem | null>(null);
  const [activeDetailLink, setActiveDetailLink] = useState<ShortenerLinkItem | null>(null);
  const [qrModalLink, setQrModalLink] = useState<ShortenerLinkItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Create Form State
  const [destinationUrl, setDestinationUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Copy Feedback Tracking (code -> boolean)
  const [copiedCodes, setCopiedCodes] = useState<Record<string, boolean>>({});

  const baseDomain = stats?.production_domain || 'https://zenemoo.in';

  // Fetch Stats & Links
  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [statsRes, linksRes] = await Promise.all([
        shortenerApi.getStats().catch(() => null),
        shortenerApi.getLinks({
          search: searchQuery,
          status: statusFilter,
          page: currentPage,
          limit: itemsPerPage,
        }).catch(() => null),
      ]);

      if (statsRes?.data?.success && statsRes.data.stats) {
        setStats(statsRes.data.stats);
      }
      if (linksRes?.data?.success && Array.isArray(linksRes.data.links)) {
        setLinks(linksRes.data.links);
        setTotalLinks(linksRes.data.total);
      }
    } catch (err: any) {
      onAddToast('Failed to load short links', err.message || 'Network error', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, statusFilter, currentPage, itemsPerPage, onAddToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // URL Helper classification
  const getDestinationBadge = (url: string) => {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.includes('zenemoo.in') || lower.startsWith('/')) {
      return { label: 'Zenemoo Internal', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', icon: Globe };
    }
    if (lower.includes('meet.google.com')) {
      return { label: 'Google Meet', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Video };
    }
    if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) {
      return { label: 'Google Drive / Docs', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: FileText };
    }
    if (lower.includes('whatsapp.com') || lower.includes('wa.me')) {
      return { label: 'WhatsApp Chat/Invite', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: MessageCircle };
    }
    return { label: 'External Web', color: 'text-slate-400 bg-white/5 border-white/10', icon: ExternalLink };
  };

  // Copy Action
  const handleCopy = (code: string) => {
    const fullUrl = `${baseDomain}/l/${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCodes((prev) => ({ ...prev, [code]: true }));
    onAddToast('Copied to Clipboard', fullUrl, 'success');
    setTimeout(() => {
      setCopiedCodes((prev) => ({ ...prev, [code]: false }));
    }, 2000);
  };

  // Generate QR Code
  const handleOpenQrModal = async (link: ShortenerLinkItem) => {
    setQrModalLink(link);
    const fullUrl = `${baseDomain}/l/${link.code}`;
    try {
      const url = await QRCode.toDataURL(fullUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#06070b',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
    } catch (_) {
      setQrDataUrl('');
    }
  };

  // Handle Create Link
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!destinationUrl.trim()) {
      setFormError('Destination URL is required.');
      return;
    }

    try {
      const parsed = new URL(destinationUrl.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setFormError('Only HTTP and HTTPS URLs are allowed.');
        return;
      }
    } catch (_) {
      setFormError('Please enter a valid URL (including https://).');
      return;
    }

    if (customCode.trim() && !/^[a-zA-Z0-9_-]{3,32}$/.test(customCode.trim())) {
      setFormError('Custom code must be 3-32 alphanumeric characters, hyphens, or underscores.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await shortenerApi.createLink({
        destination_url: destinationUrl.trim(),
        custom_code: customCode.trim() || undefined,
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });

      if (res.data?.success) {
        onAddToast('Short Link Created', `${baseDomain}/l/${res.data.link.code}`, 'success');
        setIsCreateModalOpen(false);
        setDestinationUrl('');
        setCustomCode('');
        setTitle('');
        setNotes('');
        setExpiresAt('');
        fetchData(true);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create short link');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (link: ShortenerLinkItem) => {
    const nextStatus = link.status === 'active' ? 'disable' : 'enable';
    onShowConfirm(
      `${nextStatus.toUpperCase()} Short Link?`,
      `Are you sure you want to ${nextStatus} short link "${link.code}"? ${
        nextStatus === 'disable' ? 'Visitors will see an inactive notice.' : 'Visitors will immediately redirect to destination.'
      }`,
      async () => {
        try {
          const res = await shortenerApi.toggleStatus(link.code);
          if (res.data?.success) {
            onAddToast(`Link ${res.data.link.status}`, `Short link ${link.code} is now ${res.data.link.status}`, 'success');
            fetchData(true);
          }
        } catch (err: any) {
          onAddToast('Action Failed', err.message || 'Could not update status', 'error');
        }
      },
      { intent: nextStatus === 'disable' ? 'warning' : 'info', confirmText: `${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)} Link` }
    );
  };

  // Delete Link
  const handleDeleteLink = (link: ShortenerLinkItem) => {
    onShowConfirm(
      'Delete Short Link Permanently?',
      `Are you sure you want to permanently delete short link "/l/${link.code}"? This will immediately remove it from Cloudflare Workers KV. This action cannot be undone.`,
      async () => {
        try {
          const res = await shortenerApi.deleteLink(link.code);
          if (res.data?.success) {
            onAddToast('Link Deleted', `Short link ${link.code} was permanently removed`, 'success');
            fetchData(true);
          }
        } catch (err: any) {
          onAddToast('Deletion Failed', err.message || 'Could not delete link', 'error');
        }
      },
      { intent: 'danger', confirmText: 'Delete Permanently' }
    );
  };

  // Update Link Modal Submit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;

    try {
      const res = await shortenerApi.updateLink(editingLink.code, {
        destination_url: editingLink.destination_url,
        title: editingLink.title,
        notes: editingLink.notes,
        expires_at: editingLink.expires_at,
        status: editingLink.status,
      });

      if (res.data?.success) {
        onAddToast('Link Updated', `Changes saved for ${editingLink.code}`, 'success');
        setEditingLink(null);
        fetchData(true);
      }
    } catch (err: any) {
      onAddToast('Update Failed', err.response?.data?.message || err.message, 'error');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    window.open(shortenerApi.exportCsvUrl(), '_blank');
    onAddToast('Export Initiated', 'Downloading CSV metadata report...', 'info');
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: HEADER & ACTION CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/10">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                URL Shortener & Gateway
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                  Cloudflare KV
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Admin-controlled short URLs at <span className="font-mono text-cyan-300 font-semibold">{baseDomain}/l/&hellip;</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-2 transition-all cursor-pointer"
            title="Refresh links"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden xs:inline">Sync</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-2 transition-all cursor-pointer"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Short Link</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Active Links</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {stats?.active_links ?? 0}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          </div>
          <p className="text-[10px] text-emerald-400/80 font-mono mt-1">Live & redirecting</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Disabled Links</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-300">
              {stats?.disabled_links ?? 0}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <p className="text-[10px] text-amber-400/80 font-mono mt-1">Temporarily blocked</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Expired Links</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-400">
              {stats?.expired_links ?? 0}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <p className="text-[10px] text-rose-400/80 font-mono mt-1">Deadline passed</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">This Month</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-300">
              {stats?.created_this_month ?? 0}
            </span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-1">Free quota: 3,000/mo</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total Redirects</p>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
              All Visits
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-purple-300">
              {stats?.total_clicks ?? 0}
            </span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-1">Aggregated telemetry</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Unique Clicks</p>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
              Unique
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-300">
              {stats?.unique_clicks ?? 0}
            </span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-[10px] text-cyan-400/80 font-mono mt-1">De-duplicated visitors</p>
        </div>
      </div>

      {/* SECTION 3: SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by code, title, destination URL, or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'active', 'disabled', 'expired'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all capitalize cursor-pointer whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 4: LINK LIST (RESPONSIVE TABLE ON DESKTOP, CARDS ON MOBILE) */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/10">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-mono text-slate-400">Querying Cloudflare Workers KV & links...</p>
        </div>
      ) : links.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/10">
          <Link2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Short Links Found</h3>
          <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto mb-5">
            {searchQuery
              ? `No links matched your search "${searchQuery}".`
              : 'Create your first branded Zenemoo short link to redirect external visitors safely.'}
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Short Link</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* DESKTOP TABLE VIEW (HIDDEN ON SMALL SCREENS) */}
          <div className="hidden md:block rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 bg-black/40 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 font-semibold">Short Link</th>
                    <th className="py-3.5 px-4 font-semibold">Destination URL</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Expiry</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Redirects</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Unique Clicks</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {links.map((link) => {
                    const badge = getDestinationBadge(link.destination_url);
                    const isCopied = copiedCodes[link.code];
                    const isExpired = link.expires_at && new Date(link.expires_at).getTime() <= Date.now();

                    return (
                      <tr key={link.code} className="hover:bg-white/[0.03] transition-colors group">
                        {/* SHORT CODE */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-cyan-300 font-mono text-sm">
                              /l/{link.code}
                            </span>
                            <button
                              onClick={() => handleCopy(link.code)}
                              className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Copy Short URL"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          {link.title && (
                            <p className="text-[11px] text-slate-400 font-sans truncate max-w-[200px] mt-0.5">
                              {link.title}
                            </p>
                          )}
                        </td>

                        {/* DESTINATION */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex items-center gap-2">
                            <a
                              href={link.destination_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white hover:text-cyan-400 truncate max-w-[240px] transition-colors inline-block"
                              title={link.destination_url}
                            >
                              {link.destination_url}
                            </a>
                            <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                          </div>
                          {badge && (
                            <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border mt-1 ${badge.color}`}>
                              <badge.icon className="w-2.5 h-2.5" />
                              {badge.label}
                            </span>
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="py-3.5 px-4">
                          {isExpired ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3" />
                              Expired
                            </span>
                          ) : link.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Disabled
                            </span>
                          )}
                        </td>

                        {/* EXPIRY */}
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {link.expires_at ? (
                            <span title={new Date(link.expires_at).toLocaleString()}>
                              {new Date(link.expires_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-600">Never</span>
                          )}
                        </td>

                        {/* TOTAL CLICKS */}
                        <td className="py-3.5 px-4 text-center text-slate-300 font-mono font-medium">
                          {link.clicks || 0}
                        </td>

                        {/* UNIQUE CLICKS */}
                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold text-[11px]">
                            <Users className="w-3 h-3 text-cyan-400" />
                            {link.unique_clicks ?? 0}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenQrModal(link)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                              title="Show QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setActiveDetailLink(link)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="View Details & Audit Log"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingLink({ ...link })}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Edit Link Metadata"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(link)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                link.status === 'active'
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                              }`}
                              title={link.status === 'active' ? 'Disable link' : 'Enable link'}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLink(link)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                              title="Delete short link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (ACTIVE ON PHONES & SMALL TABLETS) */}
          <div className="block md:hidden space-y-3">
            {links.map((link) => {
              const badge = getDestinationBadge(link.destination_url);
              const isCopied = copiedCodes[link.code];
              const isExpired = link.expires_at && new Date(link.expires_at).getTime() <= Date.now();

              return (
                <div
                  key={link.code}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-300 font-mono text-sm">
                          /l/{link.code}
                        </span>
                        <button
                          onClick={() => handleCopy(link.code)}
                          className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Copy"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      {link.title && (
                        <p className="text-xs text-white font-medium mt-0.5">{link.title}</p>
                      )}
                    </div>

                    <div>
                      {isExpired ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          Expired
                        </span>
                      ) : link.status === 'active' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 break-all font-mono bg-black/40 p-2 rounded-lg border border-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{link.destination_url}</span>
                      <a
                        href={link.destination_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-cyan-400 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                    <div className="flex items-center gap-3">
                      <span>Clicks: <strong className="text-white">{link.clicks || 0}</strong></span>
                      <span className="inline-flex items-center gap-1 text-cyan-300">
                        <Users className="w-3 h-3 text-cyan-400" />
                        Unique: <strong className="text-cyan-400">{link.unique_clicks ?? 0}</strong>
                      </span>
                    </div>
                    <span>
                      {link.expires_at ? `Exp: ${new Date(link.expires_at).toLocaleDateString()}` : 'No Expiry'}
                    </span>
                  </div>

                  {badge && (
                    <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border ${badge.color}`}>
                      <badge.icon className="w-2.5 h-2.5" />
                      {badge.label}
                    </span>
                  )}

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleOpenQrModal(link)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs font-mono flex items-center gap-1"
                    >
                      <QrCode className="w-3 h-3" />
                      <span>QR</span>
                    </button>
                    <button
                      onClick={() => setActiveDetailLink(link)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs font-mono flex items-center gap-1"
                    >
                      <History className="w-3 h-3" />
                      <span>Audit</span>
                    </button>
                    <button
                      onClick={() => setEditingLink({ ...link })}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs font-mono flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(link)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1 ${
                        link.status === 'active' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      <span>{link.status === 'active' ? 'Disable' : 'Enable'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link)}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE SHORT LINK */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-[#090b11] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Create Short Link</h3>
                    <p className="text-[11px] text-slate-400">Generate a high-speed redirect link</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateLink} className="space-y-4">
                {/* Destination URL */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Destination URL <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://zenemoo.in/talent-hub or https://meet.google.com/..."
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 transition-all"
                  />
                  {destinationUrl && (
                    <div className="mt-1.5">
                      {(() => {
                        const b = getDestinationBadge(destinationUrl);
                        return b ? (
                          <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border ${b.color}`}>
                            <b.icon className="w-2.5 h-2.5" />
                            Target: {b.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>

                {/* Custom Alias */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Custom Short Code <span className="text-slate-500">(Optional)</span>
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 rounded-l-xl bg-white/5 border border-r-0 border-white/10 text-slate-400 text-xs font-mono shrink-0">
                      zenemoo.in/l/
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. spring26 (auto-generated if empty)"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-r-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Allowed: 3-32 characters (a-z, 0-9, hyphens, underscores).
                  </p>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Descriptive Title / Campaign <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Talent Network Outreach Q1"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Expiry Date & Time <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 transition-all"
                  />
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Leave blank for permanent active link.
                  </p>
                </div>

                {/* Internal Notes */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Internal Admin Notes <span className="text-slate-500">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Shared with partner companies in Mumbai batch..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Create Short Link</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDIT LINK METADATA & DESTINATION */}
      <AnimatePresence>
        {editingLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-[#090b11] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Edit className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Edit Link: /l/{editingLink.code}</h3>
                    <p className="text-[11px] text-slate-400">Update destination or link metadata</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingLink(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                {/* Destination */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Destination URL
                  </label>
                  <input
                    type="url"
                    required
                    value={editingLink.destination_url}
                    onChange={(e) => setEditingLink({ ...editingLink, destination_url: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono mt-1.5 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Destination modifications are permanently recorded in the audit trail.</span>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={editingLink.title || ''}
                    onChange={(e) => setEditingLink({ ...editingLink, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Status</label>
                  <select
                    value={editingLink.status}
                    onChange={(e) => setEditingLink({ ...editingLink, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  >
                    <option value="active">Active (Redirecting)</option>
                    <option value="disabled">Disabled (Blocked)</option>
                  </select>
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Expiry Timestamp</label>
                  <input
                    type="datetime-local"
                    value={editingLink.expires_at ? editingLink.expires_at.slice(0, 16) : ''}
                    onChange={(e) => setEditingLink({ ...editingLink, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Internal Notes</label>
                  <textarea
                    rows={2}
                    value={editingLink.notes || ''}
                    onChange={(e) => setEditingLink({ ...editingLink, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingLink(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: AUDIT HISTORY & LINK DETAILS */}
      <AnimatePresence>
        {activeDetailLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-[#090b11] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Link Audit: /l/{activeDetailLink.code}</h3>
                    <p className="text-[11px] text-slate-400">Detailed metadata and modification trail</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveDetailLink(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Short URL:</span>
                    <span className="text-cyan-300 font-bold">{baseDomain}/l/{activeDetailLink.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination:</span>
                    <span className="text-white break-all max-w-[280px] text-right">{activeDetailLink.destination_url}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created At:</span>
                    <span className="text-slate-300">{new Date(activeDetailLink.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created By:</span>
                    <span className="text-slate-300">{activeDetailLink.created_by}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-emerald-400 capitalize">{activeDetailLink.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Redirects:</span>
                    <span className="text-white font-bold">{activeDetailLink.clicks || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unique Clicks:</span>
                    <span className="text-cyan-400 font-bold">{activeDetailLink.unique_clicks || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expires At:</span>
                    <span className="text-slate-300">{activeDetailLink.expires_at ? new Date(activeDetailLink.expires_at).toLocaleString() : 'Never'}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 font-bold">Audit History Records</h4>
                  <div className="space-y-2">
                    {Array.isArray(activeDetailLink.history) && activeDetailLink.history.length > 0 ? (
                      activeDetailLink.history.map((h, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] space-y-1">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="text-cyan-300 font-bold uppercase">{h.action}</span>
                            <span>{new Date(h.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-400">By: {h.user}</p>
                          {h.previous_destination && (
                            <p className="text-rose-400 break-all text-[10px]">
                              - From: {h.previous_destination}
                            </p>
                          )}
                          {h.new_destination && (
                            <p className="text-emerald-400 break-all text-[10px]">
                              + To: {h.new_destination}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 italic">No historical changes recorded.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-white/10">
                <button
                  onClick={() => setActiveDetailLink(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-mono"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: QR CODE PREVIEW */}
      <AnimatePresence>
        {qrModalLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-[#090b11] border border-white/10 p-6 shadow-2xl text-center space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <h3 className="text-sm font-bold text-white">QR Code for /l/{qrModalLink.code}</h3>
                <button onClick={() => setQrModalLink(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {qrDataUrl ? (
                <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto">
                  <img src={qrDataUrl} alt="Short Link QR Code" className="w-48 h-48 mx-auto" />
                </div>
              ) : (
                <div className="p-8 text-slate-500 font-mono text-xs">Generating QR...</div>
              )}

              <p className="text-xs text-slate-300 font-mono break-all">
                {baseDomain}/l/{qrModalLink.code}
              </p>

              <div className="flex justify-center gap-2 pt-2">
                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`zenemoo_qr_${qrModalLink.code}.png`}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </a>
                )}
                <button
                  onClick={() => handleCopy(qrModalLink.code)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white font-mono text-xs hover:bg-white/15"
                >
                  Copy URL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
