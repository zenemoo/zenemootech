/**
 * ZENEMOO Book a Call HTML Email Templates
 * Production-quality, enterprise-styled HTML emails for Customer and Admin
 */

const LOGO_URL = 'https://www.zenemoo.in/assets/logo.png';
const ADMIN_DASHBOARD_URL = 'https://www.zenemoo.in/#portal/9KqvA2Nz8';
const WEBSITE_URL = 'https://www.zenemoo.in';
const PRIVACY_URL = 'https://www.zenemoo.in/#privacy';
const TERMS_URL = 'https://www.zenemoo.in/#terms';

// Official Zenemoo Social Media Profile Links
const SOCIAL_LINKEDIN = 'https://www.linkedin.com/company/zenemoo/';
const SOCIAL_X = 'https://x.com/zenemooofficial';
const SOCIAL_INSTAGRAM = 'https://www.instagram.com/zenemooofficial';
const SOCIAL_YOUTUBE = 'https://www.youtube.com/channel/UCj8ryPiPOeM_HrWqkNsFkTg';
const SOCIAL_WHATSAPP = 'https://whatsapp.com/channel/0029Vb8VOTHGOj9eWQiiPs08';

// Social Icon URLs
const ICON_LINKEDIN = 'https://img.icons8.com/color/36/000000/linkedin.png';
const ICON_X = 'https://img.icons8.com/color/36/000000/twitter--v1.png';
const ICON_INSTAGRAM = 'https://img.icons8.com/color/36/000000/instagram-new.png';
const ICON_YOUTUBE = 'https://img.icons8.com/color/36/000000/youtube-play.png';
const ICON_WHATSAPP = 'https://img.icons8.com/color/36/000000/whatsapp.png';

/**
 * Timezone-aware Date Formatting Helper
 */
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

/**
 * Timezone-aware Time Formatting Helper
 */
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

/**
 * Format Time Range Helper
 */
export const formatBookingTimeRange = (startTimeIso, endTimeIso, timezone = 'Asia/Kolkata') => {
  const startStr = formatBookingTime(startTimeIso, timezone);
  const endStr = formatBookingTime(endTimeIso, timezone);
  if (!startStr) return '';
  if (!endStr) return startStr;
  return `${startStr} – ${endStr}`;
};

/**
 * Shared Social Media Icons HTML Component
 */
const renderSocialIconsHtml = () => `
  <div style="margin: 16px 0; text-align: center;">
    <a href="${SOCIAL_LINKEDIN}" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo LinkedIn">
      <img src="${ICON_LINKEDIN}" width="24" height="24" alt="LinkedIn" style="width:24px; height:24px; vertical-align:middle;" />
    </a>
    <a href="${SOCIAL_X}" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo X">
      <img src="${ICON_X}" width="24" height="24" alt="X (Twitter)" style="width:24px; height:24px; vertical-align:middle;" />
    </a>
    <a href="${SOCIAL_INSTAGRAM}" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo Instagram">
      <img src="${ICON_INSTAGRAM}" width="24" height="24" alt="Instagram" style="width:24px; height:24px; vertical-align:middle;" />
    </a>
    <a href="${SOCIAL_YOUTUBE}" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo YouTube">
      <img src="${ICON_YOUTUBE}" width="24" height="24" alt="YouTube" style="width:24px; height:24px; vertical-align:middle;" />
    </a>
    <a href="${SOCIAL_WHATSAPP}" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo WhatsApp">
      <img src="${ICON_WHATSAPP}" width="24" height="24" alt="WhatsApp" style="width:24px; height:24px; vertical-align:middle;" />
    </a>
  </div>
`;

/**
 * 1. Immediate Customer Booking Confirmation Email (Light/Clean Enterprise Theme)
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
    meeting_duration = 30,
    google_meet_url,
  } = booking;

  const dateFormatted = formatBookingDate(start_time, timezone);
  const timeFormatted = formatBookingTimeRange(start_time, end_time, timezone);

  const meetSectionHtml = google_meet_url
    ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 11px; font-family: monospace; color: #15803d; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">🎥 YOUR GOOGLE MEET IS READY</span>
        <h3 style="margin: 6px 0 12px 0; font-size: 16px; color: #166534; font-weight: 700;">Join Your Scheduled Meeting</h3>
        <div style="margin-bottom: 12px;">
          <a href="${google_meet_url}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-weight: 800; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(22,163,74,0.25);">
            🎥 JOIN GOOGLE MEET
          </a>
        </div>
        <div style="font-size: 12px; font-family: monospace; color: #15803d; word-break: break-all;">
          <a href="${google_meet_url}" target="_blank" style="color: #16a34a; text-decoration: underline;">${google_meet_url}</a>
        </div>
      </div>
    `
    : `
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #1d4ed8; font-weight: 600;">
          ℹ️ Meeting details will be shared before your scheduled meeting.
        </p>
      </div>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zenemoo Call Booking Confirmed — ${booking_id}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 16px 12px !important; }
      .content-padding { padding: 24px 18px !important; }
      .detail-label { width: 40% !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#334155;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table class="email-container" width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 24px 20px 24px; text-align: center; border-bottom: 2px solid #f1f5f9;">
              <img src="${LOGO_URL}" alt="Zenemoo Logo" width="56" height="56" style="display:inline-block; border-radius:50%; margin-bottom:8px; border:2px solid #e2e8f0;" />
              <h1 style="margin:0; font-size:22px; font-weight:800; color:#0f172a; letter-spacing:1px;">ZENEMOO</h1>
              <p style="margin:2px 0 0 0; font-size:11px; font-family:monospace; color:#64748b; text-transform:uppercase; letter-spacing:1.5px; font-weight:600;">Enterprise AI Language & Data Solutions</p>
            </td>
          </tr>
          <!-- Accent Line -->
          <tr>
            <td style="height:3px; background: linear-gradient(90deg, #2563eb, #8b5cf6, #06b6d4);"></td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="content-padding" style="padding: 32px 28px;">
              <!-- Status Badge -->
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background-color: #dcfce7; border: 1px solid #86efac; border-radius: 20px; padding: 6px 16px; font-size: 12px; font-family: monospace; color: #16a34a; font-weight: bold;">
                  ✓ Booking Confirmed
                </span>
              </div>

              <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #0f172a; text-align: center; font-weight: 800;">Your Call Has Been Scheduled</h2>

              <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-top: 0;">
                Hello <strong style="color: #0f172a;">${full_name}</strong>,
              </p>
              <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 20px;">
                Your booking has been successfully confirmed. Your call details are provided below:
              </p>

              <!-- Booking Details Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
                      <tr>
                        <td class="detail-label" width="35%" style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Booking ID:</td>
                        <td style="font-family: monospace; color: #0f172a; font-weight: bold;">${booking_id}</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Meeting:</td>
                        <td style="color: #1e293b; font-weight: 600;">Zenemoo ${meeting_type}</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Date:</td>
                        <td style="color: #0f172a; font-weight: 600;">${dateFormatted}</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Time:</td>
                        <td style="color: #2563eb; font-weight: 700;">${timeFormatted} (${timezone})</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Duration:</td>
                        <td style="color: #0f172a;">${meeting_duration} Minutes</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Company:</td>
                        <td style="color: #0f172a; font-weight: 600;">${company_name}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${meetSectionHtml}

              <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center; margin: 24px 0 20px 0;">
                We look forward to speaking with you regarding your language technology and data requirements.
              </p>

              <!-- Visit Website CTA -->
              <div style="text-align: center; margin-top: 24px;">
                <a href="${WEBSITE_URL}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 700; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37,99,235,0.2);">
                  🌐 Visit Zenemoo Website
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 28px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 12px; font-weight: bold; color: #475569; font-family: monospace; margin-bottom: 4px;">
                Zenemoo Data Solutions — Enterprise AI Language & Data Solutions
              </div>
              <div style="font-size: 11px; color: #64748b; font-family: sans-serif; margin-bottom: 12px;">
                K. Barida, Main Road, Odisha, India – 761031
              </div>

              ${renderSocialIconsHtml()}

              <div style="font-size: 11px; font-family: monospace; color: #64748b; margin-top: 12px;">
                <a href="${PRIVACY_URL}" target="_blank" style="color: #2563eb; text-decoration: none;">Privacy Policy</a> &bull; 
                <a href="${TERMS_URL}" target="_blank" style="color: #2563eb; text-decoration: none;">Terms &amp; Conditions</a> &bull; 
                <a href="${WEBSITE_URL}" target="_blank" style="color: #2563eb; text-decoration: none;">Official Site</a>
              </div>

              <div style="font-size: 11px; color: #94a3b8; margin-top: 10px;">
                &copy; 2026 Zenemoo Data Solutions. All rights reserved.
              </div>
              <div style="font-size: 10px; color: #cbd5e1; margin-top: 4px; font-style: italic;">
                This is an automated email. Please do not reply directly to this email.
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
 * 2. Immediate Admin New Booking Email (Dark Enterprise Theme)
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
    ? `
      <div style="margin-top:20px; padding:16px; background-color:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.3); border-radius:12px; text-align:center;">
        <span style="font-size:11px; font-family:monospace; color:#4ade80; font-weight:bold; text-transform:uppercase;">🎥 GOOGLE MEET READY</span><br/>
        <div style="margin:10px 0;">
          <a href="${google_meet_url}" target="_blank" style="display:inline-block; background-color:#22c55e; color:#000000; font-weight:800; font-size:12px; font-family:monospace; text-decoration:none; padding:10px 20px; border-radius:8px;">
            🎥 JOIN MEETING
          </a>
        </div>
        <div style="font-size:11px; font-family:monospace; color:#4ade80;">
          <a href="${google_meet_url}" target="_blank" style="color:#38bdf8; text-decoration:underline;">${google_meet_url}</a>
        </div>
      </div>
    `
    : `
      <div style="margin-top:20px; padding:14px; background-color:rgba(234,179,8,0.1); border:1px dashed rgba(234,179,8,0.4); border-radius:12px; text-align:center; font-size:12px; color:#eab308; font-family:monospace;">
        🕒 Meeting link pending generation (${meeting_status || 'pending'})
      </div>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Zenemoo Call Booking — ${booking_id}</title>
</head>
<body style="margin:0; padding:0; background-color:#030406; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#030406; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#0b0f19; border:1px solid rgba(168,85,247,0.3); border-radius:16px; overflow:hidden;">
          <!-- Top Header -->
          <tr>
            <td style="padding: 24px 28px; background: linear-gradient(135deg, #1e1b4b 0%, #0b0f19 100%); border-bottom: 1px solid rgba(255,255,255,0.08);">
              <span style="font-size:11px; font-family:monospace; color:#a855f7; font-weight:bold; text-transform:uppercase; letter-spacing:1.5px;">NEW ZENEMOO CALL BOOKING</span>
              <h2 style="margin:4px 0 0 0; font-size:20px; color:#ffffff; font-weight:800;">Booking Ref: ${booking_id}</h2>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="8" style="font-size:13px; color:#cbd5e1;">
                <tr>
                  <td width="35%" style="font-family:monospace; color:#a855f7; font-weight:bold; text-transform:uppercase;">Booking ID:</td>
                  <td style="color:#ffffff; font-weight:bold; font-family:monospace;">${booking_id}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold; text-transform:uppercase;">Name:</td>
                  <td style="color:#ffffff; font-weight:600;">${full_name}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold; text-transform:uppercase;">Email:</td>
                  <td style="color:#38bdf8;"><a href="mailto:${email}" style="color:#38bdf8; text-decoration:underline;">${email}</a></td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold; text-transform:uppercase;">Phone:</td>
                  <td style="color:#ffffff;">${phone || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold; text-transform:uppercase;">Company / Agency:</td>
                  <td style="color:#ffffff; font-weight:600;">${company_name}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold; text-transform:uppercase;">Date:</td>
                  <td style="color:#ffffff;">${dateFormatted}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold; text-transform:uppercase;">Time:</td>
                  <td style="color:#38bdf8; font-weight:bold;">${timeFormatted} (${timezone})</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold; text-transform:uppercase;">Notes:</td>
                  <td style="color:#e2e8f0; font-style:${notes ? 'normal' : 'italic'};">${notes || 'None provided.'}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#a855f7; font-weight:bold; text-transform:uppercase;">Status:</td>
                  <td style="color:#4ade80; font-weight:bold;">
                    <span style="display:inline-block; background-color:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.3); border-radius:12px; padding:2px 10px; font-size:11px; color:#4ade80;">Confirmed</span>
                  </td>
                </tr>
              </table>

              ${meetSectionHtml}

              <!-- Open Admin Dashboard CTA -->
              <div style="margin-top: 24px; text-align: center;">
                <a href="${ADMIN_DASHBOARD_URL}" target="_blank" style="display:inline-block; background-color:#a855f7; color:#ffffff; font-weight:bold; font-size:13px; font-family:monospace; text-decoration:none; padding:12px 24px; border-radius:8px; box-shadow: 0 4px 12px rgba(168,85,247,0.25);">
                  📋 Open Admin Dashboard
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px; background-color:#070a11; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; font-size:12px; font-family:monospace; color:#64748b;">
              <div style="color:#ffffff; font-weight:bold; margin-bottom:4px;">Zenemoo Data Solutions</div>
              <div>Enterprise AI Language &amp; Data Solutions</div>

              ${renderSocialIconsHtml()}

              <div style="color:#475569; margin-top:8px;">&copy; 2026 Zenemoo Data Solutions. All rights reserved.</div>
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
 * 3. Customer 1-Hour Reminder Email (Light/Clean Theme)
 */
export const generateCustomerReminderEmailHtml = (booking) => {
  const {
    booking_id,
    full_name,
    company_name,
    start_time,
    end_time,
    timezone = 'Asia/Kolkata',
    meeting_type = '30 Minute Meeting',
    meeting_duration = 30,
    google_meet_url,
  } = booking;

  const dateFormatted = formatBookingDate(start_time, timezone);
  const timeFormatted = formatBookingTimeRange(start_time, end_time, timezone);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Zenemoo Meeting Starts in 1 Hour — ${booking_id}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 16px 12px !important; }
      .content-padding { padding: 24px 18px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#334155;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table class="email-container" width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 24px 20px 24px; text-align: center; border-bottom: 2px solid #f1f5f9;">
              <img src="${LOGO_URL}" alt="Zenemoo Logo" width="56" height="56" style="display:inline-block; border-radius:50%; margin-bottom:8px; border:2px solid #e2e8f0;" />
              <h1 style="margin:0; font-size:22px; font-weight:800; color:#0f172a; letter-spacing:1px;">ZENEMOO</h1>
              <p style="margin:2px 0 0 0; font-size:11px; font-family:monospace; color:#64748b; text-transform:uppercase; letter-spacing:1.5px; font-weight:600;">Enterprise AI Language & Data Solutions</p>
            </td>
          </tr>
          <!-- Accent Line -->
          <tr>
            <td style="height:3px; background: linear-gradient(90deg, #16a34a, #2563eb, #8b5cf6);"></td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="content-padding" style="padding: 32px 28px;">
              <!-- Reminder Icon Badge -->
              <div style="text-align: center; margin-bottom: 16px;">
                <div style="display: inline-block; width: 48px; height: 48px; border-radius: 50%; background-color: #dcfce7; border: 1px solid #86efac; line-height: 48px; font-size: 24px; text-align: center;">
                  🔔
                </div>
              </div>

              <h2 style="margin: 0 0 6px 0; font-size: 22px; color: #0f172a; text-align: center; font-weight: 800;">Your Call Starts in 1 Hour!</h2>
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #64748b; text-align: center; font-weight: 600;">We're excited to connect with you.</p>

              <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-top: 0;">
                Hello <strong style="color: #0f172a;">${full_name}</strong>,
              </p>
              <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 20px;">
                This is a friendly reminder that your scheduled call with Zenemoo Data Solutions starts in 1 hour.
              </p>

              <!-- Booking Details Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
                      <tr>
                        <td width="35%" style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Booking ID:</td>
                        <td style="font-family: monospace; color: #0f172a; font-weight: bold;">${booking_id}</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Meeting:</td>
                        <td style="color: #1e293b; font-weight: 600;">Zenemoo ${meeting_type}</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Date:</td>
                        <td style="color: #0f172a; font-weight: 600;">${dateFormatted}</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Time:</td>
                        <td style="color: #2563eb; font-weight: 700;">${timeFormatted} (${timezone})</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Duration:</td>
                        <td style="color: #0f172a;">${meeting_duration} Minutes</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Company:</td>
                        <td style="color: #0f172a; font-weight: 600;">${company_name}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Google Meet CTA Box -->
              ${
                google_meet_url
                  ? `
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                      <span style="font-size: 11px; font-family: monospace; color: #15803d; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">🎥 JOIN YOUR GOOGLE MEET</span>
                      <p style="margin: 4px 0 14px 0; font-size: 13px; color: #166534;">Click the button below to join your meeting room.</p>
                      <div style="margin-bottom: 12px;">
                        <a href="${google_meet_url}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-weight: 800; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(22,163,74,0.3);">
                          🎥 Join Google Meet &gt;
                        </a>
                      </div>
                      <div style="font-size: 12px; font-family: monospace; color: #15803d; word-break: break-all;">
                        <a href="${google_meet_url}" target="_blank" style="color: #16a34a; text-decoration: underline;">${google_meet_url}</a>
                      </div>
                    </div>
                  `
                  : `
                    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
                      <p style="margin: 0; font-size: 13px; color: #1d4ed8; font-weight: 600;">
                        Meeting link will be shared directly before start time.
                      </p>
                    </div>
                  `
              }

              <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center; margin: 24px 0 20px 0;">
                We look forward to speaking with you regarding your language technology and data requirements.
              </p>

              <!-- Visit Website CTA -->
              <div style="text-align: center; margin-top: 20px;">
                <a href="${WEBSITE_URL}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 700; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37,99,235,0.2);">
                  🌐 Visit Zenemoo Website
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 28px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 12px; font-weight: bold; color: #475569; font-family: monospace; margin-bottom: 4px;">
                Zenemoo Data Solutions — Enterprise AI Language & Data Solutions
              </div>
              <div style="font-size: 11px; color: #64748b; font-family: sans-serif; margin-bottom: 12px;">
                K. Barida, Main Road, Odisha, India – 761031
              </div>

              ${renderSocialIconsHtml()}

              <div style="font-size: 11px; font-family: monospace; color: #64748b; margin-top: 12px;">
                <a href="${PRIVACY_URL}" target="_blank" style="color: #2563eb; text-decoration: none;">Privacy Policy</a> &bull; 
                <a href="${TERMS_URL}" target="_blank" style="color: #2563eb; text-decoration: none;">Terms &amp; Conditions</a> &bull; 
                <a href="${WEBSITE_URL}" target="_blank" style="color: #2563eb; text-decoration: none;">Official Site</a>
              </div>

              <div style="font-size: 11px; color: #94a3b8; margin-top: 10px;">
                &copy; 2026 Zenemoo Data Solutions. All rights reserved.
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
 * 4. Admin 1-Hour Reminder Email (Dark Enterprise Theme)
 */
export const generateAdminReminderEmailHtml = (booking) => {
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
    meeting_duration = 30,
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
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#030406; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#0b0f19; border:1px solid rgba(234,179,8,0.3); border-radius:16px; overflow:hidden;">
          <!-- Top Header -->
          <tr>
            <td style="padding: 24px 28px; background: linear-gradient(135deg, #422006 0%, #0b0f19 100%); border-bottom: 1px solid rgba(255,255,255,0.08);">
              <span style="font-size:11px; font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase; letter-spacing:1.5px;">🔔 ZENEMOO CALL REMINDER</span>
              <h2 style="margin:4px 0 2px 0; font-size:20px; color:#ffffff; font-weight:800;">Upcoming Call in 1 Hour</h2>
              <p style="margin:0; font-size:12px; color:#94a3b8; font-family:monospace;">This is a reminder for your upcoming scheduled call.</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="8" style="font-size:13px; color:#cbd5e1;">
                <tr>
                  <td width="35%" style="font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase;">Booking ID:</td>
                  <td style="color:#ffffff; font-weight:bold; font-family:monospace;">${booking_id}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase;">Name:</td>
                  <td style="color:#ffffff; font-weight:600;">${full_name}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase;">Email:</td>
                  <td style="color:#38bdf8;"><a href="mailto:${email}" style="color:#38bdf8; text-decoration:underline;">${email}</a></td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase;">Phone:</td>
                  <td style="color:#ffffff;">${phone || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase;">Company / Agency:</td>
                  <td style="color:#ffffff; font-weight:600;">${company_name}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase;">Date:</td>
                  <td style="color:#ffffff;">${dateFormatted}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase;">Time:</td>
                  <td style="color:#38bdf8; font-weight:bold;">${timeFormatted} (${timezone})</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase;">Duration:</td>
                  <td style="color:#ffffff;">${meeting_duration} Minutes</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase;">Notes:</td>
                  <td style="color:#e2e8f0; font-style:${notes ? 'normal' : 'italic'};">${notes || 'None provided.'}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace; color:#eab308; font-weight:bold; text-transform:uppercase;">Status:</td>
                  <td style="color:#4ade80; font-weight:bold;">Confirmed</td>
                </tr>
              </table>

              ${
                google_meet_url
                  ? `
                    <div style="margin-top:20px; padding:16px; background-color:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.3); border-radius:12px; text-align:center;">
                      <span style="font-size:11px; font-family:monospace; color:#4ade80; font-weight:bold; text-transform:uppercase;">🎥 GOOGLE MEET LINK</span>
                      <p style="margin:4px 0 10px 0; font-size:12px; color:#cbd5e1;">Your meeting link is ready. Click below to join.</p>
                      <div style="margin-bottom:8px;">
                        <a href="${google_meet_url}" target="_blank" style="display:inline-block; background-color:#22c55e; color:#000000; font-weight:800; font-size:13px; font-family:monospace; text-decoration:none; padding:10px 24px; border-radius:8px;">
                          🎥 Join Google Meet
                        </a>
                      </div>
                      <div style="font-size:11px; font-family:monospace; color:#4ade80;">
                        <a href="${google_meet_url}" target="_blank" style="color:#38bdf8; text-decoration:underline;">${google_meet_url}</a>
                      </div>
                    </div>
                  `
                  : `
                    <div style="margin-top:20px; padding:12px; background-color:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:8px; text-align:center; font-size:12px; color:#f87171;">
                      ⚠️ Meet URL pending or generation failed (${meeting_status})
                    </div>
                  `
              }

              <!-- Action Buttons -->
              <div style="margin-top:24px; text-align:center;">
                <a href="${ADMIN_DASHBOARD_URL}" target="_blank" style="display:inline-block; background-color:#a855f7; color:#ffffff; font-weight:bold; font-size:12px; font-family:monospace; text-decoration:none; padding:10px 20px; border-radius:8px; margin-right:8px;">
                  📋 Open Admin Dashboard
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px; background-color:#070a11; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; font-size:12px; font-family:monospace; color:#64748b;">
              <div style="color:#ffffff; font-weight:bold; margin-bottom:4px;">Zenemoo Data Solutions</div>
              <div>Enterprise AI Language &amp; Data Solutions</div>

              ${renderSocialIconsHtml()}

              <div style="color:#475569; margin-top:8px;">&copy; 2026 Zenemoo Data Solutions. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
