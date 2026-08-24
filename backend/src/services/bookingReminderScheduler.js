import { supabase } from '../config/supabase.js';
import { sendMailViaBrevo } from './emailService.js';
import {
  generateCustomerReminderEmailHtml,
  generateAdminReminderEmailHtml,
} from './bookingEmailTemplate.js';
import { sendBookingReminderNotification } from './telegramNotificationService.js';
import { createGoogleMeetForBooking, processPendingMeetingGenerations } from './googleMeetService.js';

const ADMIN_EMAIL = 'zenemoo-admin-email@googlegroups.com';

/**
 * Check and process 1-hour pre-meeting reminders with Meet URL verification
 */
export const processBookingReminders = async () => {
  if (!supabase) return;

  try {
    // First, process any pending or failed background meeting generations
    await processPendingMeetingGenerations();

    const nowMs = Date.now();
    // Window: meetings starting between 50 minutes (3000s) and 70 minutes (4200s) from now
    const minStart = new Date(nowMs + 50 * 60 * 1000).toISOString();
    const maxStart = new Date(nowMs + 70 * 60 * 1000).toISOString();

    const { data: dueBookings, error } = await supabase
      .from('call_bookings')
      .select('*')
      .eq('status', 'confirmed')
      .eq('reminder_sent', false)
      .gte('start_time', minStart)
      .lte('start_time', maxStart);

    if (error) {
      console.warn('[Booking Reminder Scheduler Query Error]:', error.message);
      return;
    }

    if (!dueBookings || dueBookings.length === 0) {
      return;
    }

    console.log(`⏰ [Booking Reminder Engine] Found ${dueBookings.length} booking(s) due for 1-hour reminder.`);

    for (let booking of dueBookings) {
      try {
        // Atomic update to mark reminder_sent = true first to avoid duplicate sends in race conditions
        const { error: updateError } = await supabase
          .from('call_bookings')
          .update({ reminder_sent: true, updated_at: new Date().toISOString() })
          .eq('id', booking.id)
          .eq('reminder_sent', false);

        if (updateError) {
          console.warn(`[Reminder Skip] Booking ${booking.booking_id} was already processed by another worker.`);
          continue;
        }

        // If Google Meet URL does not exist yet, attempt final meeting generation attempt
        if (!booking.google_meet_url) {
          console.log(`⚠️ [Reminder Engine] Meet URL missing for ${booking.booking_id}. Attempting final meeting generation...`);
          const genResult = await createGoogleMeetForBooking(booking, 'final_reminder_attempt');
          if (genResult.success && genResult.booking) {
            booking = genResult.booking;
          }
        }

        const sender = process.env.EMAIL_FROM || 'Zenemoo Bookings <noreply@zenemoo.in>';

        // 1. Send Customer 1-Hour Reminder Email
        if (booking.email) {
          try {
            await sendMailViaBrevo({
              sender,
              recipients: booking.email,
              subject: `Your Zenemoo Meeting Starts in 1 Hour — ${booking.booking_id}`,
              html: generateCustomerReminderEmailHtml(booking),
            });
            console.log(`✅ [Reminder Sent] Customer email sent for ${booking.booking_id} to ${booking.email}`);
          } catch (eErr) {
            console.error(`❌ [Reminder Email Failed] Customer email for ${booking.booking_id}: ${eErr.message}`);
          }
        }

        // 2. Send Admin 1-Hour Reminder Email
        try {
          await sendMailViaBrevo({
            sender,
            recipients: ADMIN_EMAIL,
            subject: `Zenemoo Meeting Starts in 1 Hour — ${booking.booking_id}`,
            html: generateAdminReminderEmailHtml(booking),
          });
          console.log(`✅ [Reminder Sent] Admin email sent for ${booking.booking_id} to ${ADMIN_EMAIL}`);
        } catch (aErr) {
          console.error(`❌ [Reminder Email Failed] Admin email for ${booking.booking_id}: ${aErr.message}`);
        }

        // 3. Dispatch Telegram 1-Hour Reminder Alert
        try {
          await sendBookingReminderNotification(booking);
          console.log(`✅ [Reminder Sent] Telegram alert sent for ${booking.booking_id}`);
        } catch (tErr) {
          console.error(`❌ [Reminder Telegram Failed] Telegram for ${booking.booking_id}: ${tErr.message}`);
        }
      } catch (err) {
        console.error(`[Reminder Processing Exception] Booking ${booking.booking_id}:`, err.message);
      }
    }
  } catch (globalErr) {
    console.error('[Booking Reminder Scheduler Global Error]:', globalErr.message);
  }
};

/**
 * Start background timer for processing reminders every 5 minutes
 */
export const startBookingReminderScheduler = () => {
  console.log('⏰ [Booking Reminder Scheduler] Initialized with Google Meet check (Interval: 5 minutes)');
  // Run once immediately on server start
  processBookingReminders();
  // Schedule recurring execution
  setInterval(() => {
    processBookingReminders();
  }, 5 * 60 * 1000);
};
