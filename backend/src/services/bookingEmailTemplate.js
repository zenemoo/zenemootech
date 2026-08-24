/**
 * ZENEMOO Book a Call HTML Email Templates
 * Professional enterprise-styled emails for Customer and Admin
 */

const LOGO_URL = 'https://www.zenemoo.in/assets/logo.png';

export const formatBookingDate = (dateStr, timezone = 'Asia/Kolkata') => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone || 'Asia/Kolkata',
  });
};

export const formatBookingTime = (isoTimeStr, timezone = 'Asia/Kolkata') => {
  if (!isoTimeStr) return '';
  const d = new Date(isoTimeStr);
  if (isNaN(d.getTime())) return isoTimeStr;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone || 'Asia/Kolkata',
  });
};

export const formatBookingTimeRange = (startTimeIso, endTimeIso, timezone = 'Asia/Kolkata') => {
  const startStr = formatBookingTime(startTimeIso, timezone);
  const endStr = formatBookingTime(endTimeIso, timezone);
  if (!startStr) return '';
  if (!endStr) return startStr;
  return `${startStr} – ${endStr}`;
};

/**
 * 1. Immediate Customer Booking Confirmation Email (No Meet URL yet)
 */
export const generateCustomerBookingEmailHtml = (booking) => {
  const {
    booking_id,
    full_name,
    company_name,
    start_time,
    end_time,
    timezone = 'Asia/Kolkata',
    meeting_type = '30 Minute Meeting',
  } = booking;

  const dateFormatted = formatBookingDate(start_time, timezone);
  const timeFormatted = formatBookingTimeRange(start_time, end_time, timezone);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zenemoo Call Booking Confirmed — ${booking_id}</title>
</head>
<body style="margin:0; padding:0; background-color:#030406; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#030406; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#0b0f19; border:1px solid rgba(6,182,212,0.25); border-radius:16px; overflow:hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px; background: linear-gradient(135deg, #0b0f19 0%, #111827 100%); border-b: 1px solid rgba(255,255,255,0.08); text-align: center;">
              <img src="${LOGO_URL}" alt="Zenemoo Data Solutions" width="56" height="56" style="display:inline-block; border-radius:50%; margin-bottom:12px;" />
              <h1 style="margin:0; font-size:24px; font-weight:800; color:#ffffff; letter-spacing:0.5px;">ZENEMOO</h1>
              <p style="margin:4px 0 0 0; font-size:11px; font-family:monospace; color:#06b6d4; text-transform:uppercase; letter-spacing:2px;">Enterprise AI Language & Data Solutions</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <div style="background: rgba(6,182,212,0.08); border:1px solid rgba(6,182,212,0.2); border-radius:12px; padding: 16px; text-align:center; margin-bottom: 28px;">
                <span style="font-size:12px; font-family:monospace; color:#38bdf8; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">Booking Confirmed</span>
                <h2 style="margin:6px 0 0 0; font-size:22px; color:#ffffff;">Your Call Has Been Scheduled</h2>
              </div>

              <p style="font-size:15px; color:#cbd5e1; line-height:1.6; margin-top:0;">
                Hello <strong style="color:#ffffff;">${full_name}</strong>,
              </p>
              <p style="font-size:14px; color:#94a3b8; line-height:1.6;">
                Your booking has been successfully confirmed. Your call details are provided below:
              </p>

              <!-- Booking Details Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#131c2e; border:1px solid rgba(255,255,255,0.08); border-radius:12px; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="6">
                      <tr>
                        <td width="35%" style="font-size:12px; font-family:monospace; color:#06b6d4; font-weight:bold; text-transform:uppercase;">Booking ID:</td>
                        <td style="font-size:14px; font-family:monospace; color:#ffffff; font-weight:bold;">${booking_id}</td>
                      </tr>
                      <tr>
                        <td style="font-size:12px; font-family:monospace; color:#06b6d4; font-weight:bold; text-transform:uppercase;">Meeting:</td>
                        <td style="font-size:14px; color:#f8fafc; font-weight:600;">Zenemoo ${meeting_type}</td>
                      </tr>
                      <tr>
                        <td style="font-size:12px; font-family:monospace; color:#06b6d4; font-weight:bold; text-transform:uppercase;">Date:</td>
                        <td style="font-size:14px; color:#ffffff; font-weight:600;">${dateFormatted}</td>
                      </tr>
                      <tr>
                        <td style="font-size:12px; font-family:monospace; color:#06b6d4; font-weight:bold; text-transform:uppercase;">Time:</td>
                        <td style="font-size:14px; color:#ffffff; font-weight:600;">${timeFormatted} (${timezone})</td>
                      </tr>
                      <tr>
                        <td style="font-size:12px; font-family:monospace; color:#06b6d4; font-weight:bold; text-transform:uppercase;">Duration:</td>
                        <td style="font-size:14px; color:#ffffff;">30 Minutes</td>
                      </tr>
                      <tr>
                        <td style="font-size:12px; font-family:monospace; color:#06b6d4; font-weight:bold; text-transform:uppercase;">Company:</td>
                        <td style="font-size:14px; color:#ffffff;">${company_name}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="background-color: rgba(6,182,212,0.05); border-left: 3px solid #06b6d4; padding: 12px 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin:0; font-size:13px; color:#38bdf8;">
                  ℹ️ Meeting details will be shared before your scheduled meeting.
                </p>
              </div>

              <p style="font-size:14px; color:#94a3b8; line-height:1.6;">
                We look forward to speaking with you regarding your language technology and data requirements.
              </p>

              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center;">
                <a href="https://www.zenemoo.in" style="display:inline-block; background-color:#06b6d4; color:#000000; font-weight:bold; font-size:13px; font-family:monospace; text-decoration:none; padding:12px 24px; border-radius:8px;">Visit Zenemoo Website</a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color:#070a11; border-t: 1px solid rgba(255,255,255,0.05); text-align: center; font-size:12px; font-family:monospace; color:#64748b;">
              <p style="margin:0;">Zenemoo Data Solutions — Enterprise AI Language & Data Solutions</p>
              <p style="margin:4px 0 0 0; color:#475569;">K. Barida, Main Road, Odisha, India – 761031</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * 2. Immediate Admin New Booking Email
 */
export const generateAdminBookingEmailHtml = (booking) => {
  const {
    booking_id,
    full_name,
    email,
    phone,
    company_name,
    notes,
    start_time,
    end_time,
    timezone = 'Asia/Kolkata',
    google_meet_url,
    meeting_status = 'pending',
  } = booking;

  const dateFormatted = formatBookingDate(start_time, timezone);
  const timeFormatted = formatBookingTimeRange(start_time, end_time, timezone);

  const meetSectionHtml = google_meet_url
    ? `<div style="margin-top:16px; padding:12px; background-color:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.3); border-radius:8px; text-align:center;">
        <span style="font-size:11px; font-family:monospace; color:#4ade80; font-weight:bold;">GOOGLE MEET GENERATED</span><br/>
        <a href="${google_meet_url}" style="color:#38bdf8; font-weight:bold; text-decoration:underline; font-size:13px;">${google_meet_url}</a>
       </div>`
    : `<div style="margin-top:16px; padding:12px; background-color:rgba(234,179,8,0.1); border:1px solid rgba(234,179,8,0.3); border-radius:8px; text-align:center; font-size:12px; color:#eab308; font-family:monospace;">
        Meeting link pending generation (${meeting_status})
       </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Zenemoo Call Booking — ${booking_id}</title>
</head>
<body style="margin:0; padding:0; background-color:#030406; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#0b0f19; border:1px solid rgba(168,85,247,0.3); border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #1e1b4b 0%, #0b0f19 100%); border-b: 1px solid rgba(255,255,255,0.08);">
              <span style="font-size:11px; font-family:monospace; color:#a855f7; font-weight:bold; text-transform:uppercase; letter-spacing:1.5px;">NEW ZENEMOO CALL BOOKING</span>
              <h2 style="margin:4px 0 0 0; font-size:20px; color:#ffffff;">Booking Ref: ${booking_id}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="8" style="font-size:14px; color:#cbd5e1;">
                <tr>
                  <td width="35%" style="font-family:monospace; color:#a855f7; font-weight:bold;">Booking ID:</td>
                  <td style="color:#ffffff; font-weight:bold; font-family:monospace;">${booking_id}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold;">Name:</td>
                  <td style="color:#ffffff; font-weight:600;">${full_name}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold;">Email:</td>
                  <td style="color:#38bdf8;">${email}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold;">Phone:</td>
                  <td style="color:#ffffff;">${phone || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold;">Company / Agency:</td>
                  <td style="color:#ffffff; font-weight:600;">${company_name}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold;">Date:</td>
                  <td style="color:#ffffff;">${dateFormatted}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold;">Time:</td>
                  <td style="color:#ffffff;">${timeFormatted} (${timezone})</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold;">Notes:</td>
                  <td style="color:#e2e8f0; font-style:${notes ? 'normal' : 'italic'};">${notes || 'None provided.'}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold;">Status:</td>
                  <td style="color:#4ade80; font-weight:bold;">Confirmed</td>
                </tr>
              </table>

              ${meetSectionHtml}

              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center;">
                <a href="https://www.zenemoo.in/#portal/9KqvA2Nz8" style="display:inline-block; background-color:#a855f7; color:#ffffff; font-weight:bold; font-size:12px; font-family:monospace; text-decoration:none; padding:10px 20px; border-radius:8px;">Open Admin Dashboard</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * 3. Customer 1-Hour Reminder Email (Includes JOIN GOOGLE MEET button if generated)
 */
export const generateCustomerReminderEmailHtml = (booking) => {
  const {
    booking_id,
    full_name,
    company_name,
    start_time,
    end_time,
    timezone = 'Asia/Kolkata',
    google_meet_url,
  } = booking;

  const dateFormatted = formatBookingDate(start_time, timezone);
  const timeFormatted = formatBookingTimeRange(start_time, end_time, timezone);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your Zenemoo Meeting Starts in 1 Hour — ${booking_id}</title>
</head>
<body style="margin:0; padding:0; background-color:#030406; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#0b0f19; border:1px solid rgba(234,179,8,0.3); border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #422006 0%, #0b0f19 100%); border-b: 1px solid rgba(255,255,255,0.08); text-align:center;">
              <span style="font-size:11px; font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase; letter-spacing:1.5px;">⏰ MEETING REMINDER</span>
              <h2 style="margin:6px 0 0 0; font-size:20px; color:#ffffff;">Your Zenemoo Meeting Starts in 1 Hour</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="font-size:15px; color:#cbd5e1; margin-top:0;">Hello <strong style="color:#ffffff;">${full_name}</strong>,</p>
              <p style="font-size:14px; color:#94a3b8; line-height:1.6;">
                This is a friendly reminder that your 30-minute meeting with Zenemoo Data Solutions is scheduled to start in approximately 1 hour.
              </p>

              <table width="100%" border="0" cellspacing="0" cellpadding="8" style="background-color:#131c2e; border-radius:10px; margin: 20px 0; font-size:13px;">
                <tr>
                  <td width="35%" style="font-family:monospace; color:#eab308; font-weight:bold;">Booking ID:</td>
                  <td style="color:#ffffff; font-family:monospace; font-weight:bold;">${booking_id}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308; font-weight:bold;">Company:</td>
                  <td style="color:#ffffff;">${company_name}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308; font-weight:bold;">Date:</td>
                  <td style="color:#ffffff;">${dateFormatted}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308; font-weight:bold;">Time:</td>
                  <td style="color:#ffffff;">${timeFormatted} (${timezone})</td>
                </tr>
              </table>

              ${
                google_meet_url
                  ? `<div style="text-align:center; margin: 28px 0;">
                      <a href="${google_meet_url}" style="display:inline-block; background-color:#22c55e; color:#000000; font-weight:bold; font-size:14px; font-family:monospace; text-decoration:none; padding:14px 28px; border-radius:10px; box-shadow: 0 10px 20px rgba(34,197,94,0.2);">JOIN GOOGLE MEET</a>
                     </div>`
                  : `<div style="padding:12px; background-color:rgba(234,179,8,0.1); border:1px solid rgba(234,179,8,0.3); border-radius:8px; text-align:center; font-size:12px; color:#eab308;">
                      Meeting link will be shared directly before start time.
                     </div>`
              }

              <p style="font-size:13px; color:#94a3b8; margin-bottom:0; text-align:center;">
                We look forward to speaking with you.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * 4. Admin 1-Hour Reminder Email
 */
export const generateAdminReminderEmailHtml = (booking) => {
  const {
    booking_id,
    full_name,
    email,
    phone,
    company_name,
    start_time,
    end_time,
    timezone = 'Asia/Kolkata',
    google_meet_url,
    meeting_status = 'pending',
  } = booking;

  const dateFormatted = formatBookingDate(start_time, timezone);
  const timeFormatted = formatBookingTimeRange(start_time, end_time, timezone);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Zenemoo Meeting Starts in 1 Hour — ${booking_id}</title>
</head>
<body style="margin:0; padding:0; background-color:#030406; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#0b0f19; border:1px solid rgba(234,179,8,0.3); border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding: 20px 32px; background-color: #422006; border-b: 1px solid rgba(255,255,255,0.08);">
              <span style="font-size:11px; font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase;">ADMIN REMINDER (1 HOUR)</span>
              <h2 style="margin:4px 0 0 0; font-size:18px; color:#ffffff;">Upcoming Call in 1 Hour: ${booking_id}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size:13px; color:#cbd5e1;">
                <tr>
                  <td width="35%" style="font-family:monospace; color:#eab308;">Booking ID:</td>
                  <td style="color:#ffffff; font-family:monospace; font-weight:bold;">${booking_id}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308;">Client Name:</td>
                  <td style="color:#ffffff; font-weight:bold;">${full_name}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308;">Company:</td>
                  <td style="color:#ffffff;">${company_name}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308;">Email:</td>
                  <td style="color:#38bdf8;">${email}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308;">Phone:</td>
                  <td style="color:#ffffff;">${phone || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308;">Time:</td>
                  <td style="color:#ffffff; font-weight:bold;">${timeFormatted} (${timezone})</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308;">Meeting Status:</td>
                  <td style="color:#ffffff; font-weight:bold;">${meeting_status}</td>
                </tr>
              </table>

              ${
                google_meet_url
                  ? `<div style="margin-top:20px; text-align:center;">
                      <a href="${google_meet_url}" style="display:inline-block; background-color:#a855f7; color:#ffffff; font-weight:bold; font-size:13px; font-family:monospace; text-decoration:none; padding:10px 20px; border-radius:8px;">Open Google Meet Room</a>
                     </div>`
                  : `<div style="margin-top:20px; padding:10px; background-color:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:8px; text-align:center; font-size:12px; color:#f87171;">
                      ⚠️ Meet URL pending or generation failed. Action required in Admin Dashboard.
                     </div>`
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
