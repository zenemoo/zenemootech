import axios from 'axios';
import { supabase } from '../config/supabase.js';
import { sendMailViaBrevo } from '../services/emailService.js';
import {
  generateCustomerBookingEmailHtml,
  generateAdminBookingEmailHtml,
} from '../services/bookingEmailTemplate.js';
import { sendBookingNotification } from '../services/telegramNotificationService.js';
import { createGoogleMeetForBooking } from '../services/googleMeetService.js';

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '0x4AAAAAAEKG_sx7PnsrKH6dRojjixiRQWo';
const ADMIN_EMAIL = 'zenemoo-admin-email@googlegroups.com';

/**
 * Generate unique booking ID (ZEN-CALL-XXXXX)
 */
const generateBookingCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomStr = '';
  for (let i = 0; i < 5; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ZEN-CALL-${randomStr}`;
};

const getTodayInTz = (tz = 'Asia/Kolkata') => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch (_) {
    const now = new Date();
    const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return local.toISOString().split('T')[0];
  }
};

/**
 * GET /api/bookings/availability
 * Returns available 30-min slots between 10:00 AM and 10:00 PM for a specific date
 */
export const getAvailability = async (req, res, next) => {
  try {
    const { date: reqDate, timezone = 'Asia/Kolkata' } = req.query;

    if (!reqDate || !/^\d{4}-\d{2}-\d{2}$/.test(reqDate)) {
      return res.status(400).json({ success: false, message: 'Valid date (YYYY-MM-DD) is required.' });
    }

    const selectedDate = reqDate;
    const todayStr = getTodayInTz(timezone);

    if (selectedDate < todayStr) {
      return res.status(400).json({
        success: false,
        message: 'Cannot select past dates.',
        availableSlots: [],
      });
    }

    // Generate 30-min interval slots between 10:00 AM and 9:30 PM / 10:00 PM (10:00 to 22:00)
    const slots = [];
    const [year, month, day] = selectedDate.split('-').map(Number);

    for (let hour = 10; hour <= 21; hour++) {
      for (const min of [0, 30]) {
        const slotDate = new Date(Date.UTC(year, month - 1, day, hour, min, 0, 0));
        const isoString = slotDate.toISOString();

        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const displayMin = min === 0 ? '00' : '30';
        const label = `${displayHour}:${displayMin} ${period}`;

        slots.push({
          iso: isoString,
          label,
          hour,
          min,
        });
      }
    }

    // Include 10:00 PM slot (starts at 22:00)
    const slot22 = new Date(Date.UTC(year, month - 1, day, 22, 0, 0, 0));
    slots.push({
      iso: slot22.toISOString(),
      label: '10:00 PM',
      hour: 22,
      min: 0,
    });

    // Fetch existing active bookings for this date from Supabase
    let bookedTimesSet = new Set();
    if (supabase) {
      const { data: existingBookings, error } = await supabase
        .from('call_bookings')
        .select('start_time')
        .eq('booking_date', selectedDate)
        .in('status', ['confirmed', 'pending']);

      if (!error && Array.isArray(existingBookings)) {
        existingBookings.forEach((b) => {
          if (b.start_time) {
            bookedTimesSet.add(new Date(b.start_time).toISOString());
          }
        });
      }
    }

    // Filter slots
    const nowUtcMs = Date.now();
    const availableSlots = slots.map((s) => {
      const slotTimeMs = new Date(s.iso).getTime();
      const isPast = selectedDate === todayStr && slotTimeMs < nowUtcMs + 15 * 60 * 1000;
      const isBooked = bookedTimesSet.has(s.iso);

      return {
        iso: s.iso,
        label: s.label,
        available: !isPast && !isBooked,
        reason: isBooked ? 'Booked' : isPast ? 'Past' : undefined,
      };
    });

    return res.json({
      success: true,
      date: selectedDate,
      timezone,
      availableSlots,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings
 * Submit a new call booking with Cloudflare Turnstile anti-bot verification
 */
export const createBooking = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      companyName,
      notes,
      slot,
      turnstileToken,
    } = req.body;

    // Sanitize & Validate Inputs
    const cleanName = (fullName || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanCompany = (companyName || '').trim();
    const cleanNotes = (notes || '').trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanCompany || !slot) {
      return res.status(400).json({
        success: false,
        message: 'Full Name, Email, Phone, Company/Agency Name, and Slot are required.',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email address format.' });
    }

    // 1. Verify Cloudflare Turnstile anti-bot token
    try {
      const verifyRes = await axios.post(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        new URLSearchParams({
          secret: TURNSTILE_SECRET,
          response: turnstileToken || '',
          remoteip: req.ip || '',
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
      );

      if (!verifyRes.data || !verifyRes.data.success) {
        return res.status(400).json({
          success: false,
          message: 'Anti-bot security check failed or token expired. Please try again.',
        });
      }
    } catch (cfErr) {
      console.error('[Booking Turnstile Error]:', cfErr.message);
      return res.status(400).json({
        success: false,
        message: 'Anti-bot verification service unavailable. Please try again.',
      });
    }

    // 2. Validate Slot Timestamp
    const slotDate = new Date(slot);
    if (isNaN(slotDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid slot timestamp format.' });
    }

    if (slotDate.getTime() < Date.now() - 5 * 60 * 1000) {
      return res.status(400).json({ success: false, message: 'Cannot book a slot in the past.' });
    }

    const bookingDateStr = slotDate.toISOString().split('T')[0];
    const startTimeIso = slotDate.toISOString();
    const endTimeIso = new Date(slotDate.getTime() + 30 * 60 * 1000).toISOString();

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database service is currently unavailable.' });
    }

    // 3. Double-Booking Pre-Check
    const { data: existingActive } = await supabase
      .from('call_bookings')
      .select('id')
      .eq('start_time', startTimeIso)
      .in('status', ['confirmed', 'pending'])
      .maybeSingle();

    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: 'This time slot has just been booked. Please select another time.',
      });
    }

    // 4. Generate Unique Booking ID (ZEN-CALL-XXXXX)
    let bookingCode = generateBookingCode();
    for (let attempts = 0; attempts < 3; attempts++) {
      const { data: existingCode } = await supabase
        .from('call_bookings')
        .select('id')
        .eq('booking_id', bookingCode)
        .maybeSingle();

      if (!existingCode) break;
      bookingCode = generateBookingCode();
    }

    // 5. Database Insert
    const bookingRow = {
      booking_id: bookingCode,
      full_name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      company_name: cleanCompany,
      notes: cleanNotes,
      meeting_type: '30 Minute Meeting',
      meeting_duration: 30,
      booking_date: bookingDateStr,
      start_time: startTimeIso,
      end_time: endTimeIso,
      timezone: 'Asia/Kolkata',
      status: 'confirmed',
      meeting_status: 'pending',
      meeting_attempt_count: 0,
      google_calendar_event_id: null,
      google_meet_url: null,
      reminder_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
    };

    const { data: newBooking, error: insertError } = await supabase
      .from('call_bookings')
      .insert([bookingRow])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505' || insertError.message?.includes('unique') || insertError.message?.includes('idx_unique_active_start_time')) {
        return res.status(409).json({
          success: false,
          message: 'This time slot has just been booked. Please select another time.',
        });
      }
      console.error('[Call Booking Insert Error]:', insertError);
      return res.status(500).json({ success: false, message: 'Failed to record booking. Please try again.' });
    }

    // 6. Asynchronous Notification Dispatches
    const sender = process.env.EMAIL_FROM || 'Zenemoo Bookings <noreply@zenemoo.in>';

    // A. Send Customer Confirmation Email (No Meet URL yet)
    sendMailViaBrevo({
      sender,
      recipients: cleanEmail,
      subject: `Zenemoo Call Booking Confirmed — ${newBooking.booking_id}`,
      html: generateCustomerBookingEmailHtml(newBooking),
    }).catch((e) => console.error('[Customer Email Dispatch Warning]:', e.message));

    // B. Send Admin Notification Email
    sendMailViaBrevo({
      sender,
      recipients: ADMIN_EMAIL,
      subject: `New Zenemoo Call Booking — ${newBooking.booking_id}`,
      html: generateAdminBookingEmailHtml(newBooking),
    }).catch((e) => console.error('[Admin Email Dispatch Warning]:', e.message));

    // C. Dispatch Telegram Alert
    sendBookingNotification(newBooking).catch((e) => console.error('[Telegram Booking Dispatch Warning]:', e.message));

    // 7. Trigger Non-Blocking Async Background Google Calendar & Google Meet Creation
    setImmediate(() => {
      createGoogleMeetForBooking(newBooking, 'automatic').catch((err) => {
        console.error('[Async Google Meet Error]:', err.message);
      });
    });

    // Return immediate booking confirmation to customer without waiting for Google API
    return res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully.',
      booking: newBooking,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/:bookingId
 * Public lookup for booking confirmation
 */
export const getBookingById = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required.' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database service unavailable.' });
    }

    const { data: booking, error } = await supabase
      .from('call_bookings')
      .select('booking_id, full_name, company_name, email, booking_date, start_time, end_time, timezone, status, created_at')
      .or(`booking_id.eq.${bookingId},id.eq.${bookingId}`)
      .maybeSingle();

    if (error || !booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    return res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/admin/list
 * Admin list endpoint with status, search, date range, and meetingStatus filters
 */
export const getAdminBookings = async (req, res, next) => {
  try {
    const { status, meetingStatus, search, startDate, endDate, page = 1, limit = 50 } = req.query;

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database service unavailable.' });
    }

    let query = supabase
      .from('call_bookings')
      .select('*', { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (meetingStatus && meetingStatus !== 'all') {
      query = query.eq('meeting_status', meetingStatus);
    }

    if (startDate) {
      query = query.gte('booking_date', startDate);
    }

    if (endDate) {
      query = query.lte('booking_date', endDate);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`full_name.ilike.${term},email.ilike.${term},company_name.ilike.${term},booking_id.ilike.${term},phone.ilike.${term}`);
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query.order('start_time', { ascending: false }).range(from, to);

    const { data: bookings, count, error } = await query;

    if (error) {
      console.error('[Admin Get Bookings Error]:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
    }

    return res.json({
      success: true,
      bookings: bookings || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings/admin/:id/generate-meeting
 * Admin manual endpoint to generate Google Calendar event and Google Meet link
 */
export const generateMeetingForBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Booking ID is required.' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database service unavailable.' });
    }

    const { data: booking, error } = await supabase
      .from('call_bookings')
      .select('*')
      .or(`id.eq.${id},booking_id.eq.${id}`)
      .maybeSingle();

    if (error || !booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found.' });
    }

    // Idempotent check: return existing if already generated
    if (booking.google_meet_url && booking.google_calendar_event_id) {
      return res.json({
        success: true,
        message: 'Google Meet link already generated.',
        booking,
        meetUrl: booking.google_meet_url,
      });
    }

    const result = await createGoogleMeetForBooking(booking, 'admin_manual');

    if (result.success) {
      return res.json({
        success: true,
        message: 'Google Calendar event & Meet link generated successfully.',
        booking: result.booking,
        meetUrl: result.meetUrl,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to generate Google Meet link.',
        booking: result.booking || booking,
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/bookings/admin/:id
 * Admin endpoint to update status or admin_notes
 */
export const updateAdminBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Booking ID parameter is required.' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database service unavailable.' });
    }

    const updateFields = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      const validStatuses = ['pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'no_show'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value.' });
      }
      updateFields.status = status;
      if (status === 'completed') updateFields.completed_at = new Date().toISOString();
      if (status === 'cancelled') updateFields.cancelled_at = new Date().toISOString();
    }

    if (typeof adminNotes === 'string') {
      updateFields.admin_notes = adminNotes;
    }

    const { data: updatedBooking, error } = await supabase
      .from('call_bookings')
      .update(updateFields)
      .or(`id.eq.${id},booking_id.eq.${id}`)
      .select()
      .single();

    if (error) {
      console.error('[Admin Update Booking Error]:', error);
      return res.status(500).json({ success: false, message: 'Failed to update booking.' });
    }

    return res.json({
      success: true,
      message: 'Booking updated successfully.',
      booking: updatedBooking,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/bookings/admin/:id
 * Admin endpoint to delete a booking record
 */
export const deleteAdminBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Booking ID parameter is required.' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database service unavailable.' });
    }

    const { error } = await supabase
      .from('call_bookings')
      .delete()
      .or(`id.eq.${id},booking_id.eq.${id}`);

    if (error) {
      console.error('[Admin Delete Booking Error]:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete booking.' });
    }

    return res.json({
      success: true,
      message: 'Booking deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
