import { google } from 'googleapis';
import { supabase } from '../config/supabase.js';

/**
 * Initialize Google Calendar API client using OAuth2 Refresh Token OR Service Account JWT
 */
const getGoogleCalendarClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let serviceKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  // Strategy 1: OAuth2 Credentials (Preferred for personal/workspace calendar with Meet)
  if (clientId && clientSecret && refreshToken) {
    try {
      const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ||
        (process.env.NODE_ENV === 'production'
          ? 'https://zenemootech-api.onrender.com/api/auth/google/callback'
          : 'http://localhost:5000/api/auth/google/callback');

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      return google.calendar({ version: 'v3', auth: oauth2Client });
    } catch (err) {
      console.warn('[Google Calendar OAuth2 Init Note]:', err.message);
    }
  }

  // Strategy 2: Service Account JWT Fallback
  if (serviceEmail && serviceKey) {
    try {
      serviceKey = serviceKey.replace(/\\n/g, '\n');
      const auth = new google.auth.JWT({
        email: serviceEmail,
        key: serviceKey,
        scopes,
      });
      return google.calendar({ version: 'v3', auth });
    } catch (err) {
      console.warn('[Google Calendar JWT Init Note]:', err.message);
    }
  }

  return null;
};

/**
 * Idempotently Create Google Calendar Event & Generate Google Meet Link for a Booking
 * Updates call_bookings table without cancelling or deleting booking if API fails.
 */
export const createGoogleMeetForBooking = async (bookingIdOrRow, source = 'automatic') => {
  if (!supabase) {
    return { success: false, error: 'Database service unavailable.' };
  }

  let booking = null;

  try {
    if (typeof bookingIdOrRow === 'string') {
      const { data, error } = await supabase
        .from('call_bookings')
        .select('*')
        .eq('id', bookingIdOrRow)
        .maybeSingle();

      if (error || !data) {
        // Retry lookup by booking_id (ZEN-CALL-XXXXX)
        const { data: data2 } = await supabase
          .from('call_bookings')
          .select('*')
          .eq('booking_id', bookingIdOrRow)
          .maybeSingle();

        booking = data2;
      } else {
        booking = data;
      }
    } else if (bookingIdOrRow && typeof bookingIdOrRow === 'object') {
      booking = bookingIdOrRow;
    }

    if (!booking) {
      return { success: false, error: 'Booking record not found.' };
    }

    // 1. IDEMPOTENCY CHECK: If Meet URL or Calendar Event ID already exists, return existing
    if (booking.google_meet_url && booking.google_calendar_event_id) {
      console.log(`[Google Meet Service] Booking ${booking.booking_id} already has Meet URL: ${booking.google_meet_url}`);
      return {
        success: true,
        booking,
        meetUrl: booking.google_meet_url,
        eventId: booking.google_calendar_event_id,
        alreadyExisted: true,
      };
    }

    const newAttemptCount = (booking.meeting_attempt_count || 0) + 1;

    // 2. Update status to 'generating'
    await supabase
      .from('call_bookings')
      .update({
        meeting_status: 'generating',
        meeting_last_attempt_at: new Date().toISOString(),
        meeting_attempt_count: newAttemptCount,
        meeting_updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    const calendar = getGoogleCalendarClient();

    if (!calendar) {
      const errMsg = 'Google Calendar API credentials missing or invalid in backend environment.';
      console.warn(`[Google Meet Warning] Booking ${booking.booking_id}: ${errMsg}`);

      const { data: failedBooking } = await supabase
        .from('call_bookings')
        .update({
          meeting_status: 'failed',
          meeting_error: errMsg,
          meeting_updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id)
        .select()
        .single();

      return { success: false, error: errMsg, booking: failedBooking || booking };
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // 3. Construct Event Payload
    const eventSummary = `Zenemoo — 30 Minute Meeting — ${booking.company_name}`;
    const eventDescription = `Zenemoo 30 Minute Discovery Call
------------------------------------
Booking ID: ${booking.booking_id}
Client Name: ${booking.full_name}
Company / Agency: ${booking.company_name}
Email: ${booking.email}
Phone: ${booking.phone}
Notes: ${booking.notes || 'None provided.'}

Zenemoo Data Solutions — Enterprise AI Language & Data Services`;

    const eventPayload = {
      summary: eventSummary,
      description: eventDescription,
      start: {
        dateTime: booking.start_time,
        timeZone: booking.timezone || 'Asia/Kolkata',
      },
      end: {
        dateTime: booking.end_time,
        timeZone: booking.timezone || 'Asia/Kolkata',
      },
      attendees: [
        { email: booking.email, displayName: booking.full_name },
      ],
      conferenceData: {
        createRequest: {
          requestId: `${booking.booking_id}-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    };

    console.log(`📅 [Google Meet Service] Inserting Calendar Event for ${booking.booking_id}...`);

    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventPayload,
      conferenceDataVersion: 1,
    });

    const eventData = response.data;
    const eventId = eventData.id;

    // Extract Meet URL
    let meetUrl = eventData.hangoutLink || null;
    if (!meetUrl && eventData.conferenceData?.entryPoints) {
      const videoEntryPoint = eventData.conferenceData.entryPoints.find(
        (ep) => ep.entryPointType === 'video'
      );
      if (videoEntryPoint?.uri) {
        meetUrl = videoEntryPoint.uri;
      }
    }

    if (!meetUrl && eventData.htmlLink) {
      // Fallback to event link if Meet URL was not generated directly
      meetUrl = eventData.htmlLink;
    }

    if (!meetUrl) {
      throw new Error('Google Calendar event created, but no Meet link was returned by Google API.');
    }

    console.log(`✅ [Google Meet Success] Event ID: ${eventId} | Meet URL: ${meetUrl}`);

    // 4. Save generated Meet URL & status into call_bookings
    const { data: updatedBooking, error: saveErr } = await supabase
      .from('call_bookings')
      .update({
        google_calendar_event_id: eventId,
        google_meet_url: meetUrl,
        meeting_status: 'generated',
        meeting_created_at: new Date().toISOString(),
        meeting_updated_at: new Date().toISOString(),
        meeting_generation_source: source,
        meeting_error: null,
      })
      .eq('id', booking.id)
      .select()
      .single();

    if (saveErr) {
      console.error('[Google Meet DB Save Error]:', saveErr.message);
    }

    return {
      success: true,
      booking: updatedBooking || booking,
      meetUrl,
      eventId,
    };
  } catch (err) {
    const errorMsg = err.message || 'Google Calendar / Meet API error';
    console.error(`❌ [Google Meet Exception] Booking ${booking?.booking_id || 'UNKNOWN'}:`, errorMsg);

    if (booking?.id) {
      await supabase
        .from('call_bookings')
        .update({
          meeting_status: 'failed',
          meeting_error: errorMsg.substring(0, 500),
          meeting_updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);
    }

    return {
      success: false,
      error: errorMsg,
      booking,
    };
  }
};

/**
 * Background Processor for Retrying Pending or Failed Meeting Generations
 */
export const processPendingMeetingGenerations = async () => {
  if (!supabase) return;

  try {
    const { data: pendingBookings, error } = await supabase
      .from('call_bookings')
      .select('*')
      .eq('status', 'confirmed')
      .in('meeting_status', ['pending', 'failed'])
      .lt('meeting_attempt_count', 3);

    if (error || !pendingBookings || pendingBookings.length === 0) {
      return;
    }

    console.log(`⚡ [Google Meet Worker] Found ${pendingBookings.length} pending/failed booking(s) for Meet generation.`);

    for (const booking of pendingBookings) {
      try {
        await createGoogleMeetForBooking(booking, 'retry_worker');
      } catch (e) {
        console.error(`[Worker Retry Error] Booking ${booking.booking_id}:`, e.message);
      }
    }
  } catch (err) {
    console.error('[Process Pending Meetings Exception]:', err.message);
  }
};

/**
 * Safe diagnostic function checking if Google Meet environment variables are configured.
 * Reports ONLY status flags (configured / not configured).
 * NEVER prints actual secrets, tokens, or private credentials!
 */
export const checkGoogleMeetConfiguration = () => {
  const hasClientId = Boolean(process.env.GOOGLE_CLIENT_ID);
  const hasClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);
  const hasRefreshToken = Boolean(process.env.GOOGLE_REFRESH_TOKEN);
  const hasCalendarId = Boolean(process.env.GOOGLE_CALENDAR_ID);
  const hasServiceEmail = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const hasServiceKey = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);

  const isOAuthValid = hasClientId && hasClientSecret && hasRefreshToken;
  const isServiceAccountValid = hasServiceEmail && hasServiceKey;

  const status = {
    googleClientId: hasClientId ? 'configured' : 'not configured',
    googleClientSecret: hasClientSecret ? 'configured' : 'not configured',
    googleRefreshToken: hasRefreshToken ? 'configured' : 'not configured',
    googleCalendarId: hasCalendarId ? 'configured' : 'not configured',
    googleServiceEmail: hasServiceEmail ? 'configured' : 'not configured',
    googleServiceKey: hasServiceKey ? 'configured' : 'not configured',
    isFullyConfigured: isOAuthValid || isServiceAccountValid,
  };

  console.log('⚙️ [Google Meet Diagnostics]:', {
    'Google Client ID': status.googleClientId,
    'Google Client Secret': status.googleClientSecret,
    'Google Refresh Token': status.googleRefreshToken,
    'Google Calendar ID': status.googleCalendarId,
    'Fully Operational': status.isFullyConfigured ? 'YES' : 'NO (Missing OAuth Credentials)',
  });

  return status;
};

