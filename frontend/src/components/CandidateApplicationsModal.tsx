import React, { useState, useMemo, useEffect, useDeferredValue, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  X,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Eye,
  Edit,
  Globe,
  Smartphone,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Calendar,
  RotateCcw
} from 'lucide-react';
import {
  CandidateApplication,
  getStoredCandidateApplications,
  updateCandidateApplicationStatus,
  deleteCandidateApplication,
  resyncSingleCandidateApplication,
  resyncOpportunityApplicationsBulk,
  resendCandidateAcceptanceEmail
} from '../lib/opportunityApplicationStore';
import { OpportunityProgram } from '../lib/opportunityStore';
import { ExportButton } from './ExportButton';

export interface CandidateApplicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOpp: OpportunityProgram | null;
  allCandidateApps: CandidateApplication[];
  onUpdateApps: (updatedList: CandidateApplication[]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// ----------------------------------------------------------------------
// MEMOIZED CUSTOM ANSWER CHIP COMPONENT (Prevents re-renders during filter/typing)
// ----------------------------------------------------------------------
const CustomAnswerChip = React.memo<{ answerKey: string; val: any }>(({ answerKey, val }) => {
  const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
  const keyLower = answerKey.toLowerCase();

  let IconComp = FileText;
  if (keyLower.includes('time') || keyLower.includes('hour') || keyLower.includes('commitment')) {
    IconComp = Clock;
  } else if (keyLower.includes('language') || keyLower.includes('lang')) {
    IconComp = Globe;
  } else if (keyLower.includes('smart') || keyLower.includes('phone') || keyLower.includes('internet') || keyLower.includes('wifi')) {
    IconComp = Smartphone;
  }

  return (
    <div className="flex items-start gap-1.5 text-[11px] bg-white/[0.04] px-2 py-1 rounded-lg border border-white/10 text-slate-300">
      <IconComp className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
      <div className="leading-tight">
        <span className="text-slate-400 font-semibold">{answerKey}: </span>
        <span className="text-emerald-300 font-bold">{displayVal}</span>
      </div>
    </div>
  );
});

CustomAnswerChip.displayName = 'CustomAnswerChip';

// ----------------------------------------------------------------------
// MEMOIZED DESKTOP TABLE ROW COMPONENT (With CSS Containment & Pre-formatted Dates)
// ----------------------------------------------------------------------
interface TableRowProps {
  app: CandidateApplication;
  resyncingId: string | null;
  resendingEmailId: string | null;
  onView: (app: CandidateApplication) => void;
  onEditNotes: (app: CandidateApplication) => void;
  onDeleteConfirm: (app: CandidateApplication) => void;
  onStatusChange: (app: CandidateApplication, newStatus: string) => void;
  onSingleResync: (app: CandidateApplication) => void;
  onResendEmail: (app: CandidateApplication) => void;
}

const CandidateTableRow = React.memo<TableRowProps>(({
  app,
  resyncingId,
  resendingEmailId,
  onView,
  onEditNotes,
  onDeleteConfirm,
  onStatusChange,
  onSingleResync,
  onResendEmail,
}) => {
  const formattedId = app.applicant_id || `APP-2026-${app.id.substring(0, 4)}`;

  const formattedDate = useMemo(() => {
    if (!app.created_at) return 'N/A';
    try {
      return new Date(app.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) {
      return app.created_at;
    }
  }, [app.created_at]);

  const answerEntries = useMemo(() => {
    return Object.entries(app.answers || {});
  }, [app.answers]);

  return (
    <tr className="hover:bg-white/[0.02]" style={{ contain: 'layout paint' }}>
      {/* Application ID */}
      <td className="p-4 font-bold font-mono text-cyan-400 text-xs whitespace-nowrap">
        <button
          type="button"
          onClick={() => onView(app)}
          className="hover:underline flex items-center gap-1 cursor-pointer"
          title="Click to view full application details"
        >
          <span>{formattedId}</span>
        </button>
      </td>

      {/* Applicant Name */}
      <td className="p-4 font-bold text-white font-sans text-sm whitespace-nowrap">
        {app.applicant_name}
      </td>

      {/* Contact Info */}
      <td className="p-4 space-y-1 text-[11px] whitespace-nowrap">
        <div className="text-cyan-300 font-mono font-medium">{app.applicant_email}</div>
        <div className="text-slate-400 font-mono">{app.applicant_phone}</div>
      </td>

      {/* Custom Form Answers */}
      <td className="p-4 max-w-xs">
        {answerEntries.length === 0 ? (
          <span className="text-slate-500 italic text-[11px]">No custom responses</span>
        ) : (
          <div className="space-y-1.5">
            {answerEntries.slice(0, 3).map(([k, v]) => (
              <CustomAnswerChip key={k} answerKey={k} val={v} />
            ))}
            {answerEntries.length > 3 && (
              <button
                type="button"
                onClick={() => onView(app)}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono font-semibold cursor-pointer"
              >
                +{answerEntries.length - 3} more response(s)
              </button>
            )}
          </div>
        )}
      </td>

      {/* Sheet Sync */}
      <td className="p-4 font-mono text-[11px] whitespace-nowrap">
        <div className="flex items-center gap-2">
          {app.sync_status === 'synced' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]" title="Synced to Google Sheets">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Synced
            </span>
          ) : app.sync_status === 'failed' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 font-bold text-[10px]" title={app.sync_error || 'Google Sheets sync failed'}>
              <XCircle className="w-3 h-3 text-red-400" /> Failed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-[10px]" title="Sync Pending">
              <Clock className="w-3 h-3 text-amber-400" /> Pending
            </span>
          )}

          {/* Manual Resync Button */}
          <button
            type="button"
            disabled={resyncingId === app.id}
            onClick={() => onSingleResync(app)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-white/10 text-[10px] cursor-pointer"
            title="Manual Resync to Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resyncingId === app.id ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </td>

      {/* Status Dropdown & Email Indicator */}
      <td className="p-4 whitespace-nowrap">
        <select
          value={app.status}
          onChange={(e) => onStatusChange(app, e.target.value)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase focus:outline-none cursor-pointer ${
            app.status === 'accepted'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : app.status === 'shortlisted'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : app.status === 'rejected'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}
        >
          <option value="pending" className="bg-slate-900 text-amber-400">PENDING</option>
          <option value="shortlisted" className="bg-slate-900 text-cyan-400">SHORTLISTED</option>
          <option value="accepted" className="bg-slate-900 text-emerald-400">ACCEPTED</option>
          <option value="rejected" className="bg-slate-900 text-red-400">REJECTED</option>
        </select>

        {/* Acceptance Email Status Sub-Badge */}
        {app.status === 'accepted' && (
          <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px]">
            {app.acceptance_email_status === 'sent' ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1" title={app.acceptance_email_sent_at ? `Sent on ${new Date(app.acceptance_email_sent_at).toLocaleString()}` : 'Email Sent'}>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ✓ Email Sent
              </span>
            ) : app.acceptance_email_status === 'sending' || resendingEmailId === app.id ? (
              <span className="text-blue-400 font-medium flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" /> Sending Email...
              </span>
            ) : app.acceptance_email_status === 'failed' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-red-400 font-medium flex items-center gap-1" title={app.acceptance_email_error || 'Delivery failed'}>
                  <AlertCircle className="w-3 h-3 text-red-400" /> Email Failed
                </span>
                <button
                  type="button"
                  onClick={() => onResendEmail(app)}
                  className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 cursor-pointer font-sans text-[10px]"
                >
                  Retry
                </button>
              </div>
            ) : (
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Email Pending
              </span>
            )}
          </div>
        )}
      </td>

      {/* Date */}
      <td className="p-4 text-[11px] text-slate-400 font-mono whitespace-nowrap">
        {formattedDate}
      </td>

      {/* Actions */}
      <td className="p-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {/* View Button */}
          <button
            type="button"
            onClick={() => onView(app)}
            className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 cursor-pointer"
            title="View Full Application"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Edit Notes Button */}
          <button
            type="button"
            onClick={() => onEditNotes(app)}
            className="p-2 rounded-xl bg-white/5 hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 border border-white/10 cursor-pointer"
            title="Edit Admin Notes"
          >
            <Edit className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => onDeleteConfirm(app)}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
            title="Delete Candidate Application"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

CandidateTableRow.displayName = 'CandidateTableRow';

// ----------------------------------------------------------------------
// MEMOIZED MOBILE CARD COMPONENT
// ----------------------------------------------------------------------
const CandidateMobileCard = React.memo<TableRowProps>(({
  app,
  resyncingId,
  resendingEmailId,
  onView,
  onEditNotes,
  onDeleteConfirm,
  onStatusChange,
  onSingleResync,
}) => {
  const formattedId = app.applicant_id || `APP-2026-${app.id.substring(0, 4)}`;

  const formattedDate = useMemo(() => {
    if (!app.created_at) return 'Today';
    try {
      return new Date(app.created_at).toLocaleDateString();
    } catch (e) {
      return app.created_at;
    }
  }, [app.created_at]);

  const answerEntries = useMemo(() => {
    return Object.entries(app.answers || {});
  }, [app.answers]);

  return (
    <div
      className="p-4 rounded-2xl border border-white/10 bg-[#0d121f] space-y-3.5"
      style={{ contain: 'layout paint' }}
    >
      {/* Top Row: ID, Status, Date */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <span className="font-mono text-xs font-bold text-cyan-400 block">{formattedId}</span>
          <span className="text-[10px] font-mono text-slate-400">{formattedDate}</span>
        </div>

        {/* Interactive Status Selector */}
        <select
          value={app.status}
          onChange={(e) => onStatusChange(app, e.target.value)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase focus:outline-none cursor-pointer ${
            app.status === 'accepted'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : app.status === 'shortlisted'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : app.status === 'rejected'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}
        >
          <option value="pending" className="bg-slate-900 text-amber-400">PENDING</option>
          <option value="shortlisted" className="bg-slate-900 text-cyan-400">SHORTLISTED</option>
          <option value="accepted" className="bg-slate-900 text-emerald-400">ACCEPTED</option>
          <option value="rejected" className="bg-slate-900 text-red-400">REJECTED</option>
        </select>
      </div>

      {/* Middle: Applicant Info */}
      <div className="space-y-1">
        <h4 className="text-base font-bold text-white">{app.applicant_name}</h4>
        <div className="text-xs font-mono text-cyan-300">{app.applicant_email}</div>
        <div className="text-xs font-mono text-slate-400">{app.applicant_phone}</div>
      </div>

      {/* Sheet Sync & Email status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          {app.sync_status === 'synced' ? (
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
              Synced
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-[10px]">
              {app.sync_status || 'Pending'}
            </span>
          )}
          <button
            type="button"
            disabled={resyncingId === app.id}
            onClick={() => onSingleResync(app)}
            className="p-1 rounded bg-white/5 text-slate-400 text-[10px] cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${resyncingId === app.id ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {app.status === 'accepted' && (
          <span className="text-[10px] font-mono text-emerald-400 font-medium">
            {app.acceptance_email_status === 'sent' ? '✓ Email Sent' : 'Email Pending'}
          </span>
        )}
      </div>

      {/* Custom Answers Chips */}
      {answerEntries.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-white/5">
          {answerEntries.slice(0, 2).map(([k, v]) => (
            <CustomAnswerChip key={k} answerKey={k} val={v} />
          ))}
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onView(app)}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-cyan-300 border border-white/10 text-xs font-mono flex items-center gap-1 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </button>
        <button
          type="button"
          onClick={() => onEditNotes(app)}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-purple-300 border border-white/10 text-xs font-mono flex items-center gap-1 cursor-pointer"
        >
          <Edit className="w-3.5 h-3.5" /> Notes
        </button>
        <button
          type="button"
          onClick={() => onDeleteConfirm(app)}
          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </div>
  );
});

CandidateMobileCard.displayName = 'CandidateMobileCard';

// ----------------------------------------------------------------------
// MAIN CANDIDATE APPLICATIONS DASHBOARD MODAL
// ----------------------------------------------------------------------
export const CandidateApplicationsModal: React.FC<CandidateApplicationsModalProps> = ({
  isOpen,
  onClose,
  selectedOpp,
  allCandidateApps,
  onUpdateApps,
  showToast
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'shortlisted' | 'accepted' | 'rejected'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Action Modals State
  const [deleteConfirmApp, setDeleteConfirmApp] = useState<CandidateApplication | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [bulkSyncConfirmOpen, setBulkSyncConfirmOpen] = useState(false);
  const [isSyncingBulk, setIsSyncingBulk] = useState(false);

  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  const [viewDetailApp, setViewDetailApp] = useState<CandidateApplication | null>(null);
  const [editNotesApp, setEditNotesApp] = useState<CandidateApplication | null>(null);
  const [adminNoteText, setAdminNoteText] = useState('');

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, statusFilter, dateFilter, startDate, endDate, pageSize, selectedOpp]);

  // 1. Applications belonging to current program
  const programApps = useMemo(() => {
    if (!selectedOpp) return [];
    return (allCandidateApps || []).filter((a) => a.opportunity_id === selectedOpp.id);
  }, [allCandidateApps, selectedOpp]);

  // 2. Fast single-pass summary counts
  const summaryCounts = useMemo(() => {
    let total = 0;
    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    let shortlisted = 0;

    for (let i = 0; i < programApps.length; i++) {
      total++;
      const st = programApps[i].status;
      if (st === 'pending') pending++;
      else if (st === 'accepted') accepted++;
      else if (st === 'rejected') rejected++;
      else if (st === 'shortlisted') shortlisted++;
    }

    return { total, pending, accepted, rejected, shortlisted };
  }, [programApps]);

  // 3. High-performance Filtered applications with deferred search
  const filteredApps = useMemo(() => {
    if (!selectedOpp) return [];

    const q = deferredSearchQuery.toLowerCase().trim();
    const hasSearch = q !== '';
    const now = new Date();
    const nowTime = now.getTime();

    let startMs = 0;
    let endMs = 0;
    if (dateFilter === 'custom') {
      if (startDate) startMs = new Date(startDate).getTime();
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        endMs = e.getTime();
      }
    }

    return programApps.filter((app) => {
      // Status filter
      if (statusFilter !== 'all' && app.status !== statusFilter) {
        return false;
      }

      // Search query filter
      if (hasSearch) {
        const appId = (app.applicant_id || `APP-2026-${app.id.substring(0, 4)}`).toLowerCase();
        const name = (app.applicant_name || '').toLowerCase();
        const email = (app.applicant_email || '').toLowerCase();
        const phone = (app.applicant_phone || '').toLowerCase();

        if (!name.includes(q) && !email.includes(q) && !phone.includes(q) && !appId.includes(q)) {
          return false;
        }
      }

      // Date filter
      if (dateFilter !== 'all' && app.created_at) {
        const appDate = new Date(app.created_at);
        const appTime = appDate.getTime();

        if (dateFilter === 'today') {
          const isToday =
            appDate.getDate() === now.getDate() &&
            appDate.getMonth() === now.getMonth() &&
            appDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === 'last7') {
          if (nowTime - appTime > 7 * 24 * 3600 * 1000) return false;
        } else if (dateFilter === 'last30') {
          if (nowTime - appTime > 30 * 24 * 3600 * 1000) return false;
        } else if (dateFilter === 'thisMonth') {
          const isSameMonth =
            appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
          if (!isSameMonth) return false;
        } else if (dateFilter === 'custom') {
          if (startMs && appTime < startMs) return false;
          if (endMs && appTime > endMs) return false;
        }
      }

      return true;
    });
  }, [programApps, statusFilter, deferredSearchQuery, dateFilter, startDate, endDate, selectedOpp]);

  // Early return if modal is not open
  if (!isOpen || !selectedOpp) return null;

  // Pagination calculations
  const totalFilteredCount = filteredApps.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFilteredCount);
  const paginatedApps = filteredApps.slice(startIndex, endIndex);

  // Memoized Handlers to prevent re-creating functions on every render
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    showToast('Filters cleared', 'info');
  }, [showToast]);

  const handleView = useCallback((app: CandidateApplication) => {
    setViewDetailApp(app);
  }, []);

  const handleEditNotes = useCallback((app: CandidateApplication) => {
    setEditNotesApp(app);
    setAdminNoteText(app.admin_notes || '');
  }, []);

  const handleDeleteConfirm = useCallback((app: CandidateApplication) => {
    setDeleteConfirmApp(app);
  }, []);

  const handleStatusChange = useCallback(async (app: CandidateApplication, newStatus: string) => {
    try {
      showToast(`Updating status for ${app.applicant_name}...`, 'info');
      const updatedList = await updateCandidateApplicationStatus(app.id, { status: newStatus as any });
      onUpdateApps(updatedList);
      showToast(`Updated candidate "${app.applicant_name}" status to ${newStatus.toUpperCase()}`, 'success');
    } catch (err: any) {
      showToast(`Failed to update status: ${err.message}`, 'error');
    }
  }, [onUpdateApps, showToast]);

  const handleSingleResync = useCallback(async (app: CandidateApplication) => {
    if (!selectedOpp) return;
    try {
      setResyncingId(app.id);
      showToast(`Resyncing candidate ${app.applicant_name} to Google Sheets...`, 'info');
      const res = await resyncSingleCandidateApplication(app.id);
      const updatedList = await getStoredCandidateApplications(selectedOpp.id);
      onUpdateApps(updatedList);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(`Resync failed: ${err.message}`, 'error');
    } finally {
      setResyncingId(null);
    }
  }, [selectedOpp, onUpdateApps, showToast]);

  const handleBulkResync = useCallback(async () => {
    if (!selectedOpp) return;
    try {
      setIsSyncingBulk(true);
      setBulkSyncConfirmOpen(false);
      showToast('Synchronizing applications to Google Sheets...', 'info');
      const result = await resyncOpportunityApplicationsBulk(selectedOpp.id);
      const updatedList = await getStoredCandidateApplications(selectedOpp.id);
      onUpdateApps(updatedList);
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (err: any) {
      showToast(`Bulk resync failed: ${err.message}`, 'error');
    } finally {
      setIsSyncingBulk(false);
    }
  }, [selectedOpp, onUpdateApps, showToast]);

  const handleResendEmail = useCallback(async (app: CandidateApplication) => {
    if (!selectedOpp) return;
    try {
      setResendingEmailId(app.id);
      showToast(`Resending acceptance email to ${app.applicant_email}...`, 'info');
      const res = await resendCandidateAcceptanceEmail(app.id);
      if (res.success) {
        showToast(`Resent acceptance email to ${app.applicant_email}`, 'success');
        const updatedList = await getStoredCandidateApplications(selectedOpp.id);
        onUpdateApps(updatedList);
      } else {
        showToast(`Acceptance email resend failed: ${res.message}`, 'error');
      }
    } catch (err: any) {
      showToast(`Resend failed: ${err.message}`, 'error');
    } finally {
      setResendingEmailId(null);
    }
  }, [selectedOpp, onUpdateApps, showToast]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmApp) return;
    try {
      setIsDeleting(true);
      showToast(`Deleting application for ${deleteConfirmApp.applicant_name}...`, 'info');
      const updatedList = await deleteCandidateApplication(deleteConfirmApp.id);
      onUpdateApps(updatedList);
      showToast(`Candidate application for "${deleteConfirmApp.applicant_name}" deleted`, 'success');
      setDeleteConfirmApp(null);
    } catch (err: any) {
      showToast(`Failed to delete application: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirmApp, onUpdateApps, showToast]);

  const handleSaveNotes = useCallback(async () => {
    if (!editNotesApp) return;
    try {
      showToast('Saving admin notes...', 'info');
      const updatedList = await updateCandidateApplicationStatus(editNotesApp.id, {
        admin_notes: adminNoteText
      });
      onUpdateApps(updatedList);
      showToast('Admin notes saved successfully', 'success');
      setEditNotesApp(null);
    } catch (err: any) {
      showToast(`Failed to save notes: ${err.message}`, 'error');
    }
  }, [editNotesApp, adminNoteText, onUpdateApps, showToast]);

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-[#050811]/98 flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto">
      <div className="rounded-3xl border border-cyan-500/30 w-full max-w-[1440px] my-auto space-y-5 max-h-[96vh] flex flex-col shadow-2xl shadow-cyan-500/10 bg-[#090d16] text-slate-100 overflow-hidden">
        {/* ========================================================= */}
        {/* HEADER SECTION */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 pb-4 border-b border-white/10 shrink-0 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white flex items-center gap-2.5">
                <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
                Candidate Applications
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 mt-1">
                <span className="text-slate-400 font-medium">Zenemoo</span>
                <span className="text-slate-600">•</span>
                <span className="text-white font-bold">{selectedOpp.title}</span>
                {selectedOpp.partner_name && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-cyan-400 font-mono">({selectedOpp.partner_name})</span>
                  </>
                )}
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-semibold">Applications Dashboard</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Open Google Sheet */}
              <a
                href="https://docs.google.com/spreadsheets/d/1TRWH_zKjTtEiUAmQSS0XsA6_OtKc57FtMaDMeoIfjMs/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-2 active:scale-95 cursor-pointer"
                title="Open Zenemoo Google Sheet in new tab"
              >
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                <span>Open Google Sheet</span>
              </a>

              {/* Sync All */}
              <button
                type="button"
                disabled={isSyncingBulk}
                onClick={() => setBulkSyncConfirmOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                title="Bulk sync candidate applications to Google Sheets"
              >
                <RefreshCw className={`w-4 h-4 text-purple-400 ${isSyncingBulk ? 'animate-spin' : ''}`} />
                <span>Sync All</span>
              </button>

              {/* Export Applications */}
              <ExportButton
                sectionId="candidate-applications"
                dataset={programApps.map((app) => {
                  const flat: Record<string, any> = {
                    applicant_id: app.applicant_id || `APP-2026-${app.id.substring(0, 4)}`,
                    applicant_name: app.applicant_name,
                    applicant_email: app.applicant_email,
                    applicant_phone: app.applicant_phone,
                    opportunity_title: app.opportunity_title,
                    status: app.status.toUpperCase(),
                    sync_status: app.sync_status || 'synced',
                    created_at: app.created_at || new Date().toISOString(),
                  };
                  if (app.answers && typeof app.answers === 'object') {
                    Object.entries(app.answers).forEach(([k, v]) => {
                      flat[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
                    });
                  }
                  return flat;
                })}
                filteredDataset={filteredApps.map((app) => {
                  const flat: Record<string, any> = {
                    applicant_id: app.applicant_id || `APP-2026-${app.id.substring(0, 4)}`,
                    applicant_name: app.applicant_name,
                    applicant_email: app.applicant_email,
                    applicant_phone: app.applicant_phone,
                    opportunity_title: app.opportunity_title,
                    status: app.status.toUpperCase(),
                    sync_status: app.sync_status || 'synced',
                    created_at: app.created_at || new Date().toISOString(),
                  };
                  if (app.answers && typeof app.answers === 'object') {
                    Object.entries(app.answers).forEach(([k, v]) => {
                      flat[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
                    });
                  }
                  return flat;
                })}
                label="Export"
                className="px-3.5 py-2 text-xs"
                showToast={(msg) => showToast(msg, 'info')}
              />

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer border border-white/10 ml-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SCROLLABLE DASHBOARD BODY — ISOLATED SMOOTH NATIVE SCROLL */}
        {/* ========================================================= */}
        <div
          className="p-4 sm:p-6 pt-0 space-y-6 overflow-y-auto flex-1 overscroll-contain"
          style={{ contain: 'content' }}
        >
          {/* ========================================================= */}
          {/* SEARCH AND FILTER BAR */}
          {/* ========================================================= */}
          <div className="p-4 rounded-2xl border border-white/10 bg-[#0d121f] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
              {/* Search Bar */}
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email or ID..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/15 text-white placeholder:text-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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

              {/* Status Filter */}
              <div className="lg:col-span-3">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none pr-8 font-bold"
                  >
                    <option value="all" className="bg-slate-900">All Statuses</option>
                    <option value="pending" className="bg-slate-900 text-amber-400">Pending</option>
                    <option value="shortlisted" className="bg-slate-900 text-cyan-400">Shortlisted</option>
                    <option value="accepted" className="bg-slate-900 text-emerald-400">Accepted</option>
                    <option value="rejected" className="bg-slate-900 text-red-400">Rejected</option>
                  </select>
                  <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Date Filter */}
              <div className="lg:col-span-3">
                <div className="relative">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none pr-8 font-bold"
                  >
                    <option value="all" className="bg-slate-900">Select Date Range (All Time)</option>
                    <option value="today" className="bg-slate-900">Today</option>
                    <option value="last7" className="bg-slate-900">Last 7 Days</option>
                    <option value="last30" className="bg-slate-900">Last 30 Days</option>
                    <option value="thisMonth" className="bg-slate-900">This Month</option>
                    <option value="custom" className="bg-slate-900">Custom Range...</option>
                  </select>
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="lg:col-span-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </button>
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {dateFilter === 'custom' && (
              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-3 text-xs font-mono">
                <span className="text-slate-400">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-slate-400">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* SUMMARY STAT CARDS GRID */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Applications Card */}
            <div className="p-4 sm:p-5 rounded-2xl border border-cyan-500/20 bg-[#0d121f] flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  Total Applications
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-display text-white">
                  {summaryCounts.total}
                </div>
                <p className="text-[11px] font-mono text-slate-400">All applications received</p>
              </div>
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Pending Card */}
            <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/20 bg-[#0d121f] flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Pending
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-display text-amber-300">
                  {summaryCounts.pending}
                </div>
                <p className="text-[11px] font-mono text-slate-400">Awaiting review</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* Accepted Card */}
            <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/20 bg-[#0d121f] flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Accepted
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-300">
                  {summaryCounts.accepted}
                </div>
                <p className="text-[11px] font-mono text-slate-400">Candidates accepted</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Rejected Card */}
            <div className="p-4 sm:p-5 rounded-2xl border border-red-500/20 bg-[#0d121f] flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-wider text-red-400 font-semibold flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  Rejected
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-display text-red-300">
                  {summaryCounts.rejected}
                </div>
                <p className="text-[11px] font-mono text-slate-400">Not selected</p>
              </div>
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                <XCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* DESKTOP TABLE VIEW (MD & UP) */}
          {/* ========================================================= */}
          <div className="hidden md:block">
            {filteredApps.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-white/10 bg-[#0d121f] space-y-4">
                <User className="w-12 h-12 text-slate-500 mx-auto" />
                <h4 className="text-lg font-bold text-white">No Applications Found</h4>
                <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
                  Try changing your search terms or status/date filters to view matching candidate entries.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0d121f]">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-white/[0.03] text-slate-300 border-b border-white/10 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="p-4">Application ID</th>
                      <th className="p-4">Applicant Name</th>
                      <th className="p-4">Contact Info</th>
                      <th className="p-4">Custom Form Answers</th>
                      <th className="p-4">Sheet Sync</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {paginatedApps.map((app) => (
                      <CandidateTableRow
                        key={app.id}
                        app={app}
                        resyncingId={resyncingId}
                        resendingEmailId={resendingEmailId}
                        onView={handleView}
                        onEditNotes={handleEditNotes}
                        onDeleteConfirm={handleDeleteConfirm}
                        onStatusChange={handleStatusChange}
                        onSingleResync={handleSingleResync}
                        onResendEmail={handleResendEmail}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* MOBILE APPLICATION CARDS (STACKED VIEW FOR MOBILE) */}
          {/* ========================================================= */}
          <div className="block md:hidden space-y-4">
            {filteredApps.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-white/10 bg-[#0d121f] space-y-3">
                <User className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Applications Found</h4>
                <p className="text-xs font-mono text-slate-400">Try clearing filters or search.</p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              paginatedApps.map((app) => (
                <CandidateMobileCard
                  key={app.id}
                  app={app}
                  resyncingId={resyncingId}
                  resendingEmailId={resendingEmailId}
                  onView={handleView}
                  onEditNotes={handleEditNotes}
                  onDeleteConfirm={handleDeleteConfirm}
                  onStatusChange={handleStatusChange}
                  onSingleResync={handleSingleResync}
                  onResendEmail={handleResendEmail}
                />
              ))
            )}
          </div>

          {/* ========================================================= */}
          {/* PAGINATION FOOTER */}
          {/* ========================================================= */}
          {totalFilteredCount > 0 && (
            <div className="p-4 rounded-2xl border border-white/10 bg-[#0d121f] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-slate-400">
              <div>
                Showing <span className="text-white font-bold">{startIndex + 1}</span> to{' '}
                <span className="text-white font-bold">{endIndex}</span> of{' '}
                <span className="text-cyan-400 font-bold">{totalFilteredCount}</span> applications
              </div>

              <div className="flex items-center gap-3">
                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/15 text-white focus:outline-none text-xs font-bold cursor-pointer"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;

                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span className="px-1 text-slate-600">...</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold font-mono cursor-pointer ${
                              p === validCurrentPage
                                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md shadow-cyan-500/20'
                                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION MODAL OVERLAY (CENTERED IN VIEWPORT) */}
      {/* ========================================================= */}
      {deleteConfirmApp && (
        <div className="fixed inset-0 z-[100050] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0d121f] border border-red-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl shadow-red-500/10 space-y-5 text-slate-100 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-white">Delete Application?</h3>
                <p className="text-xs font-mono text-slate-400">Action cannot be undone</p>
              </div>
            </div>

            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/10 space-y-2 text-xs font-mono">
              <p className="text-slate-300">
                Are you sure you want to delete the job application for candidate{' '}
                <span className="text-white font-bold">{deleteConfirmApp.applicant_name}</span>?
              </p>
              <div className="text-slate-400 text-[11px]">
                ID: <span className="text-cyan-400 font-bold">{deleteConfirmApp.applicant_id || `APP-2026-${deleteConfirmApp.id.substring(0, 4)}`}</span>
              </div>
              <div className="text-slate-400 text-[11px]">
                Email: <span className="text-cyan-300">{deleteConfirmApp.applicant_email}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmApp(null)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs font-mono shadow-lg shadow-red-500/20 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BULK SYNC CONFIRMATION MODAL OVERLAY */}
      {/* ========================================================= */}
      {bulkSyncConfirmOpen && (
        <div className="fixed inset-0 z-[100050] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0d121f] border border-purple-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl shadow-purple-500/10 space-y-5 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300 shrink-0">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-white">Sync All Applications</h3>
                <p className="text-xs font-mono text-purple-300">Google Sheets Synchronization</p>
              </div>
            </div>

            <p className="text-xs font-mono text-slate-300">
              Do you want to sync all <span className="text-white font-bold">{programApps.length}</span> candidate applications for{' '}
              <span className="text-cyan-300 font-bold">"{selectedOpp.title}"</span> to Google Sheets?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={isSyncingBulk}
                onClick={() => setBulkSyncConfirmOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSyncingBulk}
                onClick={handleBulkResync}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono shadow-lg shadow-purple-500/20 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingBulk ? 'animate-spin' : ''}`} />
                {isSyncingBulk ? 'Syncing...' : `Sync ${programApps.length} Applications`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW FULL CANDIDATE DETAILS MODAL OVERLAY */}
      {/* ========================================================= */}
      {viewDetailApp && (
        <div className="fixed inset-0 z-[100050] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0d121f] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl shadow-cyan-500/10 space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-bold font-sans text-white">{viewDetailApp.applicant_name}</h3>
                <div className="text-xs font-mono text-cyan-400">
                  {viewDetailApp.applicant_id || `APP-2026-${viewDetailApp.id.substring(0, 4)}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewDetailApp(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Applicant Core Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono bg-white/[0.02] p-4 rounded-2xl border border-white/10">
              <div>
                <span className="text-slate-400 block">Email Address:</span>
                <span className="text-white font-bold">{viewDetailApp.applicant_email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone Number:</span>
                <span className="text-white font-bold">{viewDetailApp.applicant_phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Program Opportunity:</span>
                <span className="text-cyan-300 font-bold">{viewDetailApp.opportunity_title}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Submitted On:</span>
                <span className="text-slate-200">{viewDetailApp.created_at ? new Date(viewDetailApp.created_at).toLocaleString() : 'N/A'}</span>
              </div>
            </div>

            {/* Status & Sync summary */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">Current Status:</span>
              <span className="px-3 py-1 rounded-lg uppercase font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {viewDetailApp.status}
              </span>
              <span className="text-slate-400 ml-4">Sheets Sync:</span>
              <span className="px-3 py-1 rounded-lg uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {viewDetailApp.sync_status || 'synced'}
              </span>
            </div>

            {/* Custom Form Answers */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold font-mono text-cyan-300 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Custom Form Answers
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {Object.entries(viewDetailApp.answers || {}).length === 0 ? (
                  <p className="text-xs font-mono text-slate-500 italic">No custom form responses recorded.</p>
                ) : (
                  Object.entries(viewDetailApp.answers || {}).map(([key, val]) => (
                    <div key={key} className="bg-white/[0.03] p-3 rounded-xl border border-white/10 space-y-1">
                      <div className="text-xs font-mono text-slate-400 font-bold">{key}</div>
                      <div className="text-xs font-sans text-emerald-300 font-medium whitespace-pre-wrap">
                        {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Admin Notes */}
            {viewDetailApp.admin_notes && (
              <div className="space-y-2 bg-purple-500/10 p-4 rounded-2xl border border-purple-500/20 text-xs font-mono">
                <span className="text-purple-300 font-bold block">Admin Notes:</span>
                <p className="text-slate-200 whitespace-pre-wrap">{viewDetailApp.admin_notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setViewDetailApp(null)}
                className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs font-mono cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT ADMIN NOTES MODAL OVERLAY */}
      {/* ========================================================= */}
      {editNotesApp && (
        <div className="fixed inset-0 z-[100050] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0d121f] border border-purple-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl shadow-purple-500/10 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-purple-400" /> Admin Notes
              </h3>
              <button type="button" onClick={() => setEditNotesApp(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-slate-400">
              Add internal review notes for candidate <span className="text-white font-bold">{editNotesApp.applicant_name}</span>.
            </p>

            <textarea
              rows={4}
              value={adminNoteText}
              onChange={(e) => setAdminNoteText(e.target.value)}
              placeholder="Enter notes..."
              className="w-full p-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
            />

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditNotesApp(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono cursor-pointer"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
