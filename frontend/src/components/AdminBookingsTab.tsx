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
  admin_notes?: string;
  reminder_sent?: boolean;
  created_at: string;
}

interface AdminBookingsTabProps {
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, opts?: any) => void;
}

export const AdminBookingsTab: React.FC<AdminBookingsTabProps> = ({ addToast, showConfirm }) => {
  const [bookings, setBookings] = useState<CallBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [meetingStatusFilter, setMeetingStatusFilter] = useState<string>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'upcoming'>('newest');

  // Active View / Edit Modal State
  const [selectedBooking, setSelectedBooking] = useState<CallBookingRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<string>('confirmed');
  const [editAdminNotes, setEditAdminNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [generatingMeetId, setGeneratingMeetId] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getAdminBookings({
        search: searchQuery,
        status: statusFilter,
        meetingStatus: meetingStatusFilter,
        timeframe: timeframeFilter,
      });
      if (res.data?.success) {
        setBookings(res.data.bookings || []);
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
  }, [statusFilter, meetingStatusFilter, timeframeFilter]);

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
      } else {
        addToast('Generation Failed', res.data?.message || 'Failed to generate Google Meet link.', 'error');
      }
    } catch (err: any) {
      addToast('Generation Failed', err.response?.data?.message || 'Failed to generate Google Meet link.', 'error');
    } finally {
      setGeneratingMeetId(null);
    }
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
          fetchBookings();
        } catch (err: any) {
          addToast('Delete Failed', err.response?.data?.message || 'Failed to delete booking.', 'error');
        }
      },
      { intent: 'danger', confirmText: 'Delete Booking' }
    );
  };

  // Booking Status Badge Component
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[11px] font-bold">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono text-[11px] font-bold">
            <AlertTriangle className="w-3 h-3" /> No Show
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-400 font-mono text-[11px] font-bold">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
    }
  };

  // Google Meet Meeting Status Badge Component
  const renderMeetingStatusBadge = (mStatus?: string) => {
    switch (mStatus) {
      case 'generated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold" title="Google Meet link active">
            🟢 Generated
          </span>
        );
      case 'generating':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[11px] font-bold animate-pulse" title="Google API generating link">
            🔵 Generating
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[11px] font-bold" title="Generation failed">
            🔴 Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-400 font-mono text-[11px] font-bold">
            ⚪ Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
            🟡 Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b0f19] p-6 rounded-3xl border border-white/10 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold mb-2">
            <Calendar className="w-3.5 h-3.5" /> CALL BOOKINGS MODULE
          </div>
          <h2 className="text-2xl font-bold font-display text-white">30 Minute Call Bookings</h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Manage public discovery calls, view Google Meet links, update status, and track scheduled meetings.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/10 text-slate-300 font-mono text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 bg-[#0b0f19] p-4 rounded-2xl border border-white/10">
        {/* Search Input */}
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by ID, Name, Email, Company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Booking Status Filter */}
        <div className="lg:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all" className="bg-[#0b0f19]">Booking: All Statuses</option>
            <option value="confirmed" className="bg-[#0b0f19]">Booking: Confirmed</option>
            <option value="completed" className="bg-[#0b0f19]">Booking: Completed</option>
            <option value="rejected" className="bg-[#0b0f19]">Booking: Rejected</option>
            <option value="cancelled" className="bg-[#0b0f19]">Booking: Cancelled</option>
            <option value="no_show" className="bg-[#0b0f19]">Booking: No Show</option>
          </select>
        </div>

        {/* Google Meet Link Status Filter */}
        <div className="lg:col-span-3">
          <select
            value={meetingStatusFilter}
            onChange={(e) => setMeetingStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all" className="bg-[#0b0f19]">Meet Link: All</option>
            <option value="pending" className="bg-[#0b0f19]">Meet Link: 🟡 Pending</option>
            <option value="generated" className="bg-[#0b0f19]">Meet Link: 🟢 Generated</option>
            <option value="failed" className="bg-[#0b0f19]">Meet Link: 🔴 Failed</option>
            <option value="cancelled" className="bg-[#0b0f19]">Meet Link: ⚪ Cancelled</option>
          </select>
        </div>

        {/* Sort Order */}
        <div className="lg:col-span-2">
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="newest" className="bg-[#0b0f19]">Sort: Newest First</option>
            <option value="oldest" className="bg-[#0b0f19]">Sort: Oldest First</option>
            <option value="upcoming" className="bg-[#0b0f19]">Sort: Upcoming Meeting</option>
          </select>
        </div>
      </div>

      {/* BOOKINGS TABLE / CARDS */}
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
          <div className="overflow-x-auto">
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
                      <td className="py-4 px-6">{renderStatusBadge(b.status)}</td>
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
                          >
                            <Sparkles className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                            <span>{isGenerating ? 'Generating...' : 'Generate Link'}</span>
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setEditStatus(b.status);
                            setEditAdminNotes(b.admin_notes || '');
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                          title="View / Edit Booking"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b)}
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
        )}
      </div>

      {/* VIEW / EDIT BOOKING MODAL */}
      {isEditModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 max-w-2xl w-full my-8 space-y-6 max-h-[85vh] overflow-y-auto relative shadow-2xl text-slate-200 bg-[#0b0f19]">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-white">
                  Booking Details: {selectedBooking.booking_id}
                </h3>
                <p className="text-xs font-mono text-slate-400">Zenemoo 30 Minute Discovery Call</p>
              </div>
            </div>

            {/* DETAILS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5 font-mono text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">CLIENT NAME</span>
                <span className="text-white font-bold">{selectedBooking.full_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">EMAIL ADDRESS</span>
                <span className="text-cyan-300 font-bold">{selectedBooking.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">COMPANY / AGENCY</span>
                <span className="text-white font-bold">{selectedBooking.company_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">PHONE / WHATSAPP</span>
                <span className="text-white">{selectedBooking.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SCHEDULED DATE &amp; TIME</span>
                <span className="text-cyan-300 font-bold">
                  {new Date(selectedBooking.start_time).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: selectedBooking.timezone || 'Asia/Kolkata',
                  })}{' '}
                  ({selectedBooking.timezone || 'Asia/Kolkata'})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">MEETING STATUS</span>
                <div className="mt-0.5 flex items-center gap-2">
                  {renderMeetingStatusBadge(selectedBooking.meeting_status)}
                </div>
              </div>
            </div>

            {/* GOOGLE MEET & CALENDAR STATUS CARD */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 font-mono text-xs">
              <div className="text-[11px] text-cyan-400 uppercase font-bold tracking-wider flex items-center justify-between">
                <span>Google Calendar &amp; Meet Room</span>
                <span>{selectedBooking.google_calendar_event_id ? `ID: ${selectedBooking.google_calendar_event_id}` : 'No Event ID'}</span>
              </div>

              {selectedBooking.google_meet_url ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl">
                  <div className="truncate font-semibold text-emerald-300 text-xs">
                    {selectedBooking.google_meet_url}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={selectedBooking.google_meet_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" /> Join Room
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedBooking.google_meet_url!);
                        addToast('Copied', 'Google Meet URL copied to clipboard.', 'info');
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                      title="Copy Link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
                  <div className="text-amber-300 text-xs">
                    {selectedBooking.meeting_error ? `Error: ${selectedBooking.meeting_error}` : 'Meeting link not generated yet.'}
                  </div>
                  <button
                    onClick={() => handleGenerateMeet(selectedBooking)}
                    disabled={generatingMeetId === selectedBooking.id}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{generatingMeetId === selectedBooking.id ? 'Generating...' : 'Generate Meeting Link'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* CLIENT NOTES */}
            <div className="space-y-1.5">
              <label className="block font-mono text-xs font-bold text-slate-400">CLIENT NOTES / INQUIRY</label>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 font-mono text-xs text-slate-300 leading-relaxed">
                {selectedBooking.notes || 'No additional notes provided by client.'}
              </div>
            </div>

            {/* EDIT STATUS & ADMIN NOTES FORM */}
            <div className="space-y-4 pt-4 border-t border-white/10 font-sans text-xs">
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
                  rows={3}
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
