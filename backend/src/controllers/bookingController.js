import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { supabaseService } from '../services/supabaseService.js';
import { sendMailViaBrevo } from '../services/emailService.js';
import { createGoogleMeetForBooking } from '../services/googleMeetService.js';
import { sendBookingNotification } from '../services/telegramNotificationService.js';
import { sendZenemooNotification } from '../services/pushNotificationEngine.js';
import { sanitizePostgrestFilter, sanitizePostgrestExact } from '../utils/postgrestSanitizer.js';
import {
  generateCustomerBookingEmailHtml,
  generateAdminBookingEmailHtml,
  generateCustomerReminderEmailHtml,
  generateAdminReminderEmailHtml,
} from '../services/bookingEmailTemplate.js';
import { bookingAvailabilityService } from '../services/bookingAvailabilityService.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'zenemoo-admin-email@googlegroups.com';
const TURNSTILE_SECRET = (process.env.TURNSTILE_SECRET_KEY || '').trim();

/**
 * Generate 5-character alphanumeric uppercase code using CSPRNG
 */
const generateBookingCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 5; i++) {
    randomStr += chars.charAt(crypto.randomInt(0, chars.length));
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

export const getUtcIsoStringFromLocalTime = (dateStr, hour, min, tz = 'Asia/Kolkata') => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetTimeMs = Date.UTC(year, month - 1, day, hour, min, 0, 0);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateObj = new Date(targetTimeMs);
  const parts = formatter.formatToParts(dateObj);
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });

  const tzHour = parseInt(p.hour, 10) % 24;
  const tzMin = parseInt(p.minute, 10);
  const tzDay = parseInt(p.day, 10);

  let dayDiff = tzDay - day;
  if (dayDiff > 1) dayDiff = -1;
  if (dayDiff < -1) dayDiff = 1;

  const tzMinutesTotal = (dayDiff * 24 + tzHour) * 60 + tzMin;
  const utcMinutesTotal = hour * 60 + min;
  const offsetMinutes = tzMinutesTotal - utcMinutesTotal;

  const realUtcMs = targetTimeMs - (offsetMinutes * 60 * 1000);
  return new Date(realUtcMs).toISOString();
};

/**
 * GET /api/bookings/availability
 * Returns available 30-min slots based on admin weekly schedule, date overrides, and existing bookings
 * Also supports month status query (?month=YYYY-MM) for public calendar disabled/holiday views
 */
export const getAvailability = async (req, res, next) => {
  try {
    const { date: reqDate, month: reqMonth, timezone = 'Asia/Kolkata' } = req.query;

    // Monthly Calendar Summary Request
    if (reqMonth && !reqDate) {
      if (!/^\d{4}-\d{2}$/.test(reqMonth)) {
        return res.status(400).json({ success: false, message: 'Valid month (YYYY-MM) is required.' });
      }
      const monthResult = await bookingAvailabilityService.getMonthAvailability(reqMonth, timezone);
      return res.json(monthResult);
    }

    // Specific Date Slot Request
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

    const availabilityResult = await bookingAvailabilityService.getAvailableSlots(selectedDate, timezone);

    return res.json(availabilityResult);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings
 * Public endpoint to submit a new 30 Minute Call Booking
 */
export const createBooking = async (req, res, next) => {
  try {
    const { fullName, email, phone, companyName, notes = '', slot, turnstileToken } = req.body;

    const cleanName = fullName?.trim();
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPhone = phone?.trim();
    const cleanCompany = companyName?.trim();
    const cleanNotes = notes?.trim();

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

    // 2.5 Server-side Availability Rules Enforcement
    const slotCheck = await bookingAvailabilityService.isSlotAvailable(startTimeIso, 'Asia/Kolkata');
    if (!slotCheck.allowed) {
      return res.status(422).json({
        success: false,
        message: slotCheck.reason || 'This time slot is outside configured working hours or blocked by admin.',
      });
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
      customer_email_status: 'pending',
      admin_email_status: 'pending',
      customer_reminder_status: 'pending',
      admin_reminder_status: 'pending',
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

    // 6. Generate Google Meet & Google Calendar Event (Awaited so Meet Link is included in emails)
    let bookingWithMeet = newBooking;
    try {
      const meetResult = await createGoogleMeetForBooking(newBooking, 'automatic');
      if (meetResult?.success && meetResult?.booking) {
        bookingWithMeet = meetResult.booking;
      } else if (meetResult?.meetUrl) {
        bookingWithMeet = {
          ...newBooking,
          google_meet_url: meetResult.meetUrl,
          google_calendar_event_id: meetResult.eventId,
          meeting_status: 'generated',
        };
      }
    } catch (meetErr) {
      console.error('[Async Google Meet Generation Note]:', meetErr.message || meetErr);
    }

    // 7. Notification & Email Dispatches
    const sender = process.env.EMAIL_FROM || 'Zenemoo Bookings <contact@zenemoo.in>';

    // A. Customer Confirmation Email Task
    const sendCustomerEmailTask = async () => {
      try {
        await sendMailViaBrevo({
          sender,
          recipients: cleanEmail,
          subject: `Zenemoo Call Booking Confirmed — ${bookingWithMeet.booking_id}`,
          html: generateCustomerBookingEmailHtml(bookingWithMeet),
        });

        const { error: dbErr } = await supabase
          .from('call_bookings')
          .update({
            customer_email_status: 'sent',
            customer_email_sent_at: new Date().toISOString(),
            customer_email_error: null,
          })
          .eq('id', bookingWithMeet.id);

        if (dbErr) {
          console.error('[Customer Email DB Status Update Error]:', dbErr.message);
        } else {
          console.log(`✅ [DB Status Updated] customer_email_status = 'sent' for ${bookingWithMeet.booking_id}`);
        }
      } catch (e) {
        console.error('[Customer Email Send Error]:', e.message || e);
        const errMsg = (e.message || String(e)).substring(0, 500);
        const { error: failErr } = await supabase
          .from('call_bookings')
          .update({
            customer_email_status: 'failed',
            customer_email_error: errMsg,
          })
          .eq('id', bookingWithMeet.id);
        if (failErr) {
          console.error('[Customer Email DB Status Fail Update Error]:', failErr.message);
        }
      }
    };

    // B. Admin Notification Email Task
    const sendAdminEmailTask = async () => {
      try {
        await sendMailViaBrevo({
          sender,
          recipients: ADMIN_EMAIL,
          subject: `New Zenemoo Call Booking — ${bookingWithMeet.booking_id}`,
          html: generateAdminBookingEmailHtml(bookingWithMeet),
        });

        const { error: dbErr } = await supabase
          .from('call_bookings')
          .update({
            admin_email_status: 'sent',
            admin_email_sent_at: new Date().toISOString(),
            admin_email_error: null,
          })
          .eq('id', bookingWithMeet.id);

        if (dbErr) {
          console.error('[Admin Email DB Status Update Error]:', dbErr.message);
        } else {
          console.log(`✅ [DB Status Updated] admin_email_status = 'sent' for ${bookingWithMeet.booking_id}`);
        }
      } catch (e) {
        console.error('[Admin Email Send Error]:', e.message || e);
        const errMsg = (e.message || String(e)).substring(0, 500);
        const { error: failErr } = await supabase
          .from('call_bookings')
          .update({
            admin_email_status: 'failed',
            admin_email_error: errMsg,
          })
          .eq('id', bookingWithMeet.id);
        if (failErr) {
          console.error('[Admin Email DB Status Fail Update Error]:', failErr.message);
        }
      }
    };

    // C. Dispatch Admin Notification Bell Alert (ADMIN ONLY)
    sendZenemooNotification({
      title: 'New Call Booking Received',
      message: `${cleanName} booked a 30-minute call for ${cleanCompany}.`,
      notification_type: 'booking_created',
      target_type: 'admin',
      url: '/portal/9KqvA2Nz8#call-bookings',
      metadata: {
        booking_id: bookingWithMeet.booking_id,
        client: cleanName,
        company: cleanCompany,
        meeting_type: bookingWithMeet.meeting_type || 'Discovery Call',
        start_time: bookingWithMeet.start_time,
        end_time: bookingWithMeet.end_time,
      },
    }).catch((e) => console.error('[Notification Bell Warning]:', e.message));

    // D. Dispatch Telegram Alert
    sendBookingNotification(bookingWithMeet).catch((e) => console.error('[Telegram Booking Warning]:', e.message));

    // Await email dispatches with Promise.allSettled so status is recorded before response
    await Promise.allSettled([sendCustomerEmailTask(), sendAdminEmailTask()]);

    // Fetch refreshed row with final email statuses
    const { data: finalBooking } = await supabase
      .from('call_bookings')
      .select('*')
      .eq('id', bookingWithMeet.id)
      .maybeSingle();

    return res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully.',
      booking: finalBooking || bookingWithMeet,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to process automatic completion for past confirmed bookings (end_time < now)
 * Idempotent: Only completes confirmed meetings, updates DB, and sends ONE admin notification.
 */
export const processAutomaticBookingCompletion = async () => {
  if (!supabase) return;
  const nowIso = new Date().toISOString();
  try {
    const { data: pastConfirmed } = await supabase
      .from('call_bookings')
      .select('id, full_name, company_name, booking_id, start_time, end_time, meeting_type, meeting_status')
      .eq('status', 'confirmed')
      .lt('end_time', nowIso);

    if (pastConfirmed && pastConfirmed.length > 0) {
      const pastIds = pastConfirmed.map((b) => b.id);
      await supabase
        .from('call_bookings')
        .update({ status: 'completed', completed_at: nowIso, updated_at: nowIso })
        .in('id', pastIds);

      // Notify admin notification bell for completed meetings (strictly ADMIN ONLY)
      for (const b of pastConfirmed) {
        sendZenemooNotification({
          title: 'Meeting Completed',
          message: `The 30-minute call with ${b.full_name} (${b.company_name}) has completed.`,
          notification_type: 'booking_completed',
          target_type: 'admin',
          url: '/portal/9KqvA2Nz8#call-bookings',
          metadata: {
            booking_id: b.booking_id,
            client: b.full_name,
            company: b.company_name,
            meeting_type: b.meeting_type || 'Discovery Call',
            start_time: b.start_time,
            end_time: b.end_time,
            meeting_status: b.meeting_status || 'completed',
          },
        }).catch(() => {});
      }
    }
  } catch (autoErr) {
    console.error('[Auto Complete Error]:', autoErr.message);
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

    const cleanBookingId = sanitizePostgrestExact(bookingId);
    if (!cleanBookingId) {
      return res.status(404).json({ success: false, message: 'Invalid booking ID format.' });
    }

    const { data: booking, error } = await supabase
      .from('call_bookings')
      .select('*')
      .or(`id.eq.${cleanBookingId},booking_id.eq.${cleanBookingId}`)
      .maybeSingle();

    if (error || !booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found.' });
    }

    return res.json({
      success: true,
      booking,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/admin/list or GET /api/bookings/admin/bookings
 * Admin list endpoint with automatic completion, status filtering, search, and actionable count
 */
export const getAdminBookings = async (req, res, next) => {
  try {
    const { status, meetingStatus, emailStatus, timeframe, search, startDate, endDate, page = 1, limit = 50 } = req.query;

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database service unavailable.' });
    }

    // 1. Process Automatic Completion for past confirmed bookings (end_time < now)
    await processAutomaticBookingCompletion();

    // 2. Build Query
    const BOOKING_LIST_COLUMNS = 'id, booking_id, full_name, email, phone, company_name, notes, meeting_type, meeting_duration, booking_date, start_time, end_time, timezone, status, admin_notes, reminder_sent, meeting_status, google_calendar_event_id, google_meet_url, meeting_error, customer_email_status, admin_email_status, customer_reminder_status, admin_reminder_status, created_at, updated_at, confirmed_at, cancelled_at, completed_at';

    let query = supabase.from('call_bookings').select(BOOKING_LIST_COLUMNS, { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (meetingStatus && meetingStatus !== 'all') {
      query = query.eq('meeting_status', meetingStatus);
    }

    if (emailStatus && emailStatus !== 'all') {
      if (emailStatus === 'failed') {
        query = query.or('customer_email_status.eq.failed,admin_email_status.eq.failed,customer_reminder_status.eq.failed,admin_reminder_status.eq.failed');
      } else if (emailStatus === 'sent') {
        query = query.eq('customer_email_status', 'sent');
      } else if (emailStatus === 'pending') {
        query = query.eq('customer_email_status', 'pending');
      }
    }

    if (startDate) {
      query = query.gte('booking_date', startDate);
    }

    if (endDate) {
      query = query.lte('booking_date', endDate);
    }

    if (search && search.trim()) {
      const cleanSearch = sanitizePostgrestFilter(search);
      if (cleanSearch) {
        const term = `%${cleanSearch}%`;
        query = query.or(`full_name.ilike.${term},email.ilike.${term},company_name.ilike.${term},booking_id.ilike.${term},phone.ilike.${term}`);
      }
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

    // 3. Compute Actionable Count for Sidebar Badge via targeted Supabase HEAD/exact count query (Zero payload egress)
    let actionableCount = 0;
    try {
      const nowIso = new Date().toISOString();
      const { count: headCount, error: headErr } = await supabase
        .from('call_bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', ['confirmed', 'pending'])
        .or(`status.eq.pending,end_time.gt.${nowIso},meeting_status.eq.failed,customer_email_status.eq.failed,admin_email_status.eq.failed`);

      if (!headErr && typeof headCount === 'number') {
        actionableCount = headCount;
      } else {
        const { data: allActive } = await supabase
          .from('call_bookings')
          .select('id, status, end_time, meeting_status, customer_email_status, admin_email_status')
          .in('status', ['confirmed', 'pending'])
          .limit(200);

        if (allActive) {
          const nowMs = Date.now();
          actionableCount = allActive.filter((b) => {
            if (b.status === 'pending') return true;
            if (b.status === 'confirmed' && new Date(b.end_time).getTime() > nowMs) return true;
            if (b.meeting_status === 'failed') return true;
            if (b.customer_email_status === 'failed' || b.admin_email_status === 'failed') return true;
            return false;
          }).length;
        }
      }
    } catch (_) {}

    return res.json({
      success: true,
      bookings: bookings || [],
      total: count || 0,
      actionableCount,
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

    const cleanId = sanitizePostgrestExact(id);
    if (!cleanId) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const { data: booking, error } = await supabase
      .from('call_bookings')
      .select('*')
      .or(`id.eq.${cleanId},booking_id.eq.${cleanId}`)
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
      // Notify Admin Notification Bell (ADMIN ONLY)
      sendZenemooNotification({
        title: 'Google Meet Ready',
        message: `Google Meet link generated for booking ${booking.booking_id} (${booking.full_name}).`,
        notification_type: 'google_meet_generated',
        target_type: 'admin',
        url: '/portal/9KqvA2Nz8#call-bookings',
        metadata: {
          booking_id: booking.booking_id,
          client: booking.full_name,
          company: booking.company_name,
          meet_url: result.meetUrl,
        },
      }).catch(() => {});

      return res.json({
        success: true,
        message: 'Google Calendar event & Meet link generated successfully.',
        booking: result.booking,
        meetUrl: result.meetUrl,
      });
    } else {
      // Notify Admin Notification Bell on failure (ADMIN ONLY)
      sendZenemooNotification({
        title: 'Google Meet Link Failed',
        message: `Google Meet generation failed for booking ${booking.booking_id} (${booking.full_name}).`,
        notification_type: 'google_meet_failed',
        target_type: 'admin',
        url: '/portal/9KqvA2Nz8#call-bookings',
        metadata: {
          booking_id: booking.booking_id,
          client: booking.full_name,
          company: booking.company_name,
          error: result.error,
        },
      }).catch(() => {});

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
 * POST /api/bookings/admin/:id/resend-email
 * Manually resends customer confirmation, admin confirmation, or 1-hour reminders
 */
export const resendBookingEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emailType } = req.body; // 'customer_confirmation' | 'admin_confirmation' | 'customer_reminder' | 'admin_reminder'

    if (!id || !emailType) {
      return res.status(400).json({ success: false, message: 'Booking ID and emailType are required.' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database service unavailable.' });
    }

    const cleanId = sanitizePostgrestExact(id);
    if (!cleanId) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const { data: booking, error } = await supabase
      .from('call_bookings')
      .select('*')
      .or(`id.eq.${cleanId},booking_id.eq.${cleanId}`)
      .maybeSingle();

    if (error || !booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found.' });
    }

    const sender = process.env.EMAIL_FROM || 'Zenemoo Bookings <contact@zenemoo.in>';
    let emailSubject = '';
    let emailHtml = '';
    let statusField = '';
    let sentAtField = '';
    let errorField = '';
    let recipient = '';

    if (emailType === 'customer_confirmation') {
      recipient = booking.email;
      emailSubject = `Zenemoo Call Booking Confirmed — ${booking.booking_id}`;
      emailHtml = generateCustomerBookingEmailHtml(booking);
      statusField = 'customer_email_status';
      sentAtField = 'customer_email_sent_at';
      errorField = 'customer_email_error';
    } else if (emailType === 'admin_confirmation') {
      recipient = ADMIN_EMAIL;
      emailSubject = `New Zenemoo Call Booking — ${booking.booking_id}`;
      emailHtml = generateAdminBookingEmailHtml(booking);
      statusField = 'admin_email_status';
      sentAtField = 'admin_email_sent_at';
      errorField = 'admin_email_error';
    } else if (emailType === 'customer_reminder') {
      recipient = booking.email;
      emailSubject = `Your Zenemoo Meeting Starts in 1 Hour — ${booking.booking_id}`;
      emailHtml = generateCustomerReminderEmailHtml(booking);
      statusField = 'customer_reminder_status';
      sentAtField = 'customer_reminder_sent_at';
      errorField = 'customer_reminder_error';
    } else if (emailType === 'admin_reminder') {
      recipient = ADMIN_EMAIL;
      emailSubject = `Zenemoo Meeting Starts in 1 Hour — ${booking.booking_id}`;
      emailHtml = generateAdminReminderEmailHtml(booking);
      statusField = 'admin_reminder_status';
      sentAtField = 'admin_reminder_sent_at';
      errorField = 'admin_reminder_error';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid emailType specified.' });
    }

    try {
      await sendMailViaBrevo({
        sender,
        recipients: recipient,
        subject: emailSubject,
        html: emailHtml,
      });

      const updatePayload = {
        [statusField]: 'sent',
        [sentAtField]: new Date().toISOString(),
        [errorField]: null,
      };

      const { data: updatedBooking } = await supabase
        .from('call_bookings')
        .update(updatePayload)
        .eq('id', booking.id)
        .select()
        .single();

      return res.json({
        success: true,
        message: `Email (${emailType}) sent successfully to ${recipient}.`,
        booking: updatedBooking || booking,
      });
    } catch (sendErr) {
      console.error(`[Manual Email Resend Error - ${emailType}]:`, sendErr.message);

      const updatePayload = {
        [statusField]: 'failed',
        [errorField]: (sendErr.message || 'Email delivery failed.').substring(0, 500),
      };

      const { data: updatedBooking } = await supabase
        .from('call_bookings')
        .update(updatePayload)
        .eq('id', booking.id)
        .select()
        .maybeSingle();

      return res.status(500).json({
        success: false,
        message: `Failed to deliver email: ${sendErr.message || 'Mail server error.'}`,
        booking: updatedBooking || { ...booking, ...updatePayload },
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
      return res.status(400).json({ success: false, message: 'Booking ID is required.' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database service unavailable.' });
    }

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
      if (status === 'completed') updateData.completed_at = new Date().toISOString();
      if (status === 'cancelled' || status === 'rejected') updateData.cancelled_at = new Date().toISOString();
    }

    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes;
    }

    const cleanId = sanitizePostgrestExact(id);
    if (!cleanId) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const { data: updatedBooking, error } = await supabase
      .from('call_bookings')
      .update(updateData)
      .or(`id.eq.${cleanId},booking_id.eq.${cleanId}`)
      .select()
      .single();

    if (error || !updatedBooking) {
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
      return res.status(400).json({ success: false, message: 'Booking ID is required.' });
    }

    const cleanId = sanitizePostgrestExact(id);
    if (!cleanId) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID format.' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database service unavailable.' });
    }

    const { error } = await supabase
      .from('call_bookings')
      .delete()
      .or(`id.eq.${cleanId},booking_id.eq.${cleanId}`);

    if (error) {
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

/**
 * GET /api/bookings/admin/availability
 * Admin endpoint to fetch active availability schedule and date overrides
 */
export const getAdminAvailability = async (req, res, next) => {
  try {
    const config = await bookingAvailabilityService.getConfig();
    return res.json({
      success: true,
      config,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/bookings/admin/availability
 * Admin endpoint to update and save weekly hours and date overrides
 */
export const updateAdminAvailability = async (req, res, next) => {
  try {
    const adminUser = req.user || { email: 'admin' };
    const savedConfig = await bookingAvailabilityService.saveConfig(req.body, adminUser);

    // Write audit log if Supabase is connected
    if (supabase) {
      try {
        await supabase.from('admin_audit_logs').insert([{
          event_type: 'BOOKING_AVAILABILITY_UPDATED',
          email: adminUser.email || 'admin',
          ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
          user_agent: req.headers['user-agent'] || 'unknown',
          details: {
            schedule_name: savedConfig.schedule_name,
            timezone: savedConfig.timezone,
            weekly_days_count: Object.keys(savedConfig.weekly_hours || {}).length,
            date_overrides_count: (savedConfig.date_overrides || []).length,
          },
          created_at: new Date().toISOString(),
        }]);
      } catch (_) {}
    }

    return res.json({
      success: true,
      message: 'Availability schedule saved successfully.',
      config: savedConfig,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update availability schedule.',
    });
  }
};

/**
 * POST /api/bookings/admin/availability/apply-rule
 * Apply availability rule with explicit scope (this date, every weekday, 30-day weekdays, selected dates, range)
 */
export const applyAdminAvailabilityRule = async (req, res, next) => {
  try {
    const adminUser = req.user || { email: 'admin' };
    const result = await bookingAvailabilityService.applyRuleScope(req.body, adminUser);

    if (supabase) {
      try {
        await supabase.from('admin_audit_logs').insert([{
          event_type: 'BOOKING_AVAILABILITY_RULE_APPLIED',
          email: adminUser.email || 'admin',
          ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
          user_agent: req.headers['user-agent'] || 'unknown',
          details: {
            operation: req.body.operation,
            scope: req.body.scope,
            affectedCount: result.affectedCount,
            skippedPastCount: result.skippedPastCount,
            baseDate: req.body.baseDate,
          },
          created_at: new Date().toISOString(),
        }]);
      } catch (_) {}
    }

    let message = 'Availability rule applied successfully.';
    if (result.skippedPastCount > 0) {
      message += ` (${result.skippedPastCount} past date(s) skipped — historical dates are read-only).`;
    }

    return res.json({
      success: true,
      message,
      ...result,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to apply availability rule.',
    });
  }
};

/**
 * POST /api/bookings/admin/availability/preview-affected
 * Preview which dates would be affected by a proposed rule and scope
 */
export const previewAffectedDates = async (req, res, next) => {
  try {
    const tz = req.body?.timezone || 'Asia/Kolkata';
    const todayInTz = getTodayInTz(tz);
    const dates = bookingAvailabilityService.calculateAffectedDates(req.body);

    let skippedPastCount = 0;
    if (req.body.scope === 'selected_dates' && Array.isArray(req.body.targetDates)) {
      skippedPastCount = req.body.targetDates.filter((d) => typeof d === 'string' && d < todayInTz).length;
    } else if (req.body.scope === 'custom_range' && req.body.rangeStart < todayInTz) {
      const allRawDays = getDatesInRange(req.body.rangeStart, req.body.rangeEnd, 365);
      skippedPastCount = allRawDays.filter((d) => d < todayInTz).length;
    }

    return res.json({
      success: true,
      affectedDates: dates,
      count: dates.length,
      skippedPastCount,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to calculate affected dates.',
    });
  }
};

