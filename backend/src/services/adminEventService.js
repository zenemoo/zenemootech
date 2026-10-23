import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { supabase } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_STORE_DIR = path.resolve(__dirname, '../database');
const LOCAL_STORE_FILE = path.resolve(LOCAL_STORE_DIR, 'admin_events_store.json');

/**
 * Generate 5-character alphanumeric uppercase code using CSPRNG
 */
const generateEventCode = (type = 'internal_event') => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 5; i++) {
    randomStr += chars.charAt(crypto.randomInt(0, chars.length));
  }
  const prefix = type === 'client_meeting' ? 'ZEN-CLT' : 'ZEN-EVT';
  return `${prefix}-${randomStr}`;
};

/**
 * Sanitize postgrest string exact input
 */
const sanitizeId = (id) => {
  if (!id || typeof id !== 'string') return '';
  return id.replace(/[^a-zA-Z0-9_-]/g, '').trim();
};

export class AdminEventService {
  /**
   * Read events from local store fallback
   */
  readLocalStore() {
    try {
      if (!fs.existsSync(LOCAL_STORE_FILE)) {
        fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify([], null, 2), 'utf-8');
        return [];
      }
      const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (_) {
      return [];
    }
  }

  /**
   * Write events to local store fallback
   */
  writeLocalStore(events) {
    try {
      if (!fs.existsSync(LOCAL_STORE_DIR)) {
        fs.mkdirSync(LOCAL_STORE_DIR, { recursive: true });
      }
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(events, null, 2), 'utf-8');
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

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_events')
          .select('id, event_id, title, event_type, start_time, end_time, status')
          .eq('event_date', dateStr)
          .eq('status', 'scheduled');

        if (!error && Array.isArray(data)) {
          return data;
        }
      } catch (err) {
        console.warn('[AdminEventService Supabase Query Note]:', err.message);
      }
    }

    // Fallback to local store
    const localEvents = this.readLocalStore();
    return localEvents.filter((e) => e.event_date === dateStr && e.status === 'scheduled');
  }

  /**
   * Check whether a proposed time interval [startTimeIso, endTimeIso] conflicts with
   * any active booking in call_bookings OR any active event in admin_events.
   * Interval overlap formula: startA < endB && endA > startB
   */
  async checkIntervalConflict({ startTimeIso, endTimeIso, excludeEventId = null, excludeBookingId = null }) {
    const propStart = new Date(startTimeIso).getTime();
    const propEnd = new Date(endTimeIso).getTime();

    if (isNaN(propStart) || isNaN(propEnd) || propEnd <= propStart) {
      return { hasConflict: false };
    }

    // 1. Check against call_bookings (status IN ('confirmed', 'pending'))
    if (supabase) {
      try {
        let query = supabase
          .from('call_bookings')
          .select('id, booking_id, full_name, company_name, start_time, end_time, status')
          .in('status', ['confirmed', 'pending']);

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

    // 2. Check against admin_events (status = 'scheduled')
    let adminEventsList = [];
    if (supabase) {
      try {
        let query = supabase
          .from('admin_events')
          .select('id, event_id, title, client_name, company_name, start_time, end_time, status')
          .eq('status', 'scheduled');

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
        return true;
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
   * List Admin Events with search, type, status, and date filtering
   */
  async getEvents({ eventType, status, startDate, endDate, search, limit = 50, offset = 0 } = {}) {
    if (supabase) {
      try {
        let query = supabase
          .from('admin_events')
          .select('*', { count: 'exact' });

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

        query = query.order('start_time', { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (!error && Array.isArray(data)) {
          return {
            events: data,
            totalCount: count || data.length,
          };
        }
      } catch (err) {
        console.warn('[AdminEventService getEvents Note]:', err.message);
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
        (e.event_id || '').toLowerCase().includes(q)
      );
    }

    events.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    return {
      events: events.slice(offset, offset + limit),
      totalCount: events.length,
    };
  }

  /**
   * Get single Event by ID or event_id
   */
  async getEventById(idOrCode) {
    const clean = sanitizeId(idOrCode);
    if (!clean) return null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_events')
          .select('*')
          .or(`id.eq.${clean},event_id.eq.${clean}`)
          .maybeSingle();

        if (!error && data) return data;
      } catch (_) {}
    }

    const localEvents = this.readLocalStore();
    return localEvents.find((e) => e.id === clean || e.event_id === clean) || null;
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
      created_by: adminUser?.email || 'admin',
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_events')
          .insert([record])
          .select()
          .single();

        if (!error && data) {
          // Mirror in local fallback store
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

    // Save to local store if Supabase insert failed or table doesn't exist
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
        const { data, error } = await supabase
          .from('admin_events')
          .update(updated)
          .eq('id', existing.id)
          .select()
          .maybeSingle();

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

    // Update in local store
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
}

export const adminEventService = new AdminEventService();
export default adminEventService;
