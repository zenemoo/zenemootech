import { supabase } from '../config/supabase.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const LOCAL_STORE_PATH = path.resolve('src/database/admin_events_store.json');

/**
 * Lightweight columns selected for list views to minimize payload egress.
 * Excludes heavy JSON attendee arrays, raw agendas, and error stacks.
 */
const EVENT_LIST_COLUMNS = 'id, event_id, event_type, title, client_name, company_name, email, phone, project_or_service, event_date, start_time, end_time, timezone, duration_minutes, location, google_meet_url, meeting_status, status, notify_attendees, customer_email_status, admin_email_status, customer_reminder_status, admin_reminder_status, created_at, updated_at';

/**
 * Utility to generate a unique Event Code
 * Format: ZEN-EVT-XXXXX (Internal Event) or ZEN-CLT-XXXXX (Client Meeting)
 */
const generateEventCode = (eventType = 'internal_event') => {
  const prefix = eventType === 'client_meeting' ? 'ZEN-CLT' : 'ZEN-EVT';
  const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${randomChars}`;
};

/**
 * Clean and sanitize ID for query
 */
const sanitizeId = (id) => {
  if (!id || typeof id !== 'string') return '';
  return id.trim();
};

export class AdminEventService {
  constructor() {
    this.ensureLocalStore();
  }

  ensureLocalStore() {
    try {
      const dir = path.dirname(LOCAL_STORE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(LOCAL_STORE_PATH)) {
        fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (err) {
      console.warn('[AdminEventService Store Init Warning]:', err.message);
    }
  }

  readLocalStore() {
    try {
      this.ensureLocalStore();
      const content = fs.readFileSync(LOCAL_STORE_PATH, 'utf-8');
      return JSON.parse(content) || [];
    } catch (err) {
      console.warn('[AdminEventService Read Local Store Warning]:', err.message);
      return [];
    }
  }

  writeLocalStore(events) {
    try {
      this.ensureLocalStore();
      fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(events, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.warn('[AdminEventService File Store Warning]:', err.message);
      return false;
    }
  }

  /**
   * Get all active scheduled events on a given date (for shared availability calculations)
   */
  async getActiveEventsOnDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return [];

    let events = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_events')
          .select('id, event_id, title, event_type, start_time, end_time, status')
          .eq('event_date', dateStr)
          .eq('status', 'scheduled');

        if (!error && Array.isArray(data)) {
          events = data;
        }
      } catch (err) {
        console.warn('[AdminEventService Supabase Query Note]:', err.message);
      }
    }

    // Always merge with local store to ensure local events and fallback records are included
    const localEvents = this.readLocalStore();
    const localMatches = localEvents.filter(
      (e) => e.event_date === dateStr && e.status === 'scheduled'
    );
    const map = new Map();
    for (const e of events) map.set(e.id, e);
    for (const e of localMatches) map.set(e.id, e);
    return Array.from(map.values());
  }

  /**
   * Check whether a proposed time interval [startTimeIso, endTimeIso] conflicts with
   * any active booking in call_bookings OR any active event in admin_events.
   * Interval overlap formula: startA < endB && endA > startB
   *
   * Query Optimization: Queries are strictly windowed to ±24 hours around the proposed interval
   * instead of scanning full tables, eliminating 99%+ egress on large datasets.
   */
  async checkIntervalConflict({ startTimeIso, endTimeIso, excludeEventId = null, excludeBookingId = null }) {
    const propStart = new Date(startTimeIso).getTime();
    const propEnd = new Date(endTimeIso).getTime();

    if (isNaN(propStart) || isNaN(propEnd) || propEnd <= propStart) {
      return { hasConflict: false };
    }

    const minBoundIso = new Date(propStart - 24 * 60 * 60 * 1000).toISOString();
    const maxBoundIso = new Date(propEnd + 24 * 60 * 60 * 1000).toISOString();

    // 1. Check against call_bookings (status IN ('confirmed', 'pending')) bounded by date window
    if (supabase) {
      try {
        let query = supabase
          .from('call_bookings')
          .select('id, booking_id, full_name, company_name, start_time, end_time, status')
          .in('status', ['confirmed', 'pending'])
          .gte('start_time', minBoundIso)
          .lte('start_time', maxBoundIso);

        if (excludeBookingId) {
          query = query.neq('id', excludeBookingId).neq('booking_id', excludeBookingId);
        }

        const { data: bookings, error } = await query;
        if (!error && Array.isArray(bookings)) {
          for (const b of bookings) {
            const bStart = new Date(b.start_time).getTime();
            const bEnd = new Date(b.end_time).getTime();
            if (propStart < bEnd && propEnd > bStart) {
              return {
                hasConflict: true,
                conflictType: 'public_booking',
                conflictingRecord: {
                  id: b.id,
                  reference: b.booking_id,
                  title: `${b.full_name} (${b.company_name})`,
                  start_time: b.start_time,
                  end_time: b.end_time,
                  status: b.status,
                },
                message: `Overlaps with call booking ${b.booking_id} (${new Date(b.start_time).toLocaleTimeString()} – ${new Date(b.end_time).toLocaleTimeString()}).`,
              };
            }
          }
        }
      } catch (err) {
        console.warn('[Conflict Check Bookings Note]:', err.message);
      }
    }

    // 2. Check against admin_events (status = 'scheduled') bounded by date window
    let adminEventsList = [];
    if (supabase) {
      try {
        let query = supabase
          .from('admin_events')
          .select('id, event_id, title, client_name, company_name, start_time, end_time, status')
          .eq('status', 'scheduled')
          .gte('start_time', minBoundIso)
          .lte('start_time', maxBoundIso);

        if (excludeEventId) {
          query = query.neq('id', excludeEventId).neq('event_id', excludeEventId);
        }

        const { data: events, error } = await query;
        if (!error && Array.isArray(events)) {
          adminEventsList = events;
        }
      } catch (err) {
        console.warn('[Conflict Check Admin Events Note]:', err.message);
      }
    }

    if (adminEventsList.length === 0) {
      const localEvents = this.readLocalStore();
      adminEventsList = localEvents.filter((e) => {
        if (e.status !== 'scheduled') return false;
        if (excludeEventId && (e.id === excludeEventId || e.event_id === excludeEventId)) return false;
        const eStart = new Date(e.start_time).getTime();
        return eStart >= (propStart - 24 * 60 * 60 * 1000) && eStart <= (propEnd + 24 * 60 * 60 * 1000);
      });
    }

    for (const e of adminEventsList) {
      const eStart = new Date(e.start_time).getTime();
      const eEnd = new Date(e.end_time).getTime();
      if (propStart < eEnd && propEnd > eStart) {
        return {
          hasConflict: true,
          conflictType: 'admin_event',
          conflictingRecord: {
            id: e.id,
            reference: e.event_id,
            title: e.title || e.client_name || 'Admin Event',
            start_time: e.start_time,
            end_time: e.end_time,
            status: e.status,
          },
          message: `Overlaps with scheduled event ${e.event_id} (${e.title}) from ${new Date(e.start_time).toLocaleTimeString()} to ${new Date(e.end_time).toLocaleTimeString()}.`,
        };
      }
    }

    return { hasConflict: false };
  }

  /**
   * List Admin Events with server-side pagination, search, type, status, and date filtering.
   * Uses lightweight EVENT_LIST_COLUMNS to minimize egress.
   */
  async getEvents({
    eventType,
    status,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 10,
    sortBy = 'newest',
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = [10, 20, 30].includes(parseInt(limit, 10)) ? parseInt(limit, 10) : 10;
    const offset = (pageNum - 1) * limitNum;

    if (supabase) {
      try {
        let query = supabase
          .from('admin_events')
          .select(EVENT_LIST_COLUMNS, { count: 'exact' });

        if (eventType && eventType !== 'all') {
          query = query.eq('event_type', eventType);
        }
        if (status && status !== 'all') {
          query = query.eq('status', status);
        }
        if (startDate) {
          query = query.gte('event_date', startDate);
        }
        if (endDate) {
          query = query.lte('event_date', endDate);
        }
        if (search) {
          const cleanSearch = search.trim();
          query = query.or(`title.ilike.%${cleanSearch}%,client_name.ilike.%${cleanSearch}%,company_name.ilike.%${cleanSearch}%,event_id.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`);
        }

        // Apply Sorting
        if (sortBy === 'oldest') {
          query = query.order('start_time', { ascending: true });
        } else if (sortBy === 'upcoming') {
          query = query.order('start_time', { ascending: true });
        } else {
          // newest default
          query = query.order('created_at', { ascending: false });
        }

        query = query.range(offset, offset + limitNum - 1);

        const { data, error, count } = await query;
        if (!error && Array.isArray(data)) {
          const totalCount = count !== null ? count : data.length;
          const totalPages = Math.ceil(totalCount / limitNum) || 1;
          return {
            events: data,
            totalCount,
            page: pageNum,
            limit: limitNum,
            totalPages,
          };
        }
      } catch (err) {
        console.warn('[AdminEventService getEvents Supabase Note]:', err.message);
      }
    }

    // Fallback: Local JSON Store
    let events = this.readLocalStore();
    if (eventType && eventType !== 'all') {
      events = events.filter((e) => e.event_type === eventType);
    }
    if (status && status !== 'all') {
      events = events.filter((e) => e.status === status);
    }
    if (startDate) {
      events = events.filter((e) => e.event_date >= startDate);
    }
    if (endDate) {
      events = events.filter((e) => e.event_date <= endDate);
    }
    if (search) {
      const q = search.toLowerCase();
      events = events.filter((e) =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.client_name || '').toLowerCase().includes(q) ||
        (e.company_name || '').toLowerCase().includes(q) ||
        (e.event_id || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'oldest') {
      events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    } else if (sortBy === 'upcoming') {
      events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    } else {
      events.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    const totalCount = events.length;
    const paginatedEvents = events.slice(offset, offset + limitNum);
    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    return {
      events: paginatedEvents,
      totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages,
    };
  }

  /**
   * Get single Event by ID or event_id (Fetches complete record including attendees & internal notes on demand)
   */
  async getEventById(idOrCode) {
    const clean = sanitizeId(idOrCode);
    if (!clean) return null;

    const localEvents = this.readLocalStore();
    const local = localEvents.find((e) => e.id === clean || e.event_id === clean);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_events')
          .select('*')
          .or(`id.eq.${clean},event_id.eq.${clean}`)
          .maybeSingle();

        if (!error && data) {
          if (!local) return data;
          const merged = { ...local };
          for (const [k, v] of Object.entries(data)) {
            if (v !== undefined && v !== null) {
              merged[k] = v;
            } else if (v === null && merged[k] === undefined) {
              merged[k] = null;
            }
          }
          return merged;
        }
      } catch (_) {}
    }

    return local || null;
  }

  /**
   * Create a new Admin Event / Client Meeting
   */
  async createEvent(eventData, adminUser = { email: 'admin' }) {
    const {
      event_type = 'internal_event',
      title,
      description = '',
      agenda = '',
      internal_notes = '',
      client_name = '',
      company_name = '',
      email = '',
      phone = '',
      project_or_service = '',
      meeting_purpose = '',
      attendees = [],
      event_date,
      start_time,
      end_time,
      timezone = 'Asia/Kolkata',
      duration_minutes = 30,
      location = '',
      status = 'scheduled',
      notify_attendees = false,
      google_meet_url = null,
      google_calendar_event_id = null,
      meeting_status = 'pending',
    } = eventData;

    const eventId = generateEventCode(event_type);
    const nowIso = new Date().toISOString();

    const record = {
      id: crypto.randomUUID(),
      event_id: eventId,
      event_type,
      title: (title || (event_type === 'client_meeting' ? `Meeting with ${client_name || 'Client'}` : 'Internal Event')).trim(),
      description: description.trim(),
      agenda: agenda.trim(),
      internal_notes: internal_notes.trim(),
      client_name: client_name.trim(),
      company_name: company_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      project_or_service: project_or_service.trim(),
      meeting_purpose: meeting_purpose.trim(),
      attendees: Array.isArray(attendees) ? attendees : [],
      event_date,
      start_time,
      end_time,
      timezone,
      duration_minutes: parseInt(duration_minutes, 10) || 30,
      location: location.trim(),
      status: ['draft', 'scheduled', 'completed', 'cancelled'].includes(status) ? status : 'scheduled',
      notify_attendees: Boolean(notify_attendees),
      google_meet_url,
      google_calendar_event_id,
      meeting_status,
      customer_email_status: event_type === 'client_meeting' && email ? 'pending' : 'not_applicable',
      admin_email_status: 'pending',
      customer_email_sent_at: null,
      admin_email_sent_at: null,
      customer_email_error: null,
      admin_email_error: null,
      customer_reminder_status: event_type === 'client_meeting' && email ? 'pending' : 'not_applicable',
      admin_reminder_status: 'not_applicable',
      customer_reminder_sent_at: null,
      admin_reminder_sent_at: null,
      customer_reminder_error: null,
      admin_reminder_error: null,
      created_by: adminUser?.email || 'admin',
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (supabase) {
      try {
        let { data, error } = await supabase
          .from('admin_events')
          .insert([record])
          .select()
          .single();

        // If reminder columns haven't been migrated yet to remote Supabase, retry without them
        if (error && (error.message.includes('schema cache') || error.message.includes('column'))) {
          const legacyPayload = { ...record };
          delete legacyPayload.customer_reminder_status;
          delete legacyPayload.admin_reminder_status;
          delete legacyPayload.customer_reminder_sent_at;
          delete legacyPayload.admin_reminder_sent_at;
          delete legacyPayload.customer_reminder_error;
          delete legacyPayload.admin_reminder_error;

          const retry = await supabase
            .from('admin_events')
            .insert([legacyPayload])
            .select()
            .single();

          if (!retry.error && retry.data) {
            data = { ...record, ...retry.data };
            error = null;
          }
        }

        if (!error && data) {
          const localEvents = this.readLocalStore();
          localEvents.unshift(data);
          this.writeLocalStore(localEvents);
          return data;
        } else if (error) {
          console.warn('[AdminEventService Supabase Insert Fallback]:', error.message);
        }
      } catch (err) {
        console.warn('[AdminEventService Insert Exception]:', err.message);
      }
    }

    const localEvents = this.readLocalStore();
    localEvents.unshift(record);
    this.writeLocalStore(localEvents);
    return record;
  }

  /**
   * Update an existing Admin Event / Client Meeting
   */
  async updateEvent(idOrCode, updateData, adminUser = { email: 'admin' }) {
    const existing = await this.getEventById(idOrCode);
    if (!existing) {
      throw new Error('Event not found.');
    }

    const nowIso = new Date().toISOString();
    const updated = {
      ...existing,
      ...updateData,
      updated_at: nowIso,
    };

    if (updateData.status === 'cancelled') {
      updated.cancelled_at = nowIso;
    } else if (updateData.status === 'completed') {
      updated.completed_at = nowIso;
    }

    if (supabase) {
      try {
        let { data, error } = await supabase
          .from('admin_events')
          .update(updated)
          .eq('id', existing.id)
          .select()
          .maybeSingle();

        if (error && (error.message.includes('schema cache') || error.message.includes('column'))) {
          const legacyUpdated = { ...updated };
          delete legacyUpdated.customer_reminder_status;
          delete legacyUpdated.admin_reminder_status;
          delete legacyUpdated.customer_reminder_sent_at;
          delete legacyUpdated.admin_reminder_sent_at;
          delete legacyUpdated.customer_reminder_error;
          delete legacyUpdated.admin_reminder_error;

          const retry = await supabase
            .from('admin_events')
            .update(legacyUpdated)
            .eq('id', existing.id)
            .select()
            .maybeSingle();

          if (!retry.error && retry.data) {
            data = { ...updated, ...retry.data };
            error = null;
          }
        }

        if (!error && data) {
          const localEvents = this.readLocalStore();
          const idx = localEvents.findIndex((e) => e.id === existing.id);
          if (idx !== -1) localEvents[idx] = data;
          this.writeLocalStore(localEvents);
          return data;
        }
      } catch (err) {
        console.warn('[AdminEventService Supabase Update Note]:', err.message);
      }
    }

    const localEvents = this.readLocalStore();
    const idx = localEvents.findIndex((e) => e.id === existing.id);
    if (idx !== -1) localEvents[idx] = updated;
    else localEvents.unshift(updated);
    this.writeLocalStore(localEvents);
    return updated;
  }

  /**
   * Delete an event (releases reserved time)
   */
  async deleteEvent(idOrCode) {
    const existing = await this.getEventById(idOrCode);
    if (!existing) {
      throw new Error('Event not found.');
    }

    if (supabase) {
      try {
        const { error } = await supabase
          .from('admin_events')
          .delete()
          .eq('id', existing.id);

        if (!error) {
          const localEvents = this.readLocalStore().filter((e) => e.id !== existing.id);
          this.writeLocalStore(localEvents);
          return true;
        }
      } catch (err) {
        console.warn('[AdminEventService Delete Note]:', err.message);
      }
    }

    const localEvents = this.readLocalStore().filter((e) => e.id !== existing.id);
    this.writeLocalStore(localEvents);
    return true;
  }

  /**
   * Query scheduled client meetings eligible for 1-hour reminders
   */
  async getScheduledClientMeetingsDueForReminder(minStartIso, maxStartIso) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_events')
          .select('*')
          .eq('event_type', 'client_meeting')
          .eq('status', 'scheduled')
          .in('customer_reminder_status', ['pending', null])
          .gte('start_time', minStartIso)
          .lte('start_time', maxStartIso);

        if (!error && Array.isArray(data)) {
          return data;
        }
      } catch (err) {
        console.warn('[getScheduledClientMeetingsDueForReminder Supabase Note]:', err.message);
      }
    }

    // Local Store Fallback
    const localEvents = this.readLocalStore();
    const minMs = new Date(minStartIso).getTime();
    const maxMs = new Date(maxStartIso).getTime();

    return localEvents.filter((e) => {
      if (e.event_type !== 'client_meeting' || e.status !== 'scheduled') return false;
      if (e.customer_reminder_status && e.customer_reminder_status !== 'pending') return false;
      const sMs = new Date(e.start_time).getTime();
      return sMs >= minMs && sMs <= maxMs;
    });
  }

  /**
   * Atomically claim a client meeting reminder to prevent concurrent duplicate sends
   */
  async claimClientMeetingReminder(eventId) {
    const nowIso = new Date().toISOString();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_events')
          .update({ customer_reminder_status: 'claimed', updated_at: nowIso })
          .eq('id', eventId)
          .eq('status', 'scheduled')
          .in('customer_reminder_status', ['pending', null])
          .select()
          .maybeSingle();

        if (!error && data) {
          return { claimed: true, event: data };
        } else if (!error && !data) {
          // Row was already claimed or does not meet pending criteria on Supabase
          return { claimed: false };
        }
      } catch (err) {
        console.warn('[claimClientMeetingReminder Supabase Note]:', err.message);
      }
    }

    // Local store atomic claim
    const localEvents = this.readLocalStore();
    const target = localEvents.find((e) => e.id === eventId);
    if (target && target.status === 'scheduled' && (!target.customer_reminder_status || target.customer_reminder_status === 'pending')) {
      target.customer_reminder_status = 'claimed';
      target.updated_at = nowIso;
      this.writeLocalStore(localEvents);
      return { claimed: true, event: target };
    }

    return { claimed: false };
  }

  /**
   * Update reminder delivery status
   */
  async updateReminderStatus(eventId, { status, sentAt = null, error = null }) {
    const updatePayload = {
      customer_reminder_status: status,
      customer_reminder_sent_at: sentAt,
      customer_reminder_error: error,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        await supabase
          .from('admin_events')
          .update(updatePayload)
          .eq('id', eventId);
      } catch (err) {
        console.warn('[updateReminderStatus Supabase Note]:', err.message);
      }
    }

    const localEvents = this.readLocalStore();
    const target = localEvents.find((e) => e.id === eventId);
    if (target) {
      Object.assign(target, updatePayload);
      this.writeLocalStore(localEvents);
    }
  }
}

export const adminEventService = new AdminEventService();
export default adminEventService;
