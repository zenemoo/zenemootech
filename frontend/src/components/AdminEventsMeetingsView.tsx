import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Handshake,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Video,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit,
  Mail,
  Phone,
  Building,
  User,
  FileText,
  X,
  ChevronDown,
  Send,
  Eye,
  Sparkles,
  AlertCircle,
  Tag,
  MapPin,
  Lock,
  CalendarCheck,
  CalendarX,
  Info,
} from 'lucide-react';
import { bookingApi } from '../services/api';

export interface AdminEventRecord {
  id: string;
  event_id: string;
  event_type: 'internal_event' | 'client_meeting';
  title: string;
  description?: string;
  agenda?: string;
  internal_notes?: string;
  client_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  project_or_service?: string;
  meeting_purpose?: string;
  attendees?: Array<{ name: string; email: string }>;
  event_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  duration_minutes: number;
  location?: string;
  google_calendar_event_id?: string;
  google_meet_url?: string;
  meeting_status?: 'pending' | 'generating' | 'generated' | 'failed' | 'cancelled' | 'not_applicable';
  status: 'draft' | 'scheduled' | 'completed' | 'cancelled';
  notify_attendees?: boolean;
  customer_email_status?: 'pending' | 'sent' | 'failed' | 'not_applicable';
  admin_email_status?: 'pending' | 'sent' | 'failed' | 'not_applicable';
  customer_email_sent_at?: string;
  admin_email_sent_at?: string;
  customer_email_error?: string;
  admin_email_error?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  cancelled_at?: string;
  completed_at?: string;
}

interface AdminEventsMeetingsViewProps {
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, opts?: any) => void;
}

export const AdminEventsMeetingsView: React.FC<AdminEventsMeetingsViewProps> = ({ addToast, showConfirm }) => {
  const [events, setEvents] = useState<AdminEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'internal_event' | 'client_meeting'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEventRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formType, setFormType] = useState<'internal_event' | 'client_meeting'>('client_meeting');
  const [formTitle, setFormTitle] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formProject, setFormProject] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAgenda, setFormAgenda] = useState('');
  const [formInternalNotes, setFormInternalNotes] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState('11:00');
  const [formEndTime, setFormEndTime] = useState('12:00');
  const [formStatus, setFormStatus] = useState<'scheduled' | 'draft'>('scheduled');
  const [formGenerateMeet, setFormGenerateMeet] = useState(true);
  const [formSendEmail, setFormSendEmail] = useState(true);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeesList, setAttendeesList] = useState<Array<{ name: string; email: string }>>([]);

  // Conflict Checking State
  const [conflictChecking, setConflictChecking] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{ hasConflict: boolean; message?: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch Events
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getAdminEvents({
        eventType: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });

      if (res.data?.success && Array.isArray(res.data?.events)) {
        setEvents(res.data.events);
      } else {
        setEvents([]);
      }
    } catch (err: any) {
      addToast('Failed to load events', err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, searchQuery, addToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('Copied to Clipboard', text, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Convert HH:mm local time on formDate to UTC ISO string
  const getIsoFromDateAndTime = (dateStr: string, timeStr: string): string => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hour, minute] = timeStr.split(':').map(Number);
      // Create date interpreting as Asia/Kolkata (IST = UTC + 05:30)
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - istOffsetMs;
      return new Date(utcMs).toISOString();
    } catch (_) {
      return '';
    }
  };

  // Real-time Conflict Check
  const checkConflict = useCallback(async (dateStr: string, startStr: string, endStr: string, currentId?: string) => {
    if (!dateStr || !startStr || !endStr) return;
    const startIso = getIsoFromDateAndTime(dateStr, startStr);
    const endIso = getIsoFromDateAndTime(dateStr, endStr);

    if (!startIso || !endIso || new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setConflictInfo({ hasConflict: false });
      return;
    }

    setConflictChecking(true);
    try {
      const res = await bookingApi.checkEventConflict({
        startTimeIso: startIso,
        endTimeIso: endIso,
        excludeEventId: currentId,
      });

      if (res.data?.success) {
        setConflictInfo({
          hasConflict: res.data.hasConflict,
          message: res.data.message,
        });
      }
    } catch (_) {
      setConflictInfo(null);
    } finally {
      setConflictChecking(false);
    }
  }, []);

  // Debounced check conflict on date/time change
  useEffect(() => {
    if (!isModalOpen) return;
    const timer = setTimeout(() => {
      checkConflict(formDate, formStartTime, formEndTime, editingEvent?.id);
    }, 400);
    return () => clearTimeout(timer);
  }, [formDate, formStartTime, formEndTime, isModalOpen, editingEvent, checkConflict]);

  // Open Create Modal
  const handleOpenCreateModal = (defaultType: 'internal_event' | 'client_meeting' = 'client_meeting') => {
    setEditingEvent(null);
    setFormType(defaultType);
    setFormTitle('');
    setFormClientName('');
    setFormCompanyName('');
    setFormEmail('');
    setFormPhone('');
    setFormProject('');
    setFormPurpose('');
    setFormDescription('');
    setFormAgenda('');
    setFormInternalNotes('');
    setFormLocation('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormStartTime('11:00');
    setFormEndTime('12:00');
    setFormStatus('scheduled');
    setFormGenerateMeet(true);
    setFormSendEmail(true);
    setAttendeesList([]);
    setConflictInfo(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (event: AdminEventRecord) => {
    setEditingEvent(event);
    setFormType(event.event_type);
    setFormTitle(event.title || '');
    setFormClientName(event.client_name || '');
    setFormCompanyName(event.company_name || '');
    setFormEmail(event.email || '');
    setFormPhone(event.phone || '');
    setFormProject(event.project_or_service || '');
    setFormPurpose(event.meeting_purpose || '');
    setFormDescription(event.description || '');
    setFormAgenda(event.agenda || '');
    setFormInternalNotes(event.internal_notes || '');
    setFormLocation(event.location || '');
    setFormDate(event.event_date);

    // Extract HH:mm from start_time / end_time in IST
    try {
      const getIstTime = (iso: string) => {
        const d = new Date(iso);
        return new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(d);
      };
      setFormStartTime(getIstTime(event.start_time));
      setFormEndTime(getIstTime(event.end_time));
    } catch (_) {
      setFormStartTime('11:00');
      setFormEndTime('12:00');
    }

    setFormStatus(event.status === 'draft' ? 'draft' : 'scheduled');
    setFormGenerateMeet(Boolean(event.google_meet_url));
    setFormSendEmail(false); // Default off for edits to avoid accidental resend
    setAttendeesList(Array.isArray(event.attendees) ? event.attendees : []);
    setConflictInfo(null);
    setIsModalOpen(true);
  };

  // Add Attendee Tag
  const handleAddAttendee = () => {
    if (!attendeeEmail.trim() || !attendeeEmail.includes('@')) {
      addToast('Invalid Attendee Email', 'Please enter a valid email address.', 'warning');
      return;
    }
    const newAttendee = {
      name: attendeeName.trim() || attendeeEmail.split('@')[0],
      email: attendeeEmail.trim().toLowerCase(),
    };
    if (attendeesList.some((a) => a.email.toLowerCase() === newAttendee.email)) {
      addToast('Duplicate Attendee', 'This email is already in the attendee list.', 'warning');
      return;
    }
    setAttendeesList([...attendeesList, newAttendee]);
    setAttendeeName('');
    setAttendeeEmail('');
  };

  const handleRemoveAttendee = (emailToRemove: string) => {
    setAttendeesList(attendeesList.filter((a) => a.email !== emailToRemove));
  };

  // Submit Save
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formDate) {
      addToast('Missing Date', 'Please select a date for the event.', 'warning');
      return;
    }

    const startIso = getIsoFromDateAndTime(formDate, formStartTime);
    const endIso = getIsoFromDateAndTime(formDate, formEndTime);

    if (!startIso || !endIso || new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      addToast('Invalid Time Range', 'End time must be later than start time.', 'warning');
      return;
    }

    if (formType === 'client_meeting' && !formClientName.trim()) {
      addToast('Missing Client Name', 'Client name is required for client meetings.', 'warning');
      return;
    }

    if (formType === 'internal_event' && !formTitle.trim()) {
      addToast('Missing Title', 'Event title is required.', 'warning');
      return;
    }

    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    const durationMinutes = Math.round((endMs - startMs) / 60000);

    const payload = {
      event_type: formType,
      title: formType === 'internal_event' ? formTitle.trim() : (formTitle.trim() || `Meeting with ${formClientName.trim()}`),
      client_name: formClientName.trim(),
      company_name: formCompanyName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      project_or_service: formProject.trim(),
      meeting_purpose: formPurpose.trim(),
      description: formDescription.trim(),
      agenda: formAgenda.trim(),
      internal_notes: formInternalNotes.trim(),
      location: formLocation.trim(),
      event_date: formDate,
      start_time: startIso,
      end_time: endIso,
      timezone: 'Asia/Kolkata',
      duration_minutes: durationMinutes,
      status: formStatus,
      notify_attendees: formType === 'internal_event' && formSendEmail,
      generateGoogleMeet: formGenerateMeet,
      sendClientEmail: formType === 'client_meeting' && formSendEmail,
      attendees: attendeesList,
    };

    setSaving(true);
    try {
      if (editingEvent) {
        const res = await bookingApi.updateAdminEvent(editingEvent.id, payload);
        if (res.data?.success) {
          addToast('Event Updated', 'Event details saved successfully.', 'success');
          setIsModalOpen(false);
          fetchEvents();
        }
      } else {
        const res = await bookingApi.createAdminEvent(payload);
        if (res.data?.success) {
          addToast(
            formType === 'client_meeting' ? 'Client Meeting Scheduled' : 'Internal Event Created',
            `ID: ${res.data.event?.event_id}`,
            'success'
          );
          setIsModalOpen(false);
          fetchEvents();
        }
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        addToast('Scheduling Conflict', err.response?.data?.message || 'Time slot overlaps with an existing booking or event.', 'error');
      } else {
        addToast('Failed to Save Event', err.response?.data?.message || err.message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // Cancel Event
  const handleCancelEvent = (event: AdminEventRecord) => {
    showConfirm(
      'Cancel Event / Meeting?',
      `Are you sure you want to cancel "${event.title}" (${event.event_id})? This will immediately release the reserved time slot for public booking.`,
      async () => {
        try {
          await bookingApi.updateAdminEvent(event.id, { status: 'cancelled' });
          addToast('Event Cancelled', `Event ${event.event_id} marked as cancelled and time slot released.`, 'info');
          fetchEvents();
        } catch (err: any) {
          addToast('Cancellation Failed', err.response?.data?.message || err.message, 'error');
        }
      }
    );
  };

  // Delete Event
  const handleDeleteEvent = (event: AdminEventRecord) => {
    showConfirm(
      'Delete Event Permanently?',
      `Delete event "${event.title}" (${event.event_id})? This action cannot be undone.`,
      async () => {
        try {
          await bookingApi.deleteAdminEvent(event.id);
          addToast('Event Deleted', 'Event removed successfully.', 'info');
          fetchEvents();
        } catch (err: any) {
          addToast('Delete Failed', err.response?.data?.message || err.message, 'error');
        }
      }
    );
  };

  // Resend Client Email
  const handleResendEmail = async (event: AdminEventRecord) => {
    if (!event.email) {
      addToast('No Client Email', 'This event does not have an associated client email address.', 'warning');
      return;
    }
    showConfirm(
      'Resend Meeting Confirmation?',
      `Resend branded meeting confirmation email to ${event.email}?`,
      async () => {
        try {
          const res = await bookingApi.resendClientMeetingEmail(event.id);
          if (res.data?.success) {
            addToast('Email Sent', `Confirmation email delivered to ${event.email}.`, 'success');
            fetchEvents();
          }
        } catch (err: any) {
          addToast('Resend Failed', err.response?.data?.message || err.message, 'error');
        }
      }
    );
  };

  // Generate Google Meet on demand
  const handleGenerateMeet = async (event: AdminEventRecord) => {
    try {
      const res = await bookingApi.generateMeetingForAdminEvent(event.id);
      if (res.data?.success) {
        addToast('Google Meet Ready', 'Meeting room link generated.', 'success');
        fetchEvents();
      }
    } catch (err: any) {
      addToast('Meet Generation Failed', err.response?.data?.message || err.message, 'error');
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const total = events.length;
    const clientMeetings = events.filter((e) => e.event_type === 'client_meeting' && e.status === 'scheduled').length;
    const internalEvents = events.filter((e) => e.event_type === 'internal_event' && e.status === 'scheduled').length;
    const drafts = events.filter((e) => e.status === 'draft').length;
    return { total, clientMeetings, internalEvents, drafts };
  }, [events]);

  return (
    <div className="space-y-6 font-sans">
      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#0b0f19] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400">Total Events</div>
            <div className="text-xl sm:text-2xl font-bold font-display text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0b0f19] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400">Client Meetings</div>
            <div className="text-xl sm:text-2xl font-bold font-display text-cyan-400 mt-0.5">{stats.clientMeetings}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Handshake className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0b0f19] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400">Internal Trainings</div>
            <div className="text-xl sm:text-2xl font-bold font-display text-purple-400 mt-0.5">{stats.internalEvents}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0b0f19] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400">Drafts (Non-blocking)</div>
            <div className="text-xl sm:text-2xl font-bold font-display text-amber-400 mt-0.5">{stats.drafts}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER & ACTION TOOLBAR */}
      <div className="bg-[#0b0f19] p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search events, clients, emails, IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all" className="bg-[#0b0f19]">All Event Types</option>
            <option value="client_meeting" className="bg-[#0b0f19]">🤝 Client Meetings</option>
            <option value="internal_event" className="bg-[#0b0f19]">🏢 Internal Events</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all" className="bg-[#0b0f19]">All Statuses</option>
            <option value="scheduled" className="bg-[#0b0f19]">🟢 Scheduled (Blocking)</option>
            <option value="draft" className="bg-[#0b0f19]">🟡 Draft (Non-blocking)</option>
            <option value="completed" className="bg-[#0b0f19]">⚪ Completed</option>
            <option value="cancelled" className="bg-[#0b0f19]">🔴 Cancelled</option>
          </select>

          <button
            type="button"
            onClick={fetchEvents}
            disabled={loading}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Action Button: Schedule New Event */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenCreateModal('client_meeting')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> Schedule Client Meeting
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateModal('internal_event')}
            className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-purple-300 border border-purple-500/30 font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" /> Internal Event
          </button>
        </div>
      </div>

      {/* EVENT LIST TABLE / CARDS */}
      <div className="bg-[#0b0f19] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            Loading events and meetings...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-3">
            <CalendarX className="w-8 h-8 text-slate-600" />
            <div className="text-white font-bold text-sm">No Events or Meetings Found</div>
            <p className="text-slate-500 max-w-sm">
              Schedule your first internal training or client meeting using the buttons above. Active scheduled events automatically reserve time on the public availability calendar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4">Type &amp; Status</th>
                  <th className="py-3 px-4">Schedule (IST)</th>
                  <th className="py-3 px-4">Connection / Meet</th>
                  <th className="py-3 px-4">Email Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs font-sans">
                {events.map((event) => {
                  const isClient = event.event_type === 'client_meeting';
                  const isScheduled = event.status === 'scheduled';
                  const isDraft = event.status === 'draft';
                  const isCancelled = event.status === 'cancelled';

                  const formatTimeStr = (iso: string) => {
                    try {
                      return new Intl.DateTimeFormat('en-US', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      }).format(new Date(iso));
                    } catch (_) {
                      return '';
                    }
                  };

                  return (
                    <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Event Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${isClient ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>
                            {isClient ? <Handshake className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                              {event.title}
                              <button
                                type="button"
                                onClick={() => handleCopy(event.event_id, event.id)}
                                className="font-mono text-[10px] text-slate-500 hover:text-slate-300 bg-white/[0.04] px-1.5 py-0.5 rounded cursor-pointer"
                                title="Click to copy ID"
                              >
                                {copiedId === event.id ? <Check className="w-2.5 h-2.5 text-emerald-400 inline" /> : event.event_id}
                              </button>
                            </div>
                            {isClient ? (
                              <div className="text-slate-400 text-xs mt-0.5">
                                {event.client_name} {event.company_name ? `• ${event.company_name}` : ''}
                                {event.email ? ` (${event.email})` : ''}
                              </div>
                            ) : (
                              <div className="text-slate-400 text-xs mt-0.5">
                                {Array.isArray(event.attendees) && event.attendees.length > 0 ? (
                                  <span>{event.attendees.length} attendee(s) invited</span>
                                ) : (
                                  <span className="text-slate-500">No external attendees</span>
                                )}
                              </div>
                            )}
                            {event.meeting_purpose && (
                              <div className="text-slate-500 text-[11px] mt-1 line-clamp-1 italic">
                                "{event.meeting_purpose}"
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type & Status */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isClient
                              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                              : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          }`}>
                            {isClient ? 'CLIENT MEETING' : 'INTERNAL EVENT'}
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isScheduled
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : isDraft
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : isCancelled
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 line-through'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                          }`}>
                            {event.status.toUpperCase()}
                            {isScheduled ? ' (BLOCKING)' : ''}
                          </span>
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="text-slate-200 font-semibold">{event.event_date}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {formatTimeStr(event.start_time)} – {formatTimeStr(event.end_time)}
                        </div>
                        <div className="text-slate-500 text-[10px]">
                          {event.duration_minutes} mins ({event.timezone || 'Asia/Kolkata'})
                        </div>
                      </td>

                      {/* Connection / Meet */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {event.google_meet_url ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={event.google_meet_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5 text-xs font-bold transition-all"
                            >
                              <Video className="w-3.5 h-3.5" /> Join Meet
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopy(event.google_meet_url!, `meet-${event.id}`)}
                              className="p-1 rounded text-slate-400 hover:text-white"
                              title="Copy Meet Link"
                            >
                              {copiedId === `meet-${event.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : event.location ? (
                          <div className="text-slate-300 text-xs flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[140px]">{event.location}</span>
                          </div>
                        ) : isScheduled ? (
                          <button
                            type="button"
                            onClick={() => handleGenerateMeet(event)}
                            className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Video className="w-3 h-3 text-cyan-400" /> Generate Meet
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Email Status */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {isClient && event.email ? (
                          <div className="space-y-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 ${
                              event.customer_email_status === 'sent'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : event.customer_email_status === 'failed'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {event.customer_email_status === 'sent' ? <CheckCircle2 className="w-2.5 h-2.5" /> : null}
                              Client Email: {event.customer_email_status || 'pending'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isClient && event.email && (
                            <button
                              type="button"
                              onClick={() => handleResendEmail(event)}
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
                              title="Resend Client Confirmation Email"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(event)}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                            title="Edit Event"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {event.status !== 'cancelled' ? (
                            <button
                              type="button"
                              onClick={() => handleCancelEvent(event)}
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                              title="Cancel Event (Release Time Slot)"
                            >
                              <CalendarX className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(event)}
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                              title="Delete Permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0b0f19] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  {editingEvent ? 'Edit Scheduled Event' : 'Schedule New Event or Client Meeting'}
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-display text-white mt-1">
                  {editingEvent ? editingEvent.title : (formType === 'client_meeting' ? 'Schedule Client Meeting' : 'Schedule Internal Training / Event')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEvent} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Event Type Switcher (only for new events) */}
              {!editingEvent && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2">EVENT TYPE</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormType('client_meeting')}
                      className={`p-3 rounded-2xl border font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formType === 'client_meeting'
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/10'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      <Handshake className="w-4 h-4" /> Client Meeting
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('internal_event')}
                      className={`p-3 rounded-2xl border font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formType === 'internal_event'
                          ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/10'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      <Users className="w-4 h-4" /> Internal Event / Training
                    </button>
                  </div>
                </div>
              )}

              {/* CLIENT MEETING SPECIFIC FIELDS */}
              {formType === 'client_meeting' && (
                <div className="space-y-4 bg-cyan-500/[0.03] p-4 rounded-2xl border border-cyan-500/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">CLIENT NAME *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Connor"
                        value={formClientName}
                        onChange={(e) => setFormClientName(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">COMPANY NAME *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Cyberdyne Systems"
                        value={formCompanyName}
                        onChange={(e) => setFormCompanyName(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">CLIENT EMAIL</label>
                      <input
                        type="email"
                        placeholder="client@company.com"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">PHONE / WHATSAPP</label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">MEETING TITLE</label>
                      <input
                        type="text"
                        placeholder="e.g. AI Data Pipeline Strategy"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">PROJECT / SERVICE</label>
                      <input
                        type="text"
                        placeholder="e.g. LLM Speech Corpus"
                        value={formProject}
                        onChange={(e) => setFormProject(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">PURPOSE &amp; NOTES FOR CLIENT</label>
                    <textarea
                      rows={2}
                      placeholder="Outline meeting topics, objectives, or instructions for the client..."
                      value={formPurpose}
                      onChange={(e) => setFormPurpose(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* INTERNAL EVENT SPECIFIC FIELDS */}
              {formType === 'internal_event' && (
                <div className="space-y-4 bg-purple-500/[0.03] p-4 rounded-2xl border border-purple-500/20">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">EVENT TITLE *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Weekly Engineering Sync & Architecture Review"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">DEPARTMENT / PROJECT</label>
                      <input
                        type="text"
                        placeholder="e.g. AI Annotation Platform"
                        value={formProject}
                        onChange={(e) => setFormProject(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">PHYSICAL LOCATION / LINK</label>
                      <input
                        type="text"
                        placeholder="e.g. Conference Room A or Custom Link"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">DESCRIPTION &amp; AGENDA</label>
                    <textarea
                      rows={2}
                      placeholder="Event overview, agenda items, key talking points..."
                      value={formAgenda}
                      onChange={(e) => setFormAgenda(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Attendees builder */}
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">ATTENDEES (OPTIONAL)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={attendeeName}
                        onChange={(e) => setAttendeeName(e.target.value)}
                        className="w-1/3 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                      <input
                        type="email"
                        placeholder="attendee@zenemoo.in"
                        value={attendeeEmail}
                        onChange={(e) => setAttendeeEmail(e.target.value)}
                        className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddAttendee}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold hover:bg-purple-500/30 cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>

                    {attendeesList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {attendeesList.map((a) => (
                          <span
                            key={a.email}
                            className="bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-300 flex items-center gap-1.5"
                          >
                            <span>{a.name} ({a.email})</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttendee(a.email)}
                              className="text-slate-500 hover:text-rose-400"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DATE & TIME SCHEDULING (SHARED) */}
              <div className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/10">
                <div className="text-xs font-mono text-slate-300 font-bold flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" /> SCHEDULE (ASIA/KOLKATA TIMEZONE)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">DATE *</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">START TIME (IST) *</label>
                    <input
                      type="time"
                      required
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">END TIME (IST) *</label>
                    <input
                      type="time"
                      required
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                {/* LIVE CONFLICT WARNING BANNER */}
                {conflictChecking ? (
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 text-xs font-mono flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" /> Checking availability conflicts...
                  </div>
                ) : conflictInfo?.hasConflict ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">⚠️ Scheduling Conflict Detected</div>
                      <div className="text-[11px] text-rose-200/80 mt-0.5">{conflictInfo.message}</div>
                    </div>
                  </div>
                ) : conflictInfo && !conflictInfo.hasConflict ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Time slot is clear &amp; available (no overlapping bookings or events).</span>
                  </div>
                ) : null}
              </div>

              {/* OPTIONS & TOGGLES */}
              <div className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/10">
                <div className="text-xs font-mono text-slate-300 font-bold">EVENT OPTIONS</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">STATUS</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="scheduled" className="bg-[#0b0f19]">🟢 Scheduled (Locks Public Availability)</option>
                      <option value="draft" className="bg-[#0b0f19]">🟡 Draft (Tentative - Does Not Block Slots)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">INTERNAL ADMIN NOTES</label>
                    <input
                      type="text"
                      placeholder="Private notes (never shown to client)..."
                      value={formInternalNotes}
                      onChange={(e) => setFormInternalNotes(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2 border-t border-white/[0.06]">
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formGenerateMeet}
                      onChange={(e) => setFormGenerateMeet(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span>Automatically generate Google Calendar event &amp; Google Meet link</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formSendEmail}
                      onChange={(e) => setFormSendEmail(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span>
                      {formType === 'client_meeting'
                        ? 'Send branded meeting confirmation email to client upon save'
                        : 'Send email invitation to listed attendees upon save'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || (conflictInfo?.hasConflict && formStatus === 'scheduled')}
                  className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                    conflictInfo?.hasConflict && formStatus === 'scheduled'
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-cyan-500/20'
                  }`}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-3.5 h-3.5" /> {editingEvent ? 'Save Changes' : 'Confirm & Schedule'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEventsMeetingsView;
