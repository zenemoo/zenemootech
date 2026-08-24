import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  User,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  AlertTriangle,
  X,
  Save,
  Check,
  ChevronDown,
  Globe,
  Plus,
  Video,
  ExternalLink,
  Copy,
  Sparkles,
  Sliders,
  ChevronUp,
  Info,
  Hash,
  Send,
} from 'lucide-react';
import { bookingApi } from '../services/api';

interface CallBookingRecord {
  id: string;
  booking_id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  notes?: string;
  meeting_type: string;
  meeting_duration: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  status: 'pending' | 'confirmed' | 'completed' | 'rejected' | 'cancelled' | 'no_show';
  meeting_status?: 'pending' | 'generating' | 'generated' | 'failed' | 'cancelled';
  google_calendar_event_id?: string;
  google_meet_url?: string;
  meeting_error?: string;
  meeting_attempt_count?: number;
  meeting_generation_source?: string;
  admin_notes?: string;
  reminder_sent?: boolean;
  customer_email_status?: 'pending' | 'sent' | 'failed';
  admin_email_status?: 'pending' | 'sent' | 'failed';
  customer_reminder_status?: 'pending' | 'sent' | 'failed';
  admin_reminder_status?: 'pending' | 'sent' | 'failed';
  customer_email_sent_at?: string;
  admin_email_sent_at?: string;
  customer_reminder_sent_at?: string;
  admin_reminder_sent_at?: string;
  customer_email_error?: string;
  admin_email_error?: string;
  customer_reminder_error?: string;
  admin_reminder_error?: string;
  created_at: string;
  updated_at?: string;
  confirmed_at?: string;
  cancelled_at?: string;
  completed_at?: string;
}

interface AdminBookingsTabProps {
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, opts?: any) => void;
  onActionableCountChange?: (count: number) => void;
}

export const AdminBookingsTab: React.FC<AdminBookingsTabProps> = ({ addToast, showConfirm, onActionableCountChange }) => {
  const [bookings, setBookings] = useState<CallBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [meetingStatusFilter, setMeetingStatusFilter] = useState<string>('all');
  const [emailStatusFilter, setEmailStatusFilter] = useState<string>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'upcoming'>('newest');

  // Mobile Filter Drawer Toggle
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Active View Detail Modal State
  const [viewDetailBooking, setViewDetailBooking] = useState<CallBookingRecord | null>(null);
  const [isViewDetailModalOpen, setIsViewDetailModalOpen] = useState(false);

  // Active Edit Modal State
  const [selectedBooking, setSelectedBooking] = useState<CallBookingRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<string>('confirmed');
  const [editAdminNotes, setEditAdminNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [generatingMeetId, setGeneratingMeetId] = useState<string | null>(null);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getAdminBookings({
        search: searchQuery,
        status: statusFilter,
        meetingStatus: meetingStatusFilter,
        emailStatus: emailStatusFilter,
        timeframe: timeframeFilter,
      });
      if (res.data?.success) {
        setBookings(res.data.bookings || []);
        if (res.data.actionableCount !== undefined && onActionableCountChange) {
          onActionableCountChange(res.data.actionableCount);
        }
      }
    } catch (err: any) {
      console.error('Fetch bookings error:', err);
      addToast('Error Loading Bookings', err.response?.data?.message || 'Failed to load call bookings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, meetingStatusFilter, emailStatusFilter, timeframeFilter]);

  // Filter & Sort
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.booking_id?.toLowerCase().includes(q) ||
          b.full_name?.toLowerCase().includes(q) ||
          b.email?.toLowerCase().includes(q) ||
          b.company_name?.toLowerCase().includes(q) ||
          b.phone?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'upcoming') {
      result.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }

    return result;
  }, [bookings, searchQuery, sortBy]);

  // Handle Manual Google Meet Generation
  const handleGenerateMeet = async (booking: CallBookingRecord) => {
    setGeneratingMeetId(booking.id);
    try {
      const res = await bookingApi.generateMeetingLink(booking.id);
      if (res.data?.success) {
        addToast('Meeting Link Generated', `Google Meet link created: ${res.data.meetUrl}`, 'success');
        fetchBookings();
        if (selectedBooking && selectedBooking.id === booking.id) {
          setSelectedBooking(res.data.booking);
        }
        if (viewDetailBooking && viewDetailBooking.id === booking.id) {
          setViewDetailBooking(res.data.booking);
        }
      } else {
        addToast('Generation Failed', res.data?.message || 'Failed to generate Google Meet link.', 'error');
      }
    } catch (err: any) {
      addToast('Generation Failed', err.response?.data?.message || 'Failed to generate Google Meet link.', 'error');
    } finally {
      setGeneratingMeetId(null);
    }
  };

  // Handle Resend Email (Customer Confirmation / Admin Confirmation / Reminders)
  const handleResendEmail = async (
    booking: CallBookingRecord,
    emailType: 'customer_confirmation' | 'admin_confirmation' | 'customer_reminder' | 'admin_reminder'
  ) => {
    const key = `${booking.id}_${emailType}`;
    setResendingEmailId(key);
    try {
      const res = await bookingApi.resendEmail(booking.id, emailType);
      if (res.data?.success) {
        addToast('Email Sent', res.data.message || 'Email delivered successfully.', 'success');
        fetchBookings();
        if (viewDetailBooking && viewDetailBooking.id === booking.id) {
          setViewDetailBooking(res.data.booking || viewDetailBooking);
        }
      } else {
        addToast('Email Failed', res.data?.message || 'Failed to deliver email.', 'error');
      }
    } catch (err: any) {
      addToast('Email Failed', err.response?.data?.message || 'Failed to send email.', 'error');
    } finally {
      setResendingEmailId(null);
    }
  };

  const confirmAndResendEmail = (
    booking: CallBookingRecord,
    emailType: 'customer_confirmation' | 'admin_confirmation' | 'customer_reminder' | 'admin_reminder',
    typeLabel: string
  ) => {
    const isReminder = emailType.includes('reminder');
    const recipient = emailType.includes('customer') ? booking.full_name : 'Admin Group';
    const emailAddr = emailType.includes('customer') ? booking.email : 'zenemoo-admin-email@googlegroups.com';

    showConfirm(
      `Send ${typeLabel} Now?`,
      `Are you sure you want to send the ${typeLabel.toLowerCase()} to ${recipient} (${emailAddr}) for booking ${booking.booking_id}?`,
      () => handleResendEmail(booking, emailType),
      { confirmText: `Send ${typeLabel}` }
    );
  };

  // Handle Save Status / Notes
  const handleSaveEdit = async () => {
    if (!selectedBooking) return;
    setIsSaving(true);
    try {
      const res = await bookingApi.updateAdminBooking(selectedBooking.id, {
        status: editStatus,
        adminNotes: editAdminNotes,
      });

      if (res.data?.success) {
        addToast('Booking Updated', `Booking ${selectedBooking.booking_id} status updated to ${editStatus}.`, 'success');
        setIsEditModalOpen(false);
        setSelectedBooking(null);
        fetchBookings();
      }
    } catch (err: any) {
      addToast('Update Failed', err.response?.data?.message || 'Failed to update booking status.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Booking
  const handleDelete = (booking: CallBookingRecord) => {
    showConfirm(
      `Delete Booking ${booking.booking_id}?`,
      `Are you sure you want to permanently delete booking ${booking.booking_id} for ${booking.full_name}? This action cannot be undone.`,
      async () => {
        try {
          await bookingApi.deleteAdminBooking(booking.id);
          addToast('Booking Deleted', `Booking ${booking.booking_id} has been deleted.`, 'success');
          if (viewDetailBooking?.id === booking.id) {
            setIsViewDetailModalOpen(false);
            setViewDetailBooking(null);
          }
          fetchBookings();
        } catch (err: any) {
          addToast('Delete Failed', err.response?.data?.message || 'Failed to delete booking.', 'error');
        }
      },
      { intent: 'danger', confirmText: 'Delete Booking' }
    );
  };

  // Booking Status Badge Component
  const renderStatusBadge = (b: CallBookingRecord) => {
    const { status, end_time } = b;
    const isEndTimePassed = new Date(end_time).getTime() < Date.now();

    // Rule 1: Automatic Completion if status is confirmed and end_time has passed
    if (status === 'completed' || (status === 'confirmed' && isEndTimePassed)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-[11px] font-bold shrink-0">
          <CheckCircle2 className="w-3 h-3 text-blue-400" /> Completed
        </span>
      );
    }

    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[11px] font-bold shrink-0">
            <XCircle className="w-3 h-3 text-red-400" /> Cancelled
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold shrink-0">
            <XCircle className="w-3 h-3 text-amber-400" /> Rejected
          </span>
        );
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono text-[11px] font-bold shrink-0">
            <AlertTriangle className="w-3 h-3 text-purple-400" /> No Show
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-400 font-mono text-[11px] font-bold shrink-0">
            <Clock className="w-3 h-3 text-slate-400" /> {status}
          </span>
        );
    }
  };

  // Google Meet Meeting Status Badge Component
  const renderMeetingStatusBadge = (mStatus?: string) => {
    switch (mStatus) {
      case 'generated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold shrink-0" title="Google Meet link active">
            🟢 Generated
          </span>
        );
      case 'generating':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[11px] font-bold animate-pulse shrink-0" title="Google API generating link">
            🔵 Generating
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[11px] font-bold shrink-0" title="Generation failed">
            🔴 Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-400 font-mono text-[11px] font-bold shrink-0">
            ⚪ Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold shrink-0">
            🟡 Pending
          </span>
        );
    }
  };

  // Email Delivery Status Tag Helper
  const renderEmailStatusBadge = (status?: string) => {
    switch (status) {
      case 'sent':
        return <span className="text-emerald-400 font-bold">✓ Sent</span>;
      case 'failed':
        return <span className="text-red-400 font-bold">✕ Failed</span>;
      default:
        return <span className="text-amber-400 font-bold">⏳ Pending</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b0f19] p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold mb-2">
            <Calendar className="w-3.5 h-3.5" /> CALL BOOKINGS MODULE
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white">30 Minute Call Bookings</h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Manage public discovery calls, view Google Meet links, track email delivery, and update status.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          disabled={loading}
          aria-label="Refresh Data"
          className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/10 text-slate-300 font-mono text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-[#0b0f19] p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by ID, Name, Email, Company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Mobile Filters Toggle Button */}
          <button
            onClick={() => setShowMobileFilters((prev) => !prev)}
            className="md:hidden px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 font-mono text-xs font-semibold flex items-center justify-between cursor-pointer"
            aria-label="Toggle Filter Options"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" /> Filters &amp; Sorting
            </span>
            {showMobileFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Desktop Filter Controls */}
          <div className="hidden md:flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all" className="bg-[#0b0f19]">Booking: All Statuses</option>
              <option value="confirmed" className="bg-[#0b0f19]">Booking: Confirmed</option>
              <option value="completed" className="bg-[#0b0f19]">Booking: Completed</option>
              <option value="rejected" className="bg-[#0b0f19]">Booking: Rejected</option>
              <option value="cancelled" className="bg-[#0b0f19]">Booking: Cancelled</option>
              <option value="no_show" className="bg-[#0b0f19]">Booking: No Show</option>
            </select>

            <select
              value={meetingStatusFilter}
              onChange={(e) => setMeetingStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all" className="bg-[#0b0f19]">Meet Link: All</option>
              <option value="pending" className="bg-[#0b0f19]">Meet Link: 🟡 Pending</option>
              <option value="generated" className="bg-[#0b0f19]">Meet Link: 🟢 Generated</option>
              <option value="failed" className="bg-[#0b0f19]">Meet Link: 🔴 Failed</option>
              <option value="cancelled" className="bg-[#0b0f19]">Meet Link: ⚪ Cancelled</option>
            </select>

            <select
              value={emailStatusFilter}
              onChange={(e) => setEmailStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all" className="bg-[#0b0f19]">Email Delivery: All</option>
              <option value="sent" className="bg-[#0b0f19]">Email Delivery: ✓ Sent</option>
              <option value="failed" className="bg-[#0b0f19]">Email Delivery: ✕ Failed</option>
              <option value="pending" className="bg-[#0b0f19]">Email Delivery: ⏳ Pending</option>
            </select>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="newest" className="bg-[#0b0f19]">Sort: Newest First</option>
              <option value="oldest" className="bg-[#0b0f19]">Sort: Oldest First</option>
              <option value="upcoming" className="bg-[#0b0f19]">Sort: Upcoming Meeting</option>
            </select>
          </div>
        </div>

        {/* Mobile Filter Expandable Drawer */}
        {showMobileFilters && (
          <div className="md:hidden pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in font-mono text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Booking Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="all" className="bg-[#0b0f19]">All Statuses</option>
                <option value="confirmed" className="bg-[#0b0f19]">Confirmed</option>
                <option value="completed" className="bg-[#0b0f19]">Completed</option>
                <option value="rejected" className="bg-[#0b0f19]">Rejected</option>
                <option value="cancelled" className="bg-[#0b0f19]">Cancelled</option>
                <option value="no_show" className="bg-[#0b0f19]">No Show</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Google Meet Status</label>
              <select
                value={meetingStatusFilter}
                onChange={(e) => setMeetingStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="all" className="bg-[#0b0f19]">All Meet Links</option>
                <option value="pending" className="bg-[#0b0f19]">🟡 Pending</option>
                <option value="generated" className="bg-[#0b0f19]">🟢 Generated</option>
                <option value="failed" className="bg-[#0b0f19]">🔴 Failed</option>
                <option value="cancelled" className="bg-[#0b0f19]">⚪ Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Email Delivery</label>
              <select
                value={emailStatusFilter}
                onChange={(e) => setEmailStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="all" className="bg-[#0b0f19]">All Email Statuses</option>
                <option value="sent" className="bg-[#0b0f19]">✓ Sent</option>
                <option value="failed" className="bg-[#0b0f19]">✕ Failed</option>
                <option value="pending" className="bg-[#0b0f19]">⏳ Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Sort Order</label>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="newest" className="bg-[#0b0f19]">Newest First</option>
                <option value="oldest" className="bg-[#0b0f19]">Oldest First</option>
                <option value="upcoming" className="bg-[#0b0f19]">Upcoming Meeting</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* MAIN DATA VIEW: DESKTOP TABLE & MOBILE STACKED CARDS */}
      <div className="bg-[#0b0f19] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 text-center text-slate-400 font-mono text-xs space-y-3">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <div>Loading call bookings data...</div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-mono text-xs space-y-2">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <div className="text-white font-bold text-sm">No Call Bookings Found</div>
            <div>No booking records match the selected filter or search criteria.</div>
          </div>
        ) : (
          <>
            {/* DESKTOP / TABLET DATA TABLE (Hidden on Mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] font-mono text-[11px] uppercase text-slate-400 tracking-wider">
                    <th className="py-4 px-6">Booking Ref</th>
                    <th className="py-4 px-6">Client / Contact</th>
                    <th className="py-4 px-6">Company / Agency</th>
                    <th className="py-4 px-6">Meeting Slot</th>
                    <th className="py-4 px-6">Booking Status</th>
                    <th className="py-4 px-6">Google Meet</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans text-xs">
                  {filteredBookings.map((b) => {
                    const dateStr = new Date(b.start_time).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      timeZone: b.timezone || 'Asia/Kolkata',
                    });
                    const timeStr = new Date(b.start_time).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: b.timezone || 'Asia/Kolkata',
                    });

                    const isGenerating = generatingMeetId === b.id;

                    return (
                      <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-cyan-400">{b.booking_id}</td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-white">{b.full_name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{b.email}</div>
                          <div className="text-[11px] font-mono text-slate-500">{b.phone}</div>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-200">{b.company_name}</td>
                        <td className="py-4 px-6 font-mono text-xs">
                          <div className="text-white font-bold">{dateStr}</div>
                          <div className="text-cyan-300 text-[11px]">{timeStr} ({b.timezone || 'IST'})</div>
                        </td>
                        <td className="py-4 px-6">{renderStatusBadge(b)}</td>
                        <td className="py-4 px-6 space-y-1.5">
                          <div className="flex items-center gap-2">
                            {renderMeetingStatusBadge(b.meeting_status)}
                          </div>
                          {b.google_meet_url ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={b.google_meet_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold hover:bg-emerald-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Video className="w-3 h-3" /> Join Meet <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleGenerateMeet(b)}
                              disabled={isGenerating}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold hover:bg-cyan-500/30 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Generate Google Meet Link"
                            >
                              <Sparkles className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                              <span>{isGenerating ? 'Generating...' : 'Generate Link'}</span>
                            </button>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right space-x-1.5 shrink-0">
                          {/* PRIMARY VIEW DETAILS EYE ICON BUTTON */}
                          <button
                            onClick={() => {
                              setViewDetailBooking(b);
                              setIsViewDetailModalOpen(true);
                            }}
                            aria-label={`View full details for booking ${b.booking_id}`}
                            className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                            title="View Full Details & Email Status"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* EDIT BUTTON */}
                          <button
                            onClick={() => {
                              setSelectedBooking(b);
                              setEditStatus(b.status);
                              setEditAdminNotes(b.admin_notes || '');
                              setIsEditModalOpen(true);
                            }}
                            aria-label={`Edit status for booking ${b.booking_id}`}
                            className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                            title="Edit Status & Admin Notes"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {/* DELETE BUTTON */}
                          <button
                            onClick={() => handleDelete(b)}
                            aria-label={`Delete booking ${b.booking_id}`}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                            title="Delete Booking"
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

            {/* MOBILE STACKED BOOKING CARDS (Visible on mobile screens < 768px) */}
            <div className="md:hidden divide-y divide-white/5">
              {filteredBookings.map((b) => {
                const dateStr = new Date(b.start_time).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: b.timezone || 'Asia/Kolkata',
                });
                const timeStr = new Date(b.start_time).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: b.timezone || 'Asia/Kolkata',
                });

                const isGenerating = generatingMeetId === b.id;

                return (
                  <div key={b.id} className="p-4 space-y-3.5 hover:bg-white/[0.02] transition-colors">
                    {/* Card Header: Booking Ref & Badges */}
                    <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                      <div className="font-mono font-bold text-cyan-400 text-sm flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-cyan-500" />
                        <span>{b.booking_id}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {renderStatusBadge(b)}
                        {renderMeetingStatusBadge(b.meeting_status)}
                      </div>
                    </div>

                    {/* Client & Company Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Client Name</span>
                        <span className="font-bold text-white text-sm">{b.full_name}</span>
                        <div className="text-[11px] font-mono text-cyan-300">{b.email}</div>
                        <div className="text-[11px] font-mono text-slate-400">{b.phone}</div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Company / Agency</span>
                        <span className="font-semibold text-slate-200">{b.company_name}</span>
                        <div className="mt-1 font-mono text-[11px] text-white">
                          <span className="font-bold text-white">{dateStr}</span>
                          <div className="text-cyan-300 font-semibold">{timeStr} ({b.timezone || 'IST'})</div>
                        </div>
                      </div>
                    </div>

                    {/* Google Meet Quick Action if available */}
                    {b.google_meet_url && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-2 font-mono text-xs">
                        <span className="text-emerald-400 font-bold text-[11px] truncate">
                          {b.google_meet_url}
                        </span>
                        <a
                          href={b.google_meet_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-lg bg-emerald-500 text-black font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Video className="w-3 h-3" /> Join <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}

                    {/* Mobile Card Actions Footer */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Eye Icon Primary Details Action */}
                        <button
                          onClick={() => {
                            setViewDetailBooking(b);
                            setIsViewDetailModalOpen(true);
                          }}
                          aria-label={`View full details for booking ${b.booking_id}`}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setEditStatus(b.status);
                            setEditAdminNotes(b.admin_notes || '');
                            setIsEditModalOpen(true);
                          }}
                          aria-label={`Edit status for booking ${b.booking_id}`}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Status</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {!b.google_meet_url && (
                          <button
                            onClick={() => handleGenerateMeet(b)}
                            disabled={isGenerating}
                            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                            <span>{isGenerating ? 'Gen...' : 'Meet Link'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(b)}
                          aria-label={`Delete booking ${b.booking_id}`}
                          className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                          title="Delete Booking"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 1. COMPLETE VIEW DETAILS MODAL / DRAWER (Triggered by Eye Icon 👁) */}
      {isViewDetailModalOpen && viewDetailBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/40 max-w-2xl w-full my-6 space-y-6 max-h-[90vh] overflow-y-auto relative shadow-2xl text-slate-200 bg-[#0b0f19]">
            {/* Close Button */}
            <button
              onClick={() => setIsViewDetailModalOpen(false)}
              aria-label="Close detail modal"
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold font-display text-white">
                    {viewDetailBooking.booking_id}
                  </h3>
                  {renderStatusBadge(viewDetailBooking)}
                  {renderMeetingStatusBadge(viewDetailBooking.meeting_status)}
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Complete Booking Record &amp; Email Delivery Tracking
                </p>
              </div>
            </div>

            {/* COMPLETE DETAILS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/[0.02] p-5 rounded-2xl border border-white/5 font-mono text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">CLIENT FULL NAME</span>
                <span className="text-white font-bold text-sm">{viewDetailBooking.full_name}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">BUSINESS EMAIL</span>
                <span className="text-cyan-300 font-bold">{viewDetailBooking.email}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">COMPANY / AGENCY</span>
                <span className="text-white font-semibold">{viewDetailBooking.company_name}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">PHONE / WHATSAPP</span>
                <span className="text-white">{viewDetailBooking.phone}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">SCHEDULED DATE</span>
                <span className="text-white font-bold">
                  {new Date(viewDetailBooking.start_time).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: viewDetailBooking.timezone || 'Asia/Kolkata',
                  })}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">SCHEDULED TIME &amp; TZ</span>
                <span className="text-cyan-300 font-bold">
                  {new Date(viewDetailBooking.start_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: viewDetailBooking.timezone || 'Asia/Kolkata',
                  })}{' '}
                  –{' '}
                  {new Date(viewDetailBooking.end_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: viewDetailBooking.timezone || 'Asia/Kolkata',
                  })}{' '}
                  ({viewDetailBooking.timezone || 'Asia/Kolkata'})
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">MEETING DURATION</span>
                <span className="text-white">{viewDetailBooking.meeting_duration || 30} Minutes</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">CALENDAR EVENT ID</span>
                <span className="text-slate-300 font-mono text-[11px] truncate block">
                  {viewDetailBooking.google_calendar_event_id || 'Not generated yet'}
                </span>
              </div>
            </div>

            {/* EMAIL DELIVERY TRACKING CARD */}
            <div className="p-4 rounded-2xl bg-[#070a11] border border-white/10 space-y-3 font-mono text-xs">
              <div className="text-[11px] text-cyan-400 uppercase font-bold tracking-wider flex items-center justify-between border-b border-white/5 pb-2">
                <span>Email Delivery Tracking</span>
                <span className="text-[10px] text-slate-500">Live Status &amp; Resend Actions</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Customer Confirmation Email */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold text-[11px]">Customer Confirmation</span>
                    {renderEmailStatusBadge(viewDetailBooking.customer_email_status)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {viewDetailBooking.customer_email_sent_at
                      ? `Sent: ${new Date(viewDetailBooking.customer_email_sent_at).toLocaleTimeString()}`
                      : viewDetailBooking.customer_email_error
                      ? `Error: ${viewDetailBooking.customer_email_error}`
                      : 'Pending delivery'}
                  </div>
                  <button
                    onClick={() => confirmAndResendEmail(viewDetailBooking, 'customer_confirmation', 'Customer Confirmation Email')}
                    disabled={resendingEmailId === `${viewDetailBooking.id}_customer_confirmation`}
                    className="w-full py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-2.5 h-2.5" />
                    <span>{resendingEmailId === `${viewDetailBooking.id}_customer_confirmation` ? 'Sending...' : 'Resend Email'}</span>
                  </button>
                </div>

                {/* 2. Admin Confirmation Email */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold text-[11px]">Admin Notification</span>
                    {renderEmailStatusBadge(viewDetailBooking.admin_email_status)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {viewDetailBooking.admin_email_sent_at
                      ? `Sent: ${new Date(viewDetailBooking.admin_email_sent_at).toLocaleTimeString()}`
                      : viewDetailBooking.admin_email_error
                      ? `Error: ${viewDetailBooking.admin_email_error}`
                      : 'Pending delivery'}
                  </div>
                  <button
                    onClick={() => confirmAndResendEmail(viewDetailBooking, 'admin_confirmation', 'Admin Notification Email')}
                    disabled={resendingEmailId === `${viewDetailBooking.id}_admin_confirmation`}
                    className="w-full py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-2.5 h-2.5" />
                    <span>{resendingEmailId === `${viewDetailBooking.id}_admin_confirmation` ? 'Sending...' : 'Resend Email'}</span>
                  </button>
                </div>

                {/* 3. Customer 1-Hour Reminder */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold text-[11px]">Customer Reminder</span>
                    {renderEmailStatusBadge(viewDetailBooking.customer_reminder_status)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {viewDetailBooking.customer_reminder_sent_at
                      ? `Sent: ${new Date(viewDetailBooking.customer_reminder_sent_at).toLocaleTimeString()}`
                      : viewDetailBooking.customer_reminder_error
                      ? `Error: ${viewDetailBooking.customer_reminder_error}`
                      : 'Scheduled (1 hr prior)'}
                  </div>
                  <button
                    onClick={() => confirmAndResendEmail(viewDetailBooking, 'customer_reminder', 'Customer 1-Hour Reminder Email')}
                    disabled={resendingEmailId === `${viewDetailBooking.id}_customer_reminder`}
                    className="w-full py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-2.5 h-2.5" />
                    <span>{resendingEmailId === `${viewDetailBooking.id}_customer_reminder` ? 'Sending...' : 'Send Reminder Now'}</span>
                  </button>
                </div>

                {/* 4. Admin 1-Hour Reminder */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold text-[11px]">Admin Reminder</span>
                    {renderEmailStatusBadge(viewDetailBooking.admin_reminder_status)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {viewDetailBooking.admin_reminder_sent_at
                      ? `Sent: ${new Date(viewDetailBooking.admin_reminder_sent_at).toLocaleTimeString()}`
                      : viewDetailBooking.admin_reminder_error
                      ? `Error: ${viewDetailBooking.admin_reminder_error}`
                      : 'Scheduled (1 hr prior)'}
                  </div>
                  <button
                    onClick={() => confirmAndResendEmail(viewDetailBooking, 'admin_reminder', 'Admin 1-Hour Reminder Email')}
                    disabled={resendingEmailId === `${viewDetailBooking.id}_admin_reminder`}
                    className="w-full py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-2.5 h-2.5" />
                    <span>{resendingEmailId === `${viewDetailBooking.id}_admin_reminder` ? 'Sending...' : 'Send Reminder Now'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* GOOGLE MEET CARD */}
            <div className="p-4 rounded-2xl bg-[#070a11] border border-white/10 space-y-3 font-mono text-xs">
              <div className="text-[11px] text-cyan-400 uppercase font-bold tracking-wider flex items-center justify-between">
                <span>Google Meet Conference Link</span>
                <span>{renderMeetingStatusBadge(viewDetailBooking.meeting_status)}</span>
              </div>

              {viewDetailBooking.google_meet_url ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl">
                  <div className="truncate font-semibold text-emerald-300 text-xs">
                    {viewDetailBooking.google_meet_url}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={viewDetailBooking.google_meet_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" /> Join Room
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(viewDetailBooking.google_meet_url!);
                        addToast('Copied', 'Google Meet URL copied to clipboard.', 'info');
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                      aria-label="Copy Google Meet Link"
                      title="Copy Link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
                  <div className="text-amber-300 text-xs">
                    {viewDetailBooking.meeting_error ? `Error: ${viewDetailBooking.meeting_error}` : 'Meeting link not generated yet.'}
                  </div>
                  <button
                    onClick={() => handleGenerateMeet(viewDetailBooking)}
                    disabled={generatingMeetId === viewDetailBooking.id}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{generatingMeetId === viewDetailBooking.id ? 'Generating...' : 'Generate Meeting Link'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* CLIENT NOTES */}
            <div className="space-y-1.5">
              <label className="block font-mono text-xs font-bold text-slate-400">CLIENT NOTES / INQUIRY OBJECTIVE</label>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 font-mono text-xs text-slate-300 leading-relaxed">
                {viewDetailBooking.notes || 'No additional notes provided by client.'}
              </div>
            </div>

            {/* INTERNAL ADMIN NOTES */}
            {viewDetailBooking.admin_notes && (
              <div className="space-y-1.5">
                <label className="block font-mono text-xs font-bold text-slate-400">INTERNAL ADMIN NOTES</label>
                <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 font-mono text-xs text-cyan-200 leading-relaxed">
                  {viewDetailBooking.admin_notes}
                </div>
              </div>
            )}

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => handleDelete(viewDetailBooking)}
                className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-xs font-bold transition-colors cursor-pointer"
              >
                Delete Booking
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedBooking(viewDetailBooking);
                    setEditStatus(viewDetailBooking.status);
                    setEditAdminNotes(viewDetailBooking.admin_notes || '');
                    setIsViewDetailModalOpen(false);
                    setIsEditModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Status</span>
                </button>

                <button
                  onClick={() => setIsViewDetailModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT STATUS & ADMIN NOTES MODAL */}
      {isEditModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 max-w-2xl w-full my-8 space-y-6 max-h-[85vh] overflow-y-auto relative shadow-2xl text-slate-200 bg-[#0b0f19]">
            <button
              onClick={() => setIsEditModalOpen(false)}
              aria-label="Close edit modal"
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Edit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-white">
                  Update Booking: {selectedBooking.booking_id}
                </h3>
                <p className="text-xs font-mono text-slate-400">Client: {selectedBooking.full_name} ({selectedBooking.company_name})</p>
              </div>
            </div>

            {/* EDIT STATUS & ADMIN NOTES FORM */}
            <div className="space-y-4 font-sans text-xs">
              <div className="space-y-1.5">
                <label className="block font-mono text-xs font-bold text-slate-300">UPDATE BOOKING STATUS</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="confirmed" className="bg-[#0b0f19]">Confirmed (Active)</option>
                  <option value="completed" className="bg-[#0b0f19]">Completed</option>
                  <option value="rejected" className="bg-[#0b0f19]">Rejected</option>
                  <option value="cancelled" className="bg-[#0b0f19]">Cancelled</option>
                  <option value="no_show" className="bg-[#0b0f19]">No Show</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono text-xs font-bold text-slate-300">INTERNAL ADMIN NOTES</label>
                <textarea
                  rows={4}
                  placeholder="Add internal operational notes, call outcome, assigned account manager..."
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
