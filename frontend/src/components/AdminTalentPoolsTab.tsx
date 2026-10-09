import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vote,
  Plus,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  PauseCircle,
  PlayCircle,
  Archive,
  Trash2,
  Copy,
  Edit,
  Share2,
  ExternalLink,
  Download,
  Mail,
  Check,
  X,
  AlertCircle,
  Sparkles,
  Layers,
  ChevronRight,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { poolApi, PoolItem, PoolOptionItem, PoolResponseItem } from '../services/poolApi';
import { PoolShareModal } from './pool/PoolShareModal';

export const AdminTalentPoolsTab: React.FC = () => {
  const [pools, setPools] = useState<PoolItem[]>([]);
  const [summary, setSummary] = useState({
    total_pools: 0,
    active_pools: 0,
    draft_pools: 0,
    paused_pools: 0,
    closed_pools: 0,
    total_responses: 0,
  });

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Share Modal State
  const [sharingPool, setSharingPool] = useState<PoolItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Pool Create / Edit Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<PoolItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('AI Data Solutions');
  const [formAllowMultiple, setFormAllowMultiple] = useState(false);
  const [formStatus, setFormStatus] = useState('draft');
  const [formOptions, setFormOptions] = useState<string[]>(['', '']);
  const [isSavingPool, setIsSavingPool] = useState(false);

  // Response Viewer State
  const [selectedPoolForResponses, setSelectedPoolForResponses] = useState<PoolItem | null>(null);
  const [poolResponses, setPoolResponses] = useState<PoolResponseItem[]>([]);
  const [optionPills, setOptionPills] = useState<Array<{ id: string; option_text: string; count: number }>>([]);
  const [selectedOptionFilter, setSelectedOptionFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [responseSearch, setResponseSearch] = useState<string>('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isResponsesLoading, setIsResponsesLoading] = useState(false);
  const [emailSeparator, setEmailSeparator] = useState<',' | ';'>(';');

  // Action confirmations
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadPools = async () => {
    setIsLoading(true);
    try {
      const res = await poolApi.getAdminPools({
        status: statusFilter,
        search: searchQuery,
      });
      if (res.success) {
        setPools(res.pools || []);
        if (res.summary) setSummary(res.summary);
      }
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to load talent pools.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPools();
  }, [statusFilter, searchQuery]);

  // Handle Create / Edit Open
  const handleOpenEditor = (pool?: PoolItem) => {
    if (pool) {
      setEditingPool(pool);
      setFormTitle(pool.title);
      setFormDesc(pool.description || '');
      setFormCategory(pool.category || 'General');
      setFormAllowMultiple(pool.allow_multiple);
      setFormStatus(pool.status);
      setFormOptions(pool.options?.map((o) => o.option_text) || ['', '']);
    } else {
      setEditingPool(null);
      setFormTitle('');
      setFormDesc('');
      setFormCategory('AI Data Solutions');
      setFormAllowMultiple(false);
      setFormStatus('published');
      setFormOptions(['', '']);
    }
    setIsEditorOpen(true);
  };

  // Handle Save Pool
  const handleSavePool = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOptions = formOptions.map((o) => o.trim()).filter(Boolean);

    if (!formTitle.trim()) {
      showToast('error', 'Please enter a pool question.');
      return;
    }

    if (cleanOptions.length < 2) {
      showToast('error', 'Please provide at least 2 response options.');
      return;
    }

    setIsSavingPool(true);
    try {
      if (editingPool) {
        await poolApi.updatePool(editingPool.id, {
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          category: formCategory.trim(),
          allowMultiple: formAllowMultiple,
          status: formStatus,
          options: cleanOptions.map((text, idx) => ({ text, sort_order: idx })),
        });
        showToast('success', 'Talent Pool updated successfully.');
      } else {
        await poolApi.createPool({
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          category: formCategory.trim(),
          allowMultiple: formAllowMultiple,
          status: formStatus,
          options: cleanOptions,
        });
        showToast('success', 'Talent Pool created and published.');
      }
      setIsEditorOpen(false);
      loadPools();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to save pool.');
    } finally {
      setIsSavingPool(false);
    }
  };

  // Handle Quick Status Change
  const handleStatusChange = async (pool: PoolItem, newStatus: string) => {
    try {
      await poolApi.updatePoolStatus(pool.id, newStatus);
      showToast('success', `Pool status updated to ${newStatus}.`);
      loadPools();
    } catch (err: any) {
      showToast('error', 'Failed to update pool status.');
    }
  };

  // Handle Duplicate Pool
  const handleDuplicate = async (pool: PoolItem) => {
    try {
      await poolApi.duplicatePool(pool.id);
      showToast('success', `Pool "${pool.title}" cloned as draft.`);
      loadPools();
    } catch (err: any) {
      showToast('error', 'Failed to clone pool.');
    }
  };

  // Handle Delete Pool
  const handleDelete = async (poolId: string) => {
    try {
      await poolApi.deletePool(poolId);
      showToast('success', 'Pool archived successfully.');
      setDeleteConfirmId(null);
      loadPools();
    } catch (err: any) {
      showToast('error', 'Failed to archive pool.');
    }
  };

  // Open Responses Viewer
  const handleOpenResponses = async (pool: PoolItem) => {
    setSelectedPoolForResponses(pool);
    setSelectedOptionFilter('all');
    setSelectedTypeFilter('all');
    setResponseSearch('');
    setSelectedEmails(new Set());
    setIsResponsesLoading(true);

    try {
      const res = await poolApi.getPoolResponses(pool.id);
      if (res.success) {
        setPoolResponses(res.responses || []);
        setOptionPills(res.options || []);
      }
    } catch (err) {
      showToast('error', 'Failed to load pool responses.');
    } finally {
      setIsResponsesLoading(false);
    }
  };

  // Refresh responses inside modal
  const reloadResponses = async () => {
    if (!selectedPoolForResponses) return;
    setIsResponsesLoading(true);
    try {
      const res = await poolApi.getPoolResponses(selectedPoolForResponses.id, {
        optionId: selectedOptionFilter,
        participantType: selectedTypeFilter,
        search: responseSearch,
      });
      if (res.success) {
        setPoolResponses(res.responses || []);
        setOptionPills(res.options || []);
      }
    } catch (err) {
      showToast('error', 'Failed to filter responses.');
    } finally {
      setIsResponsesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPoolForResponses) {
      reloadResponses();
    }
  }, [selectedOptionFilter, selectedTypeFilter, responseSearch]);

  // Toggle Email Selection
  const toggleSelectEmail = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const selectAllVisibleEmails = () => {
    const all = new Set(poolResponses.map((r) => r.email).filter(Boolean));
    setSelectedEmails(all);
  };

  const deselectAllEmails = () => {
    setSelectedEmails(new Set());
  };

  // Copy Emails to Clipboard
  const handleCopyEmails = () => {
    const list = Array.from(selectedEmails);
    if (list.length === 0) {
      showToast('error', 'Please select at least one respondent to copy emails.');
      return;
    }
    const sep = emailSeparator === ';' ? '; ' : ', ';
    const text = list.join(sep);
    navigator.clipboard.writeText(text);
    showToast('success', `${list.length} email(s) copied to clipboard!`);
  };

  // Master Download as Excel
  const handleExportExcel = async (pool: PoolItem) => {
    try {
      const res = await poolApi.exportPoolResponses(pool.id);
      if (!res.success || !res.data || res.data.length === 0) {
        showToast('error', 'No responses to export for this pool.');
        return;
      }

      const ExcelJSModule = await import('exceljs');
      const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ZENEMOO AI Data Solutions';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Responses');

      // Setup Columns
      const headers = Object.keys(res.data[0]);
      worksheet.columns = headers.map((key) => ({
        header: key,
        key: key,
        width: Math.max(15, key.length + 5),
      }));

      // Header Row Style
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add Data Rows
      res.data.forEach((row) => {
        worksheet.addRow(row);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Zenemoo_Pool_${pool.public_id}_Responses_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Master Excel file exported successfully.');
    } catch (err: any) {
      showToast('error', 'Failed to export responses.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2 text-xs font-semibold ${
              toastMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Vote className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">Talent Pools & Quick Interest</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create lightweight WhatsApp-style interest polls and extract ready-to-contact email batches.
          </p>
        </div>

        <button
          onClick={() => handleOpenEditor()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wide transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Pool</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl border border-white/10 bg-[#0d1022]/80 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Pools</span>
          <p className="text-2xl font-bold text-white">{summary.total_pools}</p>
        </div>
        <div className="p-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/15 space-y-1">
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Active Published</span>
          <p className="text-2xl font-bold text-cyan-300">{summary.active_pools}</p>
        </div>
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/15 space-y-1">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Total Responses</span>
          <p className="text-2xl font-bold text-emerald-300">{summary.total_responses}</p>
        </div>
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-950/15 space-y-1">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Drafts / Paused</span>
          <p className="text-2xl font-bold text-amber-300">{summary.draft_pools + summary.paused_pools}</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d1022]/60 p-3 rounded-2xl border border-white/10">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'published', label: 'Published' },
            { id: 'draft', label: 'Drafts' },
            { id: 'paused', label: 'Paused' },
            { id: 'closed', label: 'Closed' },
            { id: 'archived', label: 'Archived' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                statusFilter === tab.id
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search questions or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Pools Table / Cards List */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
          <span>Loading talent pools...</span>
        </div>
      ) : pools.length === 0 ? (
        <div className="py-16 text-center border border-white/10 rounded-2xl bg-[#0d1022]/40">
          <Vote className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Talent Pools Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {statusFilter !== 'all' ? `No pools with status "${statusFilter}".` : 'Get started by creating your first quick talent poll.'}
          </p>
          <button
            onClick={() => handleOpenEditor()}
            className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Pool</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pools.map((pool) => (
            <div
              key={pool.id}
              className="p-5 rounded-2xl border border-white/10 bg-[#0d1022] hover:border-white/20 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-lg"
            >
              {/* Pool Info */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      pool.status === 'published'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : pool.status === 'draft'
                        ? 'bg-slate-800 border-white/10 text-slate-300'
                        : pool.status === 'paused'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : pool.status === 'closed'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                    }`}
                  >
                    {pool.status}
                  </span>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10">
                    {pool.category || 'General'}
                  </span>

                  <span className="text-xs font-mono text-cyan-400 font-semibold">
                    /pool/{pool.public_id}
                  </span>

                  <span className="text-[11px] text-slate-500">
                    {pool.allow_multiple ? '• Multiple Choice' : '• Single Choice'}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">{pool.title}</h3>
                {pool.description && (
                  <p className="text-xs text-slate-400 line-clamp-1">{pool.description}</p>
                )}

                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Users className="w-3.5 h-3.5" />
                    <span>{pool.total_responses_count} Responses</span>
                  </span>
                  <span>•</span>
                  <span>{pool.options?.length || 0} Options</span>
                  <span>•</span>
                  <span>Created {pool.created_at ? new Date(pool.created_at).toLocaleDateString('en-IN') : 'N/A'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-white/10">
                {/* View Responses Button */}
                <button
                  onClick={() => handleOpenResponses(pool)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Responses ({pool.total_responses_count})</span>
                </button>

                {/* Status Toggle Buttons */}
                {pool.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange(pool, 'published')}
                    className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                    title="Publish live to public"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Publish</span>
                  </button>
                )}

                {pool.status === 'published' && (
                  <button
                    onClick={() => handleStatusChange(pool, 'paused')}
                    className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1"
                    title="Pause submissions temporarily"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                )}

                {pool.status === 'paused' && (
                  <button
                    onClick={() => handleStatusChange(pool, 'published')}
                    className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                    title="Resume submissions"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                )}

                {/* Edit Button */}
                <button
                  onClick={() => handleOpenEditor(pool)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs transition-colors"
                  title="Edit Pool"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                {/* Duplicate Button */}
                <button
                  onClick={() => handleDuplicate(pool)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs transition-colors"
                  title="Clone as Draft"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Master Export Button */}
                <button
                  onClick={() => handleExportExcel(pool)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs transition-colors"
                  title="Download Master Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* 1-Click Option Links Share Modal Trigger */}
                <button
                  onClick={() => {
                    setSharingPool(pool);
                    setIsShareModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs transition-colors cursor-pointer"
                  title="Share Pool (Preview & WhatsApp)"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                {/* Delete / Archive */}
                {deleteConfirmId === pool.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(pool.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-1.5 rounded-lg border border-white/10 text-slate-400 text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(pool.id)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition-colors"
                    title="Archive Pool"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE / EDIT POOL MODAL ── */}
      <AnimatePresence>
        {isEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-[#0d1024] border border-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Edit className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {editingPool ? 'Edit Talent Pool' : 'Create New Talent Pool'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePool} className="space-y-4">
                {/* Question Title */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1.5">
                    Pool Question / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Which type of AI work are you available for?"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 focus:border-cyan-400 text-sm text-white placeholder-slate-500 outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Description / Project Scope (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide brief guidance or project requirements..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 focus:border-cyan-400 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                {/* Category & Status & Multi-Select */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Category</label>
                    <input
                      type="text"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      placeholder="e.g. Speech, Translation, Vision"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Initial Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white outline-none focus:border-cyan-400"
                    >
                      <option value="published">Published (Live)</option>
                      <option value="draft">Draft (Private)</option>
                      <option value="paused">Paused</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Selection Mode</label>
                    <select
                      value={formAllowMultiple ? 'true' : 'false'}
                      onChange={(e) => setFormAllowMultiple(e.target.value === 'true')}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white outline-none focus:border-cyan-400"
                    >
                      <option value="false">Single Choice (1 Option)</option>
                      <option value="true">Multiple Choice (Checkboxes)</option>
                    </select>
                  </div>
                </div>

                {/* Options Builder */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                      Answer Options (At least 2)
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormOptions((prev) => [...prev, ''])}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Option</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 text-center text-xs font-mono text-slate-500">{idx + 1}.</span>
                        <input
                          type="text"
                          required
                          placeholder={`e.g. Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormOptions((prev) => {
                              const copy = [...prev];
                              copy[idx] = val;
                              return copy;
                            });
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/15 focus:border-cyan-400 text-xs text-white outline-none"
                        />
                        {formOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setFormOptions((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPool}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPool && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingPool ? 'Update Pool' : 'Create & Launch'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RESPONSES & GROUP EMAIL DRAWER / MODAL ── */}
      <AnimatePresence>
        {selectedPoolForResponses && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-5xl bg-[#0b0e20] border border-cyan-500/30 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-4 max-h-[92vh] flex flex-col"
            >
              {/* Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedPoolForResponses.title}</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Pool Public ID: #{selectedPoolForResponses.public_id} • Total Responses: {poolResponses.length}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPoolForResponses(null)}
                  className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Option Filter Pills Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedOptionFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all ${
                    selectedOptionFilter === 'all'
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  All Options ({optionPills.reduce((acc, o) => acc + o.count, 0)})
                </button>
                {optionPills.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOptionFilter(opt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all ${
                      selectedOptionFilter === opt.id
                        ? 'bg-cyan-500 text-black shadow-md'
                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {opt.option_text} ({opt.count})
                  </button>
                ))}
              </div>

              {/* Toolbar: Participant Filter, Search, Bulk Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedTypeFilter}
                    onChange={(e) => setSelectedTypeFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-xs text-white outline-none"
                  >
                    <option value="all">All Participant Types</option>
                    <option value="Individual">Individual</option>
                    <option value="Vendor / Agency">Vendor / Agency</option>
                    <option value="Team Leader">Team Leader</option>
                    <option value="Other">Other</option>
                  </select>

                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search respondents..."
                      value={responseSearch}
                      onChange={(e) => setResponseSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                {/* Bulk Email Copy Controls */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={selectAllVisibleEmails}
                    className="px-2.5 py-1.5 rounded-lg border border-white/10 text-[11px] text-slate-300 hover:bg-white/5"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllEmails}
                    className="px-2.5 py-1.5 rounded-lg border border-white/10 text-[11px] text-slate-400 hover:bg-white/5"
                  >
                    Clear
                  </button>

                  <div className="flex items-center rounded-lg border border-white/10 bg-slate-950 p-0.5 text-[11px]">
                    <button
                      onClick={() => setEmailSeparator(';')}
                      className={`px-2 py-1 rounded ${emailSeparator === ';' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400'}`}
                      title="Semicolon separator (Outlook format)"
                    >
                      ;
                    </button>
                    <button
                      onClick={() => setEmailSeparator(',')}
                      className={`px-2 py-1 rounded ${emailSeparator === ',' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400'}`}
                      title="Comma separator (Gmail format)"
                    >
                      ,
                    </button>
                  </div>

                  <button
                    onClick={handleCopyEmails}
                    disabled={selectedEmails.size === 0}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-40 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Copy {selectedEmails.size > 0 ? selectedEmails.size : ''} Emails</span>
                  </button>
                </div>
              </div>

              {/* Table of Respondents */}
              <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60">
                {isResponsesLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    <span>Filtering respondents...</span>
                  </div>
                ) : poolResponses.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <span>No responses matching this filter.</span>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="sticky top-0 bg-[#0d1024] text-slate-400 font-semibold border-b border-white/10 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={poolResponses.length > 0 && selectedEmails.size === poolResponses.length}
                            onChange={(e) => (e.target.checked ? selectAllVisibleEmails() : deselectAllEmails())}
                            className="rounded accent-cyan-400 cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Respondent Name</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Participant Type</th>
                        <th className="p-3">Selected Choice</th>
                        <th className="p-3">Submitted Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {poolResponses.map((r) => {
                        const isSelected = selectedEmails.has(r.email);
                        return (
                          <tr
                            key={r.id}
                            onClick={() => toggleSelectEmail(r.email)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-cyan-500/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectEmail(r.email)}
                                className="rounded accent-cyan-400 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-semibold text-white">{r.name}</td>
                            <td className="p-3 font-mono text-cyan-300">{r.email}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-slate-300">
                                {r.participant_type}
                              </span>
                            </td>
                            <td className="p-3 text-emerald-300 font-medium">
                              {r.selected_choice || r.option_text || 'N/A'}
                            </td>
                            <td className="p-3 text-slate-400 text-[11px]">
                              {r.submitted_at || r.created_at ? new Date(r.submitted_at || r.created_at).toLocaleDateString('en-IN') : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Bottom Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                <span className="text-slate-400">
                  Total Visible: <strong>{poolResponses.length}</strong> | Selected:{' '}
                  <strong className="text-cyan-400">{selectedEmails.size}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (selectedPoolForResponses) {
                        setSharingPool(selectedPoolForResponses);
                        setIsShareModalOpen(true);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl border border-cyan-500/30 hover:border-cyan-500/60 bg-cyan-500/10 text-cyan-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Share 1-Click Message</span>
                  </button>

                  <button
                    onClick={() => handleExportExcel(selectedPoolForResponses)}
                    className="px-3.5 py-2 rounded-xl border border-white/15 hover:border-cyan-500/30 text-slate-300 hover:text-white bg-white/5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download Master Excel</span>
                  </button>

                  <button
                    onClick={() => setSelectedPoolForResponses(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1-Click Option Links Share Modal ── */}
      <PoolShareModal
        isOpen={isShareModalOpen}
        pool={sharingPool}
        onClose={() => {
          setIsShareModalOpen(false);
          setSharingPool(null);
        }}
      />
    </div>
  );
};
