import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  Eye,
  EyeOff,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Users,
  Briefcase,
  ShieldCheck,
  X,
  Copy,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Layers,
  ChevronDown
} from 'lucide-react';
import {
  ReviewItem,
  getAllReviewsForAdmin,
  toggleReviewVisibility,
  deleteReviewFromApi,
  publishAllPendingReviews,
  bulkPublishReviews,
  bulkDeleteReviews,
} from '../lib/reviewStore';

interface AdminReviewsTabProps {
  onAddToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminReviewsTab: React.FC<AdminReviewsTabProps> = ({ onAddToast }) => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'contributor' | 'client'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');

  // Multi-select & Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkPublishing, setIsBulkPublishing] = useState(false);
  const [isPublishingAll, setIsPublishingAll] = useState(false);

  // Confirmation modal for deleting review
  const [deleteTarget, setDeleteTarget] = useState<ReviewItem | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Scalability Pagination state (Matching screenshot 2)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchReviews = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getAllReviewsForAdmin();
      setReviews(data);
    } catch (e: any) {
      console.error('Failed to fetch admin reviews from database:', e);
      setReviews([]);
      setFetchError(e.message || 'Unable to fetch reviews from database.');
      onAddToast('Database Error', 'Unable to fetch reviews from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Stats computation
  const stats = useMemo(() => {
    const total = reviews.length;
    const visible = reviews.filter((r) => r.is_visible).length;
    const hidden = reviews.filter((r) => !r.is_visible).length;
    const contributors = reviews.filter((r) =>
      (r.reviewer_type || '').toLowerCase().includes('contributor')
    ).length;
    const clients = reviews.filter((r) =>
      (r.reviewer_type || '').toLowerCase().includes('client')
    ).length;
    const avgRating = total > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1) : '5.0';

    return { total, visible, hidden, contributors, clients, avgRating };
  }, [reviews]);

  // Search & Filtering on real database records
  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = (review.review_id || '').toLowerCase().includes(q);
        const matchName = (review.name || '').toLowerCase().includes(q);
        const matchType = (review.reviewer_type || '').toLowerCase().includes(q);
        const matchText = (review.review_text || '').toLowerCase().includes(q);
        if (!matchId && !matchName && !matchType && !matchText) return false;
      }

      // Status filter
      if (statusFilter === 'visible' && !review.is_visible) return false;
      if (statusFilter === 'hidden' && review.is_visible) return false;

      // Type filter
      if (typeFilter === 'contributor' && !(review.reviewer_type || '').toLowerCase().includes('contributor')) {
        return false;
      }
      if (typeFilter === 'client' && !(review.reviewer_type || '').toLowerCase().includes('client')) {
        return false;
      }

      // Rating filter
      if (ratingFilter !== 'all' && review.rating !== parseInt(ratingFilter, 10)) {
        return false;
      }

      return true;
    });
  }, [reviews, searchQuery, statusFilter, typeFilter, ratingFilter]);

  // Paginated records based on scalable pageSize
  const totalPages = Math.ceil(filteredReviews.length / pageSize) || 1;
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReviews.slice(start, start + pageSize);
  }, [filteredReviews, currentPage, pageSize]);

  // Row selection logic
  const isAllPaginatedSelected = useMemo(() => {
    if (paginatedReviews.length === 0) return false;
    return paginatedReviews.every((r) => selectedIds.includes(r.id));
  }, [paginatedReviews, selectedIds]);

  const toggleSelectAllPaginated = () => {
    if (isAllPaginatedSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedReviews.some((r) => r.id === id)));
    } else {
      const pageIds = paginatedReviews.map((r) => r.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handle Accept / Publish ALL Pending Reviews at once
  const handlePublishAllPending = async () => {
    if (stats.hidden === 0) {
      onAddToast('Notice', 'There are no pending/hidden reviews to approve.', 'info');
      return;
    }

    setIsPublishingAll(true);
    try {
      const count = await publishAllPendingReviews();
      await fetchReviews();
      setSelectedIds([]);
      onAddToast(
        'All Accepted!',
        `Successfully accepted and published all ${count} pending reviews to the public web UI!`,
        'success'
      );
    } catch (err: any) {
      console.error('Publish all pending error:', err);
      onAddToast('Accept Error', 'Unable to accept all pending reviews. Please try again.', 'error');
    } finally {
      setIsPublishingAll(false);
    }
  };

  // Handle Bulk Publish Selected
  const handleBulkPublishSelected = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkPublishing(true);
    try {
      const count = await bulkPublishReviews(selectedIds);
      await fetchReviews();
      setSelectedIds([]);
      onAddToast('Bulk Accepted', `Successfully accepted ${count} selected reviews!`, 'success');
    } catch (err: any) {
      console.error('Bulk publish error:', err);
      onAddToast('Bulk Accept Error', 'Unable to accept selected reviews.', 'error');
    } finally {
      setIsBulkPublishing(false);
    }
  };

  // Handle Bulk Delete Selected
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const count = await bulkDeleteReviews(selectedIds);
      await fetchReviews();
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      onAddToast('Bulk Deleted', `Successfully deleted ${count} selected reviews.`, 'success');
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      onAddToast('Bulk Delete Error', 'Unable to delete selected reviews.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle visibility toggle directly in Supabase
  const handleToggleVisibility = async (review: ReviewItem) => {
    setTogglingId(review.id);
    const newStatus = !review.is_visible;
    try {
      await toggleReviewVisibility(review.id, newStatus);
      await fetchReviews();
      onAddToast(
        'Visibility Updated',
        newStatus ? 'Review is now visible publicly.' : 'Review hidden successfully.',
        newStatus ? 'success' : 'info'
      );
    } catch (err: any) {
      console.error('Toggle visibility error:', err);
      onAddToast('Update Failed', 'Unable to update review visibility. Please try again.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Handle single review deletion directly in Supabase
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteReviewFromApi(deleteTarget.id);
      await fetchReviews();
      onAddToast('Review Deleted', 'Review deleted successfully.', 'success');
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Delete review error:', err);
      onAddToast('Delete Failed', 'Unable to delete this review. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Recent';
    }
  };

  // Page numbers generator for UI pagination (Matching Image 2)
  const renderPaginationButtons = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages.map((page, idx) => {
      if (typeof page === 'string') {
        return (
          <span key={`dots_${idx}`} className="px-2 text-slate-500 font-mono">
            ...
          </span>
        );
      }
      const isActive = page === currentPage;
      return (
        <button
          key={`page_${page}`}
          onClick={() => setCurrentPage(page)}
          className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
            isActive
              ? 'bg-cyan-400 text-black shadow-md shadow-cyan-500/20'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
          }`}
        >
          {page}
        </button>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/[0.02] p-5 rounded-2xl border border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold mb-2">
            <Star className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span>ZENEMOO REVIEW CENTER</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-white">Review Management</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Moderate community and client feedback. Control public visibility on <code className="text-cyan-300 font-bold">/review</code>.
          </p>
        </div>

        {/* Global Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* ACCEPT ALL PENDING REVIEWS BUTTON */}
          <button
            onClick={handlePublishAllPending}
            disabled={isPublishingAll || stats.hidden === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold font-mono text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Accept & publish all pending hidden reviews at once"
          >
            {isPublishingAll ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-black" />
            )}
            <span>Accept All Pending ({stats.hidden})</span>
          </button>

          {/* Refresh Database Button */}
          <button
            onClick={fetchReviews}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Database</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total */}
        <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Total Reviews</span>
            <MessageSquare className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{stats.total}</div>
          <div className="text-[10px] font-mono text-cyan-400 font-medium">Avg Rating: {stats.avgRating} ★</div>
        </div>

        {/* Visible */}
        <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Visible</span>
            <Eye className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300 font-mono">{stats.visible}</div>
          <div className="text-[10px] font-mono text-emerald-400 font-medium">Publicly Published</div>
        </div>

        {/* Hidden / Pending */}
        <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Hidden</span>
            <EyeOff className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-300 font-mono">{stats.hidden}</div>
          <div className="text-[10px] font-mono text-amber-400 font-medium">Pending Review</div>
        </div>

        {/* Contributors */}
        <div className="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/20 space-y-1">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Contributors</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300 font-mono">{stats.contributors}</div>
          <div className="text-[10px] font-mono text-purple-400 font-medium">Workers &amp; Annotators</div>
        </div>

        {/* Clients */}
        <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/20 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Clients</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-300 font-mono">{stats.clients}</div>
          <div className="text-[10px] font-mono text-blue-400 font-medium">Project Providers</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/10 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Review ID, Name, Type, or Review Text..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e: any) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="all" className="bg-slate-900 text-white">Status: All</option>
              <option value="visible" className="bg-slate-900 text-emerald-400">Status: Visible</option>
              <option value="hidden" className="bg-slate-900 text-amber-400">Status: Hidden</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e: any) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="all" className="bg-slate-900 text-white">Type: All</option>
              <option value="contributor" className="bg-slate-900 text-purple-400">Contributor / Worker</option>
              <option value="client" className="bg-slate-900 text-blue-400">Client / Project Provider</option>
            </select>
          </div>
        </div>

        {/* Rating Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold mr-1">Rating Filter:</span>
            {(['all', '5', '4', '3', '2', '1'] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRatingFilter(r);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  ratingFilter === r
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {r === 'all' ? 'All Ratings' : `${r} ★`}
              </button>
            ))}
          </div>

          {/* Bulk Selection Bar when 1 or more rows selected */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold animate-fade-in">
              <span>{selectedIds.length} Selected</span>
              <button
                onClick={handleBulkPublishSelected}
                disabled={isBulkPublishing}
                className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 font-bold transition-all cursor-pointer text-[11px]"
              >
                {isBulkPublishing ? 'Accepting...' : 'Accept Selected'}
              </button>
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 font-bold transition-all cursor-pointer text-[11px]"
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Table / Cards Container */}
      <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-sm space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <div>Loading reviews from Supabase database...</div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-slate-200 font-bold text-sm">No reviews in database</div>
            <p className="text-slate-500">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || ratingFilter !== 'all'
                ? 'No database reviews match your selected filters.'
                : 'No reviews have been submitted to the database yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-white/[0.04] border-b border-white/10 text-slate-400 uppercase tracking-wider">
                    {/* Master Checkbox */}
                    <th className="py-3.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllPaginatedSelected}
                        onChange={toggleSelectAllPaginated}
                        className="rounded border-white/20 bg-white/5 text-cyan-400 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4 font-semibold">Review ID</th>
                    <th className="py-3.5 px-4 font-semibold">Reviewer</th>
                    <th className="py-3.5 px-4 font-semibold">Type</th>
                    <th className="py-3.5 px-4 font-semibold">Rating</th>
                    <th className="py-3.5 px-4 font-semibold max-w-xs">Review Text</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Date</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paginatedReviews.map((review) => {
                    const isContributor = (review.reviewer_type || '').toLowerCase().includes('contributor');
                    const isSelected = selectedIds.includes(review.id);

                    return (
                      <tr
                        key={review.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-cyan-500/[0.06]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-4 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(review.id)}
                            className="rounded border-white/20 bg-white/5 text-cyan-400 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Review ID */}
                        <td className="py-4 px-4 font-bold text-cyan-300 whitespace-nowrap">
                          {review.review_id}
                        </td>

                        {/* Name */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-bold text-white text-sm">{review.name}</div>
                        </td>

                        {/* Type Badge */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                              isContributor
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {isContributor ? 'Worker / Contributor' : 'Client / Provider'}
                          </span>
                        </td>

                        {/* Star Rating */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= review.rating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-700'
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-[11px] font-bold text-amber-300">{review.rating}/5</span>
                          </div>
                        </td>

                        {/* Review Text */}
                        <td className="py-4 px-4 max-w-xs">
                          {review.review_text && review.review_text.trim() ? (
                            <p className="line-clamp-2 text-slate-300 leading-normal italic text-[11px] whitespace-pre-line">
                              "{review.review_text.trim()}"
                            </p>
                          ) : (
                            <span className="text-slate-600 text-[10px] italic">(No written text provided)</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {review.is_visible ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                              <Eye className="w-3 h-3" /> VISIBLE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                              <EyeOff className="w-3 h-3" /> HIDDEN
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                          {formatDate(review.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 whitespace-nowrap text-right space-x-2">
                          {/* Toggle Visibility Eye Button */}
                          <button
                            onClick={() => handleToggleVisibility(review)}
                            disabled={togglingId === review.id}
                            title={review.is_visible ? 'Hide review from public view' : 'Publish review publicly'}
                            className={`p-2 rounded-xl border transition-all cursor-pointer inline-flex items-center justify-center ${
                              review.is_visible
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {togglingId === review.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : review.is_visible ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteTarget(review)}
                            title="Delete review permanently"
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer inline-flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* SCALABILITY PAGINATION FOOTER (Matching Image 2 Exactly) */}
            <div className="px-6 py-4 bg-[#07090e] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
              {/* Left Side: Showing X to Y of Z reviews */}
              <div className="text-slate-400">
                Showing{' '}
                <span className="text-cyan-300 font-bold">
                  {filteredReviews.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="text-cyan-300 font-bold">
                  {Math.min(currentPage * pageSize, filteredReviews.length)}
                </span>{' '}
                of <span className="text-white font-bold">{filteredReviews.length}</span> reviews
              </div>

              {/* Right Side: Page Size Selector & Numbered Buttons */}
              <div className="flex items-center gap-4">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-cyan-300 font-bold focus:outline-none focus:border-cyan-400 text-xs"
                  >
                    <option value={5} className="bg-slate-900 text-white">5 / page</option>
                    <option value={10} className="bg-slate-900 text-white">10 / page</option>
                    <option value={20} className="bg-slate-900 text-white">20 / page</option>
                    <option value={50} className="bg-slate-900 text-white">50 / page</option>
                    <option value={100} className="bg-slate-900 text-white">100 / page</option>
                  </select>
                </div>

                {/* Page Navigation Buttons (< 1 2 ... N >) */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {renderPaginationButtons()}

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Single Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-red-500/30 max-w-md w-full relative space-y-5 text-center shadow-2xl shadow-red-950/50">
            <button
              onClick={() => setDeleteTarget(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold font-display text-white">Delete Review?</h3>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete review <span className="text-cyan-300 font-bold">{deleteTarget.review_id}</span> by{' '}
                <span className="text-white font-bold">{deleteTarget.name}</span>?
              </p>
              <p className="text-[11px] font-mono text-red-400 font-semibold">This action will delete the database row permanently.</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold font-mono text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-1/2 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-black font-bold font-mono text-xs transition-all shadow-lg shadow-red-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Delete Review
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Bulk Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-red-500/30 max-w-md w-full relative space-y-5 text-center shadow-2xl shadow-red-950/50">
            <button
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold font-display text-white">Delete Selected Reviews?</h3>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete <span className="text-cyan-300 font-bold">{selectedIds.length}</span> selected reviews from Supabase?
              </p>
              <p className="text-[11px] font-mono text-red-400 font-semibold">This action cannot be undone.</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold font-mono text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmBulkDelete}
                disabled={isDeleting}
                className="w-1/2 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-black font-bold font-mono text-xs transition-all shadow-lg shadow-red-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Delete Selected
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
