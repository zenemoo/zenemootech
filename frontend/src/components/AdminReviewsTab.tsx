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
  ChevronRight
} from 'lucide-react';
import {
  ReviewItem,
  getAllReviewsForAdmin,
  toggleReviewVisibility,
  deleteReviewFromApi,
} from '../lib/reviewStore';

interface AdminReviewsTabProps {
  onAddToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminReviewsTab: React.FC<AdminReviewsTabProps> = ({ onAddToast }) => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'contributor' | 'client'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');

  // Confirmation modal for deleting review
  const [deleteTarget, setDeleteTarget] = useState<ReviewItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await getAllReviewsForAdmin();
      setReviews(data);
    } catch (e) {
      onAddToast('Error', 'Failed to fetch reviews data.', 'error');
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

  // Search & Filtering
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

  // Paginated records
  const totalPages = Math.ceil(filteredReviews.length / pageSize) || 1;
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReviews.slice(start, start + pageSize);
  }, [filteredReviews, currentPage]);

  // Handle visibility toggle
  const handleToggleVisibility = async (review: ReviewItem) => {
    setTogglingId(review.id);
    const newStatus = !review.is_visible;
    try {
      const updatedList = await toggleReviewVisibility(review.id, newStatus);
      setReviews(updatedList);
      onAddToast(
        'Visibility Updated',
        `Review ${review.review_id} is now ${newStatus ? 'VISIBLE on /review' : 'HIDDEN from public'}`,
        newStatus ? 'success' : 'info'
      );
    } catch (err) {
      onAddToast('Update Failed', 'Could not update review status.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Handle review deletion confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const updatedList = await deleteReviewFromApi(deleteTarget.id);
      setReviews(updatedList);
      onAddToast('Review Deleted', `Review ${deleteTarget.review_id} has been permanently deleted.`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      onAddToast('Delete Failed', 'Failed to delete review.', 'error');
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] p-5 rounded-2xl border border-white/10">
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

        <button
          onClick={fetchReviews}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
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
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs font-mono">
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
      </div>

      {/* Reviews Table / Responsive Cards */}
      <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-sm space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <div>Loading Zenemoo reviews...</div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-slate-200 font-bold text-sm">No reviews found</div>
            <p className="text-slate-500">Try clearing or adjusting your search filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-white/[0.04] border-b border-white/10 text-slate-400 uppercase tracking-wider">
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
                    return (
                      <tr key={review.id} className="hover:bg-white/[0.02] transition-colors">
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
                          {review.review_text ? (
                            <p className="line-clamp-2 text-slate-300 leading-normal italic text-[11px]">
                              "{review.review_text}"
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-5 py-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <div className="text-slate-400">
                  Showing <span className="text-white font-bold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="text-white font-bold">
                    {Math.min(currentPage * pageSize, filteredReviews.length)}
                  </span>{' '}
                  of <span className="text-white font-bold">{filteredReviews.length}</span> reviews
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-bold text-cyan-300">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal (NO browser confirm()) */}
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
              <h3 className="text-xl font-bold font-display text-white">Delete this review?</h3>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete review <span className="text-cyan-300 font-bold">{deleteTarget.review_id}</span> by{' '}
                <span className="text-white font-bold">{deleteTarget.name}</span>?
              </p>
              <p className="text-[11px] font-mono text-red-400 font-semibold">This action cannot be undone.</p>
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
                  <RefreshCw className="w-4 h-4 animate-spin" />
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
    </div>
  );
};
