import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Link2,
  AlertCircle,
  X,
  Megaphone,
  Calendar,
  Layers,
  Power,
  Sliders,
  Check,
  Search,
} from 'lucide-react';
import { announcementApi, AdminAnnouncementItem } from '../services/api';

interface AdminAnnouncementsTabProps {
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  showConfirm?: (title: string, msg: string, onConfirm: () => void) => void;
}

const COMMON_ICONS = ['✦', '●', '★', '🚀', '🔥', '📢', '✨', '⚡', '🏛️', '💎'];

export const AdminAnnouncementsTab: React.FC<AdminAnnouncementsTabProps> = ({ addToast, showConfirm }) => {
  const [announcements, setAnnouncements] = useState<AdminAnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'disabled' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminAnnouncementItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formLinkUrl, setFormLinkUrl] = useState('');
  const [formLinkText, setFormLinkText] = useState('');
  const [formIcon, setFormIcon] = useState('✦');
  const [formPriority, setFormPriority] = useState<number>(0);
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [formActive, setFormActive] = useState(true);
  const [formStartAt, setFormStartAt] = useState('');
  const [formEndAt, setFormEndAt] = useState('');

  // Delete Confirmation Modal State
  const [itemToDelete, setItemToDelete] = useState<AdminAnnouncementItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Announcements from API
  const fetchAnnouncements = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setIsRefreshing(true);
    try {
      const res = await announcementApi.getAdminAnnouncements('all');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAnnouncements(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load announcements:', err);
      addToast(err.response?.data?.message || 'Failed to fetch announcements.', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Compute status counts
  const counts = useMemo(() => {
    const res = { all: announcements.length, active: 0, scheduled: 0, disabled: 0, expired: 0 };
    for (const a of announcements) {
      if (a.computedStatus in res) {
        res[a.computedStatus as keyof typeof res]++;
      }
    }
    return res;
  }, [announcements]);

  // Filter & Search
  const filteredList = useMemo(() => {
    return announcements.filter((item) => {
      if (statusFilter !== 'all' && item.computedStatus !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const msg = (item.message || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        const link = (item.linkUrl || '').toLowerCase();
        return msg.includes(q) || title.includes(q) || link.includes(q);
      }
      return true;
    });
  }, [announcements, statusFilter, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormMessage('');
    setFormLinkUrl('');
    setFormLinkText('');
    setFormIcon('✦');
    setFormPriority(0);
    setFormSortOrder(announcements.length + 1);
    setFormActive(true);
    setFormStartAt('');
    setFormEndAt('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: AdminAnnouncementItem) => {
    setEditingItem(item);
    setFormTitle(item.title || '');
    setFormMessage(item.message || '');
    setFormLinkUrl(item.linkUrl || '');
    setFormLinkText(item.linkText || '');
    setFormIcon(item.icon || '✦');
    setFormPriority(item.priority || 0);
    setFormSortOrder(item.sortOrder || 0);
    setFormActive(Boolean(item.active));
    setFormStartAt(item.startAt ? item.startAt.slice(0, 16) : '');
    setFormEndAt(item.endAt ? item.endAt.slice(0, 16) : '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Save Announcement (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanMessage = formMessage.trim();
    if (!cleanMessage) {
      setFormError('Announcement message is required.');
      return;
    }

    if (formLinkUrl.trim()) {
      const lower = formLinkUrl.trim().toLowerCase();
      if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
        setFormError('JavaScript and data URIs are strictly forbidden for security.');
        return;
      }
    }

    if (formStartAt && formEndAt && new Date(formStartAt).getTime() >= new Date(formEndAt).getTime()) {
      setFormError('End Date/Time must be strictly after Start Date/Time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        message: cleanMessage,
        linkUrl: formLinkUrl.trim(),
        linkText: formLinkText.trim(),
        icon: formIcon.trim() || '✦',
        priority: Number(formPriority) || 0,
        sortOrder: Number(formSortOrder) || 0,
        active: formActive,
        startAt: formStartAt ? new Date(formStartAt).toISOString() : null,
        endAt: formEndAt ? new Date(formEndAt).toISOString() : null,
      };

      if (editingItem) {
        await announcementApi.updateAnnouncement(editingItem.id, payload);
        addToast('Announcement updated successfully.', 'success');
      } else {
        await announcementApi.createAnnouncement(payload);
        addToast('Announcement created successfully.', 'success');
      }

      setIsModalOpen(false);
      await fetchAnnouncements(true);
    } catch (err: any) {
      console.error('Failed to save announcement:', err);
      setFormError(err.response?.data?.message || 'Failed to save announcement. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (item: AdminAnnouncementItem) => {
    try {
      const newActive = !item.active;
      await announcementApi.toggleAnnouncementStatus(item.id, newActive);
      setAnnouncements((prev) =>
        prev.map((x) =>
          x.id === item.id
            ? { ...x, active: newActive, computedStatus: newActive ? 'active' : 'disabled' }
            : x
        )
      );
      addToast(`Announcement ${newActive ? 'enabled' : 'disabled'}.`, 'info');
      fetchAnnouncements(true);
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to toggle status.', 'error');
    }
  };

  // Delete Announcement
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await announcementApi.deleteAnnouncement(itemToDelete.id);
      addToast('Announcement deleted successfully.', 'success');
      setItemToDelete(null);
      await fetchAnnouncements(true);
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to delete announcement.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Reorder Item (Up or Down)
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= filteredList.length) return;

    const currentItem = filteredList[index];
    const swapItem = filteredList[targetIdx];

    const currentOrder = currentItem.sortOrder;
    const swapOrder = swapItem.sortOrder;

    // Optimistic UI update
    const newList = [...announcements];
    const cIdx = newList.findIndex((x) => x.id === currentItem.id);
    const sIdx = newList.findIndex((x) => x.id === swapItem.id);
    if (cIdx !== -1 && sIdx !== -1) {
      newList[cIdx].sortOrder = swapOrder;
      newList[sIdx].sortOrder = currentOrder;
      setAnnouncements(newList.sort((a, b) => (b.priority || 0) - (a.priority || 0) || (a.sortOrder || 0) - (b.sortOrder || 0)));
    }

    try {
      const orderedIds = announcements.map((a) => a.id);
      // swap in array
      const from = orderedIds.indexOf(currentItem.id);
      const to = orderedIds.indexOf(swapItem.id);
      if (from !== -1 && to !== -1) {
        const [removed] = orderedIds.splice(from, 1);
        orderedIds.splice(to, 0, removed);
      }
      await announcementApi.reorderAnnouncements(orderedIds);
      addToast('Display order updated.', 'info');
      fetchAnnouncements(true);
    } catch (err: any) {
      addToast('Failed to update order.', 'error');
      fetchAnnouncements(true);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: AdminAnnouncementItem['computedStatus']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Active
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Clock className="w-3 h-3 text-blue-400" />
            Scheduled
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            Expired
          </span>
        );
      case 'disabled':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            <XCircle className="w-3 h-3 text-slate-400" />
            Disabled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/10 bg-[#07090e]/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-white tracking-tight">
                Announcement Ticker Management
              </h1>
              <p className="text-xs text-slate-400">
                Manage live announcements, scheduling, order, and links displayed in the Home page continuous marquee.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchAnnouncements()}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-mono disabled:opacity-50"
            title="Refresh list from Cloudflare D1"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            <span>Add Announcement</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-2xl bg-[#06080d] border border-white/10">
          {(['all', 'active', 'scheduled', 'disabled', 'expired'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <span>{st}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === st ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/10 text-slate-400'
              }`}>
                {counts[st]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search message, title, link..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#06080d] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Announcement Records Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden bg-[#07090e]/90 shadow-2xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs font-mono text-slate-400">Loading announcements from database...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto text-slate-500">
              <Megaphone className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No announcements found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'No announcements match your current search or status filter.'
                : 'Click "Add Announcement" above to create your first announcement.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-14 text-center">Order</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Message &amp; Title</th>
                  <th className="px-4 py-3.5">Link / Target</th>
                  <th className="px-4 py-3.5 text-center">Priority</th>
                  <th className="px-4 py-3.5">Schedule</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredList.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Order Controls */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {item.sortOrder || idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(idx, 'down')}
                          disabled={idx === filteredList.length - 1}
                          className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {renderStatusBadge(item.computedStatus)}
                    </td>

                    {/* Message & Title */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5 max-w-md">
                        <div className="flex items-center gap-1.5">
                          <span className="text-cyan-400 font-bold">{item.icon || '✦'}</span>
                          <span className="font-semibold text-white text-sm line-clamp-1">
                            {item.message}
                          </span>
                        </div>
                        {item.title && (
                          <div className="text-[11px] font-mono text-slate-400 line-clamp-1">
                            Title: {item.title}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Link / Target */}
                    <td className="px-4 py-3.5">
                      {item.linkUrl ? (
                        <div className="space-y-0.5 max-w-xs">
                          <a
                            href={item.linkUrl}
                            target={item.linkUrl.startsWith('http') ? '_blank' : '_self'}
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 hover:underline font-mono text-xs truncate max-w-full"
                          >
                            <span className="truncate">{item.linkText || item.linkUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                          </a>
                          {item.linkText && (
                            <div className="text-[10px] font-mono text-slate-500 truncate">
                              URL: {item.linkUrl}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs italic">No Link</span>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3.5 text-center font-mono font-semibold text-xs">
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-300">
                        {item.priority || 0}
                      </span>
                    </td>

                    {/* Schedule */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {item.startAt || item.endAt ? (
                        <div className="space-y-0.5 font-mono text-[11px]">
                          {item.startAt && (
                            <div className="text-slate-400">
                              Start: {new Date(item.startAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          )}
                          {item.endAt && (
                            <div className="text-amber-400/90">
                              End: {new Date(item.endAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">Immediate / Ongoing</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            item.active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                          title={item.active ? 'Disable Announcement' : 'Enable Announcement'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all cursor-pointer"
                          title="Edit Announcement"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL WITH LIVE TICKER PREVIEW */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl bg-[#090b10] border border-cyan-500/30 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold font-display text-white">
                  {editingItem ? 'Edit Announcement' : 'Create New Announcement'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 font-sans text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* LIVE ANNOUNCEMENT PREVIEW */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Live Ticker Preview
                </label>
                <div className="p-3 rounded-xl bg-[#03050a] border border-cyan-500/30 shadow-inner">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    <div className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-200 truncate">
                      <span>{formIcon || '✦'}</span>
                      <span className="font-semibold text-white">
                        {formMessage || 'Your announcement message will appear here...'}
                      </span>
                      {formLinkUrl && (
                        <span className="text-cyan-300 underline underline-offset-2 decoration-cyan-500/50 ml-1">
                          {formLinkText || 'Learn More →'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Message (Required) */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Announcement Message <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="e.g. New opportunities are available"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#05060a] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Title & Icon Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-bold mb-1">
                    Internal Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Program Opportunities Promo"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#05060a] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Prefix Icon
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={4}
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value)}
                      className="w-14 text-center px-2 py-2.5 rounded-xl bg-[#05060a] border border-white/10 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex flex-wrap gap-1">
                      {COMMON_ICONS.slice(0, 5).map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => setFormIcon(ic)}
                          className={`w-6 h-6 rounded-md text-xs flex items-center justify-center transition-all ${
                            formIcon === ic
                              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Link URL & Link Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Link URL (Relative or https://)
                  </label>
                  <input
                    type="text"
                    value={formLinkUrl}
                    onChange={(e) => setFormLinkUrl(e.target.value)}
                    placeholder="e.g. /opportunities or https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#05060a] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Link CTA Text
                  </label>
                  <input
                    type="text"
                    value={formLinkText}
                    onChange={(e) => setFormLinkText(e.target.value)}
                    placeholder="e.g. Explore Now →"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#05060a] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Priority & Sort Order & Active */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Priority (Higher shows first)
                  </label>
                  <input
                    type="number"
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#05060a] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#05060a] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="pt-5">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="font-bold text-slate-200">Active / Published</span>
                  </label>
                </div>
              </div>

              {/* Scheduling Start & End Date/Time */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold font-mono text-[11px] uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Optional Scheduling Window</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      Start Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formStartAt}
                      onChange={(e) => setFormStartAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#05060a] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      End / Expiration Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formEndAt}
                      onChange={(e) => setFormEndAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#05060a] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingItem ? 'Save Changes' : 'Create Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-[#090b10] border border-red-500/30 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Announcement?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs space-y-1">
              <p className="font-semibold text-slate-200 line-clamp-2">
                &ldquo;{itemToDelete.message}&rdquo;
              </p>
              {itemToDelete.linkUrl && (
                <p className="text-[11px] font-mono text-cyan-400 truncate">
                  Link: {itemToDelete.linkUrl}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs shadow-lg shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
