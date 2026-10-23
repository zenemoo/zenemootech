/**
 * ZENEMOO Client Meeting & Admin Event HTML Email Templates
 * Production-quality, enterprise-styled HTML emails with responsive layouts
 */

const LOGO_URL = 'https://www.zenemoo.in/assets/logo.png';
const WEBSITE_URL = 'https://www.zenemoo.in';
const PRIVACY_URL = 'https://www.zenemoo.in/#privacy';
const TERMS_URL = 'https://www.zenemoo.in/#terms';
const CONTACT_EMAIL = 'contact@zenemoo.in';

// Official Zenemoo Social Media Profile Links
const SOCIAL_LINKEDIN = 'https://www.linkedin.com/company/zenemoo/';
const SOCIAL_X = 'https://x.com/zenemooofficial';
const SOCIAL_INSTAGRAM = 'https://www.instagram.com/zenemooofficial';
const SOCIAL_YOUTUBE = 'https://www.youtube.com/channel/UCj8ryPiPOeM_HrWqkNsFkTg';

// Social Icon URLs
const ICON_LINKEDIN = 'https://img.icons8.com/color/36/000000/linkedin.png';
const ICON_X = 'https://img.icons8.com/color/36/000000/twitter--v1.png';
const ICON_INSTAGRAM = 'https://img.icons8.com/color/36/000000/instagram-new.png';
const ICON_YOUTUBE = 'https://img.icons8.com/color/36/000000/youtube-play.png';

export const formatEventDate = (dateStr, timezone = 'Asia/Kolkata') => {
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

export const formatEventTime = (isoTimeStr, timezone = 'Asia/Kolkata') => {
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

export const formatEventTimeRange = (startTimeIso, endTimeIso, timezone = 'Asia/Kolkata') => {
  const startStr = formatEventTime(startTimeIso, timezone);
  const endStr = formatEventTime(endTimeIso, timezone);
  if (!startStr) return '';
  if (!endStr) return startStr;
  return `${startStr} – ${endStr}`;
};

/**
 * Generate Branded Client Meeting Confirmation Email HTML
 */
export const generateClientMeetingEmailHtml = (event = {}) => {
  const {
    event_id = 'ZEN-CLT',
    title = 'Scheduled Client Meeting',
    client_name = 'Valued Client',
    company_name = 'Enterprise Partner',
    email = '',
    project_or_service = 'Zenemoo AI & Data Services',
    meeting_purpose = '',
    event_date = '',
    start_time = '',
    end_time = '',
    timezone = 'Asia/Kolkata',
    duration_minutes = 30,
    google_meet_url = '',
    meeting_status = 'pending',
  } = event;

  const formattedDate = formatEventDate(start_time || event_date, timezone);
  const formattedTimeRange = formatEventTimeRange(start_time, end_time, timezone);

  const meetSectionHtml = google_meet_url
    ? `
      <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <span style="font-size: 11px; font-family: monospace; color: #15803d; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">🎥 GOOGLE MEET IS READY</span>
        <h3 style="margin: 6px 0 12px 0; font-size: 16px; color: #166534; font-weight: 700;">Join Your Scheduled Meeting</h3>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #15803d;">Click the button below to join your meeting room directly.</p>
        <div>
          <a href="${google_meet_url}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-weight: 800; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(22,163,74,0.25);">
            🎥 JOIN GOOGLE MEET
          </a>
        </div>
        <div style="margin-top: 12px; font-size: 11px; font-family: monospace; color: #15803d;">
          Link: <a href="${google_meet_url}" target="_blank" style="color: #16a34a; text-decoration: underline;">${google_meet_url}</a>
        </div>
      </div>
    `
    : `
      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; margin: 24px 0; text-align: center;">
        <span style="font-size: 11px; font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">🕒 MEETING LINK</span>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #475569;">
          Meeting connection details will be provided prior to scheduled start time.
        </p>
      </div>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zenemoo Client Meeting Confirmed — ${event_id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #090d16 0%, #0e1726 100%); padding: 32px 28px; text-align: center; border-bottom: 3px solid #06b6d4;">
              <a href="${WEBSITE_URL}" target="_blank" style="text-decoration: none;">
                <img src="${LOGO_URL}" alt="Zenemoo" width="160" style="display: block; margin: 0 auto; max-width: 160px; height: auto;" />
              </a>
              <div style="display: inline-block; margin-top: 18px; padding: 4px 14px; background-color: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.35); border-radius: 9999px;">
                <span style="font-size: 11px; font-family: monospace; color: #38bdf8; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">CLIENT MEETING CONFIRMED</span>
              </div>
              <h1 style="margin: 12px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Hello <strong>${client_name}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Your client meeting with <strong>Zenemoo Data Solutions</strong> has been scheduled. Below are your meeting details, agenda, and video connection room:
              </p>

              <!-- Meeting Details Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="6" cellspacing="0" border="0" style="font-size: 13px;">
                      <tr>
                        <td width="35%" style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Meeting ID:</td>
                        <td width="65%" style="font-family: monospace; color: #0284c7; font-weight: 700;">${event_id}</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Company:</td>
                        <td style="color: #1e293b; font-weight: 600;">${company_name}</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Date:</td>
                        <td style="color: #0f172a; font-weight: 600;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Time:</td>
                        <td style="color: #0f172a; font-weight: 600;">${formattedTimeRange} (${timezone})</td>
                      </tr>
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Duration:</td>
                        <td style="color: #0f172a;">${duration_minutes} Minutes</td>
                      </tr>
                      ${project_or_service ? `
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">Service/Project:</td>
                        <td style="color: #0f172a;">${project_or_service}</td>
                      </tr>
                      ` : ''}
                      ${meeting_purpose ? `
                      <tr>
                        <td style="font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase; vertical-align: top;">Purpose/Agenda:</td>
                        <td style="color: #334155; line-height: 1.5;">${meeting_purpose}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Google Meet Button Block -->
              ${meetSectionHtml}

              <!-- Preparation & Support Information -->
              <div style="background-color: #f1f5f9; border-left: 4px solid #0284c7; padding: 14px 16px; border-radius: 4px; margin-top: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155;">
                  <strong>Need to reschedule or have questions?</strong><br/>
                  Please reply directly to this email or reach us at <a href="mailto:${CONTACT_EMAIL}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${CONTACT_EMAIL}</a> citing your Meeting ID <strong>${event_id}</strong>.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #090d16; padding: 24px 28px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08);">
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #94a3b8;">
                Zenemoo Data Solutions &bull; Enterprise AI Language &amp; Data Services
              </p>
              <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 16px auto;">
                <tr>
                  <td style="padding: 0 6px;">
                    <a href="${SOCIAL_LINKEDIN}" target="_blank"><img src="${ICON_LINKEDIN}" width="22" height="22" alt="LinkedIn" style="display:block; border:0;" /></a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="${SOCIAL_X}" target="_blank"><img src="${ICON_X}" width="22" height="22" alt="X" style="display:block; border:0;" /></a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="${SOCIAL_INSTAGRAM}" target="_blank"><img src="${ICON_INSTAGRAM}" width="22" height="22" alt="Instagram" style="display:block; border:0;" /></a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="${SOCIAL_YOUTUBE}" target="_blank"><img src="${ICON_YOUTUBE}" width="22" height="22" alt="YouTube" style="display:block; border:0;" /></a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                &copy; ${new Date().getFullYear()} Zenemoo Data Solutions. All rights reserved. &bull; 
                <a href="${PRIVACY_URL}" target="_blank" style="color: #64748b; text-decoration: none;">Privacy Policy</a> &bull; 
                <a href="${TERMS_URL}" target="_blank" style="color: #64748b; text-decoration: none;">Terms of Service</a>
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
 * Generate Internal Event / Training Invitation Email HTML
 */
export const generateInternalEventEmailHtml = (event = {}) => {
  const {
    event_id = 'ZEN-EVT',
    title = 'Internal Event / Training',
    description = '',
    agenda = '',
    event_date = '',
    start_time = '',
    end_time = '',
    timezone = 'Asia/Kolkata',
    duration_minutes = 60,
    location = '',
    google_meet_url = '',
    project_or_company = 'Zenemoo Internal',
  } = event;

  const formattedDate = formatEventDate(start_time || event_date, timezone);
  const formattedTimeRange = formatEventTimeRange(start_time, end_time, timezone);

  const connectionBlock = google_meet_url
    ? `
      <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center;">
        <span style="font-size: 11px; font-family: monospace; color: #15803d; font-weight: bold; text-transform: uppercase;">🎥 VIRTUAL MEETING ROOM</span>
        <div style="margin-top: 10px;">
          <a href="${google_meet_url}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-weight: 800; font-size: 13px; text-decoration: none; padding: 10px 24px; border-radius: 8px;">
            🎥 JOIN GOOGLE MEET
          </a>
        </div>
      </div>
    `
    : (location ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin: 20px 0;">
        <span style="font-size: 11px; font-family: monospace; color: #64748b; font-weight: bold; text-transform: uppercase;">📍 LOCATION / LINK:</span>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #0f172a; font-weight: 600;">${location}</p>
      </div>
    ` : '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Zenemoo Event: ${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #090d16 0%, #1e1b4b 100%); padding: 28px; text-align: center; border-bottom: 3px solid #8b5cf6;">
              <img src="${LOGO_URL}" alt="Zenemoo" width="150" style="display: block; margin: 0 auto;" />
              <div style="display: inline-block; margin-top: 14px; padding: 4px 12px; background-color: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 9999px;">
                <span style="font-size: 11px; font-family: monospace; color: #c4b5fd; font-weight: bold; text-transform: uppercase;">INTERNAL EVENT / TRAINING</span>
              </div>
              <h1 style="margin: 10px 0 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
                You have been invited to attend <strong>${title}</strong> (${event_id}).
              </p>
              <table width="100%" cellpadding="6" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; margin-bottom: 20px;">
                <tr>
                  <td width="30%" style="font-family: monospace; color: #64748b; font-weight: bold;">Date:</td>
                  <td width="70%" style="color: #0f172a; font-weight: 600;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="font-family: monospace; color: #64748b; font-weight: bold;">Time:</td>
                  <td style="color: #0f172a; font-weight: 600;">${formattedTimeRange} (${timezone})</td>
                </tr>
                <tr>
                  <td style="font-family: monospace; color: #64748b; font-weight: bold;">Duration:</td>
                  <td style="color: #0f172a;">${duration_minutes} Minutes</td>
                </tr>
              </table>
              ${description ? `<p style="margin: 0 0 14px 0; font-size: 13px; line-height: 1.5; color: #475569;"><strong>Overview:</strong> ${description}</p>` : ''}
              ${agenda ? `<div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; color: #334155; margin-bottom: 16px;"><strong>Agenda:</strong><br/>${agenda.replace(/\n/g, '<br/>')}</div>` : ''}
              ${connectionBlock}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
