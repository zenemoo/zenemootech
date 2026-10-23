import { adminEventService } from '../services/adminEventService.js';
import { sendMailViaBrevo } from '../services/emailService.js';
import {
  generateClientMeetingEmailHtml,
  generateClientMeetingReminderEmailHtml,
  generateInternalEventEmailHtml,
} from '../services/clientMeetingEmailTemplate.js';
import { createGoogleMeetForAdminEvent } from '../services/googleMeetService.js';
import { sendZenemooNotification } from '../services/pushNotificationEngine.js';
import { supabase } from '../config/supabase.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'zenemoo-admin-email@googlegroups.com';

/**
 * GET /api/bookings/admin/events
 * List admin events with type, status, date filtering, and search
 */
export const getAdminEvents = async (req, res, next) => {
  try {
    const { eventType, status, startDate, endDate, search, page = 1, limit = 10, sortBy = 'newest' } = req.query;
    const result = await adminEventService.getEvents({
      eventType,
      status,
      startDate,
      endDate,
      search,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      sortBy,
    });

    return res.json({
      success: true,
      events: result.events,
      totalCount: result.totalCount,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      pagination: {
        totalCount: result.totalCount,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/admin/events/:id
 * Get single event details
 */
export const getAdminEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await adminEventService.getEventById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    return res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings/admin/events/check-conflict
 * Check proposed [start_time, end_time] against active bookings and admin events
 */
export const checkEventConflictEndpoint = async (req, res, next) => {
  try {
    const { startTimeIso, endTimeIso, excludeEventId } = req.body;
    if (!startTimeIso || !endTimeIso) {
      return res.status(400).json({ success: false, message: 'startTimeIso and endTimeIso are required.' });
    }

    const checkResult = await adminEventService.checkIntervalConflict({
      startTimeIso,
      endTimeIso,
      excludeEventId,
    });

    return res.json({
      success: true,
      hasConflict: checkResult.hasConflict,
      conflictType: checkResult.conflictType,
      conflictingRecord: checkResult.conflictingRecord,
      message: checkResult.message || 'No scheduling conflicts found.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings/admin/events
 * Create a new Internal Event / Training or Client Meeting
 */
export const createAdminEvent = async (req, res, next) => {
  try {
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
      generateGoogleMeet = true,
      sendClientEmail = true,
    } = req.body;

    // 1. Validation
    if (!event_date || !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
      return res.status(400).json({ success: false, message: 'Valid event_date (YYYY-MM-DD) is required.' });
    }
    if (!start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'start_time and end_time are required.' });
    }
    if (new Date(end_time).getTime() <= new Date(start_time).getTime()) {
      return res.status(400).json({ success: false, message: 'end_time must be strictly after start_time.' });
    }

    if (event_type === 'client_meeting' && !client_name.trim()) {
      return res.status(400).json({ success: false, message: 'Client name is required for client meetings.' });
    }
    if (event_type === 'internal_event' && !title?.trim()) {
      return res.status(400).json({ success: false, message: 'Event title is required for internal events.' });
    }

    // 2. Conflict Check (Only if status is 'scheduled')
    if (status === 'scheduled') {
      const conflictCheck = await adminEventService.checkIntervalConflict({
        startTimeIso: start_time,
        endTimeIso: end_time,
      });

      if (conflictCheck.hasConflict) {
        return res.status(409).json({
          success: false,
          message: conflictCheck.message || 'The selected time conflicts with an existing booking or event.',
          conflict: conflictCheck.conflictingRecord,
        });
      }
    }

    // 3. Save Event Record in Database
    const adminUser = req.user || { email: 'admin' };
    let savedEvent = await adminEventService.createEvent(
      {
        event_type,
        title: title?.trim() || `Meeting with ${client_name?.trim()}`,
        description,
        agenda,
        internal_notes,
        client_name,
        company_name,
        email,
        phone,
        project_or_service,
        meeting_purpose,
        attendees,
        event_date,
        start_time,
        end_time,
        timezone,
        duration_minutes: parseInt(duration_minutes, 10) || 30,
        location,
        status,
        notify_attendees,
      },
      adminUser
    );

    // 4. Google Meet Generation (if requested and status is scheduled)
    if (generateGoogleMeet && status === 'scheduled') {
      try {
        const meetRes = await createGoogleMeetForAdminEvent(savedEvent);
        if (meetRes?.success && meetRes?.meetUrl) {
          savedEvent = await adminEventService.updateEvent(savedEvent.id, {
            google_meet_url: meetRes.meetUrl,
            google_calendar_event_id: meetRes.eventId,
            meeting_status: 'generated',
          });
        } else {
          savedEvent = await adminEventService.updateEvent(savedEvent.id, {
            meeting_status: 'failed',
          });
        }
      } catch (meetErr) {
        console.warn(`[Google Meet Generation Exception - ${savedEvent.event_id}]:`, meetErr.message);
      }
    }

    // 5. Email Dispatch (Only for scheduled events)
    const sender = process.env.EMAIL_FROM || 'Zenemoo Meetings <contact@zenemoo.in>';

    if (status === 'scheduled') {
      // A. Client Meeting Confirmation Email
      if (event_type === 'client_meeting' && email && sendClientEmail) {
        try {
          await sendMailViaBrevo({
            sender,
            recipients: email,
            subject: `Zenemoo Meeting Confirmed — ${savedEvent.title} (${savedEvent.event_id})`,
            html: generateClientMeetingEmailHtml(savedEvent),
          });

          savedEvent = await adminEventService.updateEvent(savedEvent.id, {
            customer_email_status: 'sent',
            customer_email_sent_at: new Date().toISOString(),
            customer_email_error: null,
          });
        } catch (mailErr) {
          console.error(`[Client Meeting Email Send Error - ${savedEvent.event_id}]:`, mailErr.message || mailErr);
          savedEvent = await adminEventService.updateEvent(savedEvent.id, {
            customer_email_status: 'failed',
            customer_email_error: (mailErr.message || String(mailErr)).substring(0, 500),
          });
        }
      }

      // B. Internal Event Attendee Notifications
      if (event_type === 'internal_event' && notify_attendees && Array.isArray(attendees)) {
        const attendeeEmails = attendees
          .map((a) => (typeof a === 'string' ? a.trim() : a.email?.trim()))
          .filter((em) => em && em.includes('@'));

        if (attendeeEmails.length > 0) {
          try {
            await sendMailViaBrevo({
              sender,
              recipients: attendeeEmails,
              subject: `Zenemoo Event Invitation — ${savedEvent.title} (${savedEvent.event_id})`,
              html: generateInternalEventEmailHtml(savedEvent),
            });
          } catch (attErr) {
            console.error(`[Attendee Notification Error - ${savedEvent.event_id}]:`, attErr.message || attErr);
          }
        }
      }
    }

    // 6. Admin Notification Bell Alert
    sendZenemooNotification({
      title: event_type === 'client_meeting' ? 'Client Meeting Scheduled' : 'Internal Event Scheduled',
      message: `${savedEvent.title} scheduled for ${savedEvent.event_date} (${savedEvent.duration_minutes} min).`,
      notification_type: 'event_created',
      target_type: 'admin',
      url: '/portal/9KqvA2Nz8#call-bookings',
      metadata: {
        event_id: savedEvent.event_id,
        event_type: savedEvent.event_type,
        start_time: savedEvent.start_time,
        meet_url: savedEvent.google_meet_url,
      },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: `${event_type === 'client_meeting' ? 'Client meeting' : 'Internal event'} scheduled successfully.`,
      event: savedEvent,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/bookings/admin/events/:id
 * Update event details, reschedule time, or update status
 */
export const updateAdminEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await adminEventService.getEventById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const {
      title,
      description,
      agenda,
      internal_notes,
      client_name,
      company_name,
      email,
      phone,
      project_or_service,
      meeting_purpose,
      attendees,
      event_date,
      start_time,
      end_time,
      timezone,
      duration_minutes,
      location,
      status,
      notify_attendees,
    } = req.body;

    const newStart = start_time || existing.start_time;
    const newEnd = end_time || existing.end_time;
    const newStatus = status || existing.status;

    // If rescheduled and active, check for conflicts (excluding this event)
    if (newStatus === 'scheduled' && (start_time || end_time)) {
      const conflictCheck = await adminEventService.checkIntervalConflict({
        startTimeIso: newStart,
        endTimeIso: newEnd,
        excludeEventId: existing.id,
      });

      if (conflictCheck.hasConflict) {
        return res.status(409).json({
          success: false,
          message: conflictCheck.message || 'Rescheduled time conflicts with an existing booking or event.',
          conflict: conflictCheck.conflictingRecord,
        });
      }
    }

    const adminUser = req.user || { email: 'admin' };
    const updated = await adminEventService.updateEvent(
      existing.id,
      {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(agenda !== undefined && { agenda: agenda.trim() }),
        ...(internal_notes !== undefined && { internal_notes: internal_notes.trim() }),
        ...(client_name !== undefined && { client_name: client_name.trim() }),
        ...(company_name !== undefined && { company_name: company_name.trim() }),
        ...(email !== undefined && { email: email.trim().toLowerCase() }),
        ...(phone !== undefined && { phone: phone.trim() }),
        ...(project_or_service !== undefined && { project_or_service: project_or_service.trim() }),
        ...(meeting_purpose !== undefined && { meeting_purpose: meeting_purpose.trim() }),
        ...(attendees !== undefined && { attendees: Array.isArray(attendees) ? attendees : [] }),
        ...(event_date !== undefined && { event_date }),
        ...(start_time !== undefined && { start_time }),
        ...(end_time !== undefined && { end_time }),
        ...(timezone !== undefined && { timezone }),
        ...(duration_minutes !== undefined && { duration_minutes: parseInt(duration_minutes, 10) || 30 }),
        ...(location !== undefined && { location: location.trim() }),
        ...(status !== undefined && { status }),
        ...(notify_attendees !== undefined && { notify_attendees: Boolean(notify_attendees) }),
      },
      adminUser
    );

    return res.json({
      success: true,
      message: 'Event updated successfully.',
      event: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/bookings/admin/events/:id
 * Delete an event and release reserved time
 */
export const deleteAdminEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await adminEventService.getEventById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    await adminEventService.deleteEvent(existing.id);

    return res.json({
      success: true,
      message: 'Event deleted successfully and reserved time released.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings/admin/events/:id/resend-email
 * Resend confirmation email for a client meeting
 */
export const resendClientMeetingEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const emailType = req.body?.emailType || req.query?.type || 'confirmation';
    const event = await adminEventService.getEventById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event record not found.' });
    }

    if (event.event_type !== 'client_meeting' || !event.email) {
      return res.status(400).json({ success: false, message: 'Only client meetings with a valid email can be resent.' });
    }

    const sender = process.env.EMAIL_FROM || 'Zenemoo Meetings <contact@zenemoo.in>';

    if (emailType === 'reminder') {
      try {
        await sendMailViaBrevo({
          sender,
          recipients: event.email,
          subject: `Reminder: Your Zenemoo Client Meeting Starts in 1 Hour — ${event.event_id}`,
          html: generateClientMeetingReminderEmailHtml(event),
        });

        const updated = await adminEventService.updateEvent(event.id, {
          customer_reminder_status: 'sent',
          customer_reminder_sent_at: new Date().toISOString(),
          customer_reminder_error: null,
        });

        return res.json({
          success: true,
          message: `1-hour pre-meeting reminder email successfully resent to ${event.email}.`,
          event: updated,
        });
      } catch (sendErr) {
        console.error(`[Resend Client Reminder Email Error - ${event.event_id}]:`, sendErr.message);
        const errMsg = (sendErr.message || 'Mail server error.').substring(0, 500);

        const updated = await adminEventService.updateEvent(event.id, {
          customer_reminder_status: 'failed',
          customer_reminder_error: errMsg,
        });

        return res.status(500).json({
          success: false,
          message: `Failed to deliver reminder email: ${errMsg}`,
          event: updated,
        });
      }
    } else {
      // Default: confirmation email
      try {
        await sendMailViaBrevo({
          sender,
          recipients: event.email,
          subject: `Zenemoo Meeting Confirmed — ${event.title} (${event.event_id})`,
          html: generateClientMeetingEmailHtml(event),
        });

        const updated = await adminEventService.updateEvent(event.id, {
          customer_email_status: 'sent',
          customer_email_sent_at: new Date().toISOString(),
          customer_email_error: null,
        });

        return res.json({
          success: true,
          message: `Meeting confirmation email successfully resent to ${event.email}.`,
          event: updated,
        });
      } catch (sendErr) {
        console.error(`[Resend Client Meeting Email Error - ${event.event_id}]:`, sendErr.message);
        const errMsg = (sendErr.message || 'Mail server error.').substring(0, 500);

        const updated = await adminEventService.updateEvent(event.id, {
          customer_email_status: 'failed',
          customer_email_error: errMsg,
        });

        return res.status(500).json({
          success: false,
          message: `Failed to deliver confirmation email: ${errMsg}`,
          event: updated,
        });
      }
    }
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings/admin/events/:id/generate-meeting
 * On-demand retry for Google Meet generation
 */
export const generateMeetingForAdminEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await adminEventService.getEventById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (event.google_meet_url && event.google_calendar_event_id) {
      return res.json({
        success: true,
        message: 'Google Meet link already exists.',
        meetUrl: event.google_meet_url,
        event,
      });
    }

    const meetRes = await createGoogleMeetForAdminEvent(event);
    if (meetRes?.success && meetRes?.meetUrl) {
      const updated = await adminEventService.updateEvent(event.id, {
        google_meet_url: meetRes.meetUrl,
        google_calendar_event_id: meetRes.eventId,
        meeting_status: 'generated',
      });

      return res.json({
        success: true,
        message: 'Google Meet generated successfully.',
        meetUrl: meetRes.meetUrl,
        event: updated,
      });
    } else {
      await adminEventService.updateEvent(event.id, {
        meeting_status: 'failed',
      });

      return res.status(500).json({
        success: false,
        message: meetRes?.error || 'Failed to generate Google Meet.',
      });
    }
  } catch (err) {
    next(err);
  }
};
