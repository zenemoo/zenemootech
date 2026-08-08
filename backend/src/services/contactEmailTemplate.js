/**
 * Helper to escape HTML special characters to prevent XSS & HTML injection inside email clients
 */
export const escapeHtml = (str = '') => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Format timestamp into IST (Indian Standard Time) string: e.g. "08 May 2026, 11:45 AM (IST)"
 */
export const formatIstDateTime = (isoDateString) => {
  try {
    const d = isoDateString ? new Date(isoDateString) : new Date();
    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    };
    const formatted = d.toLocaleString('en-IN', options);
    return `${formatted} (IST)`;
  } catch (_) {
    return `${new Date().toLocaleDateString('en-IN')} (IST)`;
  }
};

/**
 * Generate Responsive HTML Email Template for Zenemoo Contact Inquiry Confirmation
 * Designed to match Zenemoo Enterprise brand guidelines & design mockup
 */
export const generateContactConfirmationHtml = (inquiry = {}) => {
  const code = escapeHtml(inquiry.inquiry_code || 'ZNM-2026-CONFIRM');
  const name = escapeHtml(inquiry.name || 'Valued Client');
  const email = escapeHtml(inquiry.email || '');
  const phone = escapeHtml(inquiry.phone || '');
  const company = escapeHtml(inquiry.company || '');
  const service = escapeHtml(inquiry.service || 'Audio Transcription');
  const language = escapeHtml(inquiry.language || 'Odia');
  const message = escapeHtml(inquiry.message || '');
  const dateFormatted = formatIstDateTime(inquiry.created_at);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zenemoo — Contact Inquiry Received | Ticket #${code}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #05070e; font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; }
    @media screen and (max-width: 620px) {
      .container { width: 100% !important; padding: 10px !important; }
      .col-split { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
      .header-title { font-size: 20px !important; }
      .ticket-code { font-size: 16px !important; }
      .padding-wrapper { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#05070e;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#05070e; padding: 24px 0;">
    <tr>
      <td align="center">
        <!-- Main Card Wrapper -->
        <table role="presentation" class="container" width="620" border="0" cellspacing="0" cellpadding="0" style="width:620px; max-width:620px; background-color:#ffffff; border-radius:20px; overflow:hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border: 1px solid #1e293b;">
          
          <!-- 1. DARK NAVY BRAND HEADER WITH EMBEDDED LOGO -->
          <tr>
            <td style="background-color:#090d16; background-image: linear-gradient(135deg, #090d16 0%, #0f172a 100%); padding: 36px 30px; text-align: center; border-bottom: 3px solid #06b6d4;">
              <a href="https://www.zenemoo.in" target="_blank" style="text-decoration:none; display:inline-block;">
                <img src="https://www.zenemoo.in/assets/logo.png" alt="Zenemoo Logo" width="56" height="56" style="width:56px; height:56px; border-radius:50%; background:#ffffff; padding:3px; display:inline-block; border: 2px solid #06b6d4;">
              </a>
              <div style="font-family:'Montserrat', Arial, sans-serif; font-size:24px; font-weight:800; color:#ffffff; letter-spacing:2px; margin-top:12px;">
                ZENEMOO
              </div>
              <div style="font-family: monospace; font-size:10px; color:#38bdf8; letter-spacing:3px; text-transform:uppercase; margin-top:3px;">
                EST 2023 &bull; AI DATA SOLUTIONS
              </div>
            </td>
          </tr>

          <!-- 2. HERO ACKNOWLEDGMENT HEADING -->
          <tr>
            <td class="padding-wrapper" style="padding: 35px 35px 25px 35px; background-color:#ffffff;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 class="header-title" style="margin:0 0 12px 0; font-size:24px; font-weight:800; color:#0f172a; line-height:1.3;">
                      Thank You for Contacting Zenemoo!
                    </h1>
                    <p style="margin:0 0 10px 0; font-size:14px; color:#475569; line-height:1.6;">
                      We have received your message and our team will get back to you as soon as possible.
                    </p>
                    <p style="margin:0; font-size:13px; color:#64748b; line-height:1.5;">
                      In the meantime, you can track your inquiry using your ticket number below.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 3. TICKET NUMBER & SUBMITTED DATE CARDS (2-COLUMN GRID) -->
          <tr>
            <td class="padding-wrapper" style="padding: 0 35px 25px 35px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Ticket Box -->
                  <td class="col-split" width="49%" valign="top" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:18px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top">
                          <div style="width:34px; height:34px; border-radius:10px; background-color:#e0f2fe; text-align:center; line-height:34px; font-size:18px;">🎫</div>
                        </td>
                        <td style="padding-left:10px;">
                          <div style="font-size:11px; font-family:monospace; text-transform:uppercase; color:#64748b; font-weight:bold; letter-spacing:0.5px;">Your Ticket Number</div>
                          <div class="ticket-code" style="font-size:17px; font-family:monospace; font-weight:800; color:#0284c7; margin:4px 0 2px 0;">#${code}</div>
                          <div style="font-size:10px; color:#94a3b8; line-height:1.3;">Please use this ticket number for any future communication regarding your inquiry.</div>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td width="2%" style="font-size:1px;">&nbsp;</td>

                  <!-- Date Box -->
                  <td class="col-split" width="49%" valign="top" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:18px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top">
                          <div style="width:34px; height:34px; border-radius:10px; background-color:#f0fdf4; text-align:center; line-height:34px; font-size:18px;">📅</div>
                        </td>
                        <td style="padding-left:10px;">
                          <div style="font-size:11px; font-family:monospace; text-transform:uppercase; color:#64748b; font-weight:bold; letter-spacing:0.5px;">Submitted On</div>
                          <div style="font-size:13px; font-weight:700; color:#0f172a; margin:4px 0 2px 0;">${dateFormatted}</div>
                          <div style="font-size:10px; color:#94a3b8;">Registered in Zenemoo System</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 4. SUBMITTED INQUIRY DATA CARD (DARK ENTERPRISE PANEL) -->
          <tr>
            <td class="padding-wrapper" style="padding: 0 35px 25px 35px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0f172a; border-radius:16px; padding:24px; color:#ffffff;">
                <tr>
                  <td>
                    <div style="font-size:11px; font-family:monospace; text-transform:uppercase; color:#38bdf8; font-weight:bold; letter-spacing:1px; margin-bottom:16px;">
                      📋 YOUR SUBMITTED INQUIRY DETAILS
                    </div>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:13px; color:#cbd5e1;">
                      <tr>
                        <td width="110" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Full Name:</td>
                        <td style="padding:6px 0; color:#ffffff; font-weight:bold;">${name}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#94a3b8; font-weight:bold;">Email Address:</td>
                        <td style="padding:6px 0; color:#38bdf8; font-weight:bold; font-family:monospace;">${email}</td>
                      </tr>
                      ${phone ? `
                      <tr>
                        <td style="padding:6px 0; color:#94a3b8; font-weight:bold;">Phone Number:</td>
                        <td style="padding:6px 0; color:#ffffff; font-family:monospace;">${phone}</td>
                      </tr>` : ''}
                      ${company ? `
                      <tr>
                        <td style="padding:6px 0; color:#94a3b8; font-weight:bold;">Company / Org:</td>
                        <td style="padding:6px 0; color:#ffffff;">${company}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:6px 0; color:#94a3b8; font-weight:bold;">Service:</td>
                        <td style="padding:6px 0; color:#34d399; font-weight:bold;">${service}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#94a3b8; font-weight:bold;">Language(s):</td>
                        <td style="padding:6px 0; color:#a78bfa; font-weight:bold;">${language}</td>
                      </tr>
                    </table>

                    <!-- Message Quote Box -->
                    <div style="margin-top:16px; padding:14px; background-color:rgba(255,255,255,0.06); border-left:3px solid #38bdf8; border-radius:8px;">
                      <div style="font-size:10px; font-family:monospace; text-transform:uppercase; color:#94a3b8; margin-bottom:4px;">Your Message:</div>
                      <div style="font-size:13px; color:#f1f5f9; line-height:1.5; white-space:pre-wrap;">"${message}"</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 5. WHAT HAPPENS NEXT & NEED ASSISTANCE GRID -->
          <tr>
            <td class="padding-wrapper" style="padding: 0 35px 30px 35px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Left: What Happens Next -->
                  <td class="col-split" width="49%" valign="top" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:18px;">
                    <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:12px;">What Happens Next?</div>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:12px; color:#475569;">
                      <tr>
                        <td width="22" valign="top" style="padding-bottom:10px; color:#10b981; font-weight:bold;">✓</td>
                        <td style="padding-bottom:10px;">We have received your inquiry. Our team is reviewing the details.</td>
                      </tr>
                      <tr>
                        <td width="22" valign="top" style="padding-bottom:10px; color:#3b82f6; font-weight:bold;">👥</td>
                        <td style="padding-bottom:10px;">A relevant team member will connect with you shortly.</td>
                      </tr>
                      <tr>
                        <td width="22" valign="top" style="color:#8b5cf6; font-weight:bold;">✉️</td>
                        <td style="">You will receive updates on your email.</td>
                      </tr>
                    </table>
                  </td>

                  <td width="2%" style="font-size:1px;">&nbsp;</td>

                  <!-- Right: Need Immediate Assistance -->
                  <td class="col-split" width="49%" valign="top" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:18px;">
                    <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:6px;">Need Immediate Assistance?</div>
                    <div style="font-size:11px; color:#64748b; margin-bottom:10px;">You can reach us anytime at:</div>
                    <div style="font-size:11px; font-family:monospace; line-height:1.7; color:#0f172a;">
                      &bull; <a href="mailto:info@zenemoo.in" style="color:#0284c7; text-decoration:none;">info@zenemoo.in</a><br>
                      &bull; <a href="mailto:prem@zenemoo.in" style="color:#0284c7; text-decoration:none;">prem@zenemoo.in</a><br>
                      &bull; <a href="mailto:hemanta@zenemoo.in" style="color:#0284c7; text-decoration:none;">hemanta@zenemoo.in</a><br>
                      &bull; Website: <a href="https://www.zenemoo.in" target="_blank" style="color:#0284c7; text-decoration:none; font-weight:bold;">www.zenemoo.in</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 6. FOOTER BRAND BANNER -->
          <tr>
            <td style="background-color:#f1f5f9; padding: 25px 35px; text-align: center; border-top: 1px solid #e2e8f0;">
              <div style="font-size:14px; font-weight:700; color:#0f172a; margin-bottom:4px;">
                Thank you for choosing <span style="color:#0284c7;">Zenemoo</span>.
              </div>
              <div style="font-size:13px; color:#64748b; font-weight:600; margin-bottom:16px;">
                Let's build the future of <span style="color:#8b5cf6;">AI together</span>.
              </div>

              <!-- Social Links -->
              <div style="margin-bottom:16px;">
                <a href="https://www.facebook.com/zenemoo" target="_blank" style="display:inline-block; margin:0 5px; text-decoration:none;">
                  <img src="https://img.icons8.com/color/36/000000/facebook-new.png" width="24" height="24" alt="Facebook" style="width:24px; height:24px; vertical-align:middle;">
                </a>
                <a href="https://www.linkedin.com/company/zenemoo" target="_blank" style="display:inline-block; margin:0 5px; text-decoration:none;">
                  <img src="https://img.icons8.com/color/36/000000/linkedin.png" width="24" height="24" alt="LinkedIn" style="width:24px; height:24px; vertical-align:middle;">
                </a>
                <a href="https://x.com/zenemoo" target="_blank" style="display:inline-block; margin:0 5px; text-decoration:none;">
                  <img src="https://img.icons8.com/color/36/000000/twitter--v1.png" width="24" height="24" alt="Twitter" style="width:24px; height:24px; vertical-align:middle;">
                </a>
                <a href="https://youtube.com/@zenemoo" target="_blank" style="display:inline-block; margin:0 5px; text-decoration:none;">
                  <img src="https://img.icons8.com/color/36/000000/youtube-play.png" width="24" height="24" alt="YouTube" style="width:24px; height:24px; vertical-align:middle;">
                </a>
              </div>

              <div style="font-size:11px; font-family:monospace; color:#94a3b8; line-height:1.4;">
                This is an automated confirmation email. Please do not reply directly to this email.<br>
                &copy; 2026 Zenemoo. All rights reserved.
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
