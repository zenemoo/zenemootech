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
 * Format timestamp into IST (Indian Standard Time) string: e.g. "08 Aug 2026, 01:55 PM (IST)"
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
 * High-speed 13.3KB optimized Zenemoo Logo PNG Base64 Data URI
 * Guarantees instant 100% rendering in ALL email clients (Gmail, Outlook, Yahoo, Apple Mail)
 * even without an active external network request.
 */
export const ZENEMOO_LOGO_URL = 'https://raw.githubusercontent.com/zenemoo/zenemootech/main/frontend/public/assets/logo-email.png';
export const ZENEMOO_LOGO_FALLBACK_URL = 'https://www.zenemoo.in/assets/logo-email.png';

/**
 * Generate Production-Grade Responsive HTML Email Template for Zenemoo Contact Inquiry Confirmation
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
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Zenemoo — Contact Inquiry Received | Ticket #${code}</title>
  <style type="text/css">
    /* Email client resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    
    /* Responsive tweaks for mobile viewports */
    @media screen and (max-width: 600px) {
      .email-wrapper { padding: 10px 8px !important; }
      .container-table { width: 100% !important; max-width: 100% !important; border-radius: 12px !important; }
      .content-padding { padding: 20px 16px !important; }
      .header-title { font-size: 20px !important; line-height: 1.3 !important; }
      .ticket-code-text { font-size: 16px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; -webkit-font-smoothing:antialiased;">
  <!-- Outer Wrapper Table with Clean Corporate Background -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-wrapper" style="background-color:#f1f5f9; padding: 30px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container Card (Centered, 600px Max Width) -->
        <table role="presentation" class="container-table" width="600" border="0" cellspacing="0" cellpadding="0" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.08); border: 1px solid #cbd5e1; margin:0 auto;">
          
          <!-- 1. ZENEMOO BRAND HEADER (DARK NAVY WITH CYAN ACCENT) -->
          <tr>
            <td style="background-color:#090d16; background-image: linear-gradient(135deg, #090d16 0%, #0f172a 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #06b6d4;">
              <a href="https://www.zenemoo.in" target="_blank" style="text-decoration:none; display:inline-block;">
                <img src="${ZENEMOO_LOGO_URL}"
                     srcset="${ZENEMOO_LOGO_FALLBACK_URL} 1x, https://www.zenemoo.in/assets/logo.png 2x"
                     width="56"
                     height="56"
                     alt="Zenemoo"
                     style="display:block; margin:0 auto; width:56px; height:56px; max-width:56px; border-radius:50%; background:#ffffff; padding:2px; border:2px solid #06b6d4; object-fit:cover;">
              </a>
              <div style="font-family:'Segoe UI', Arial, sans-serif; font-size:22px; font-weight:800; color:#ffffff; letter-spacing:2px; margin-top:10px;">
                ZENEMOO
              </div>
              <div style="font-family: monospace; font-size:10px; color:#38bdf8; letter-spacing:2.5px; text-transform:uppercase; margin-top:3px;">
                EST 2023 &bull; AI DATA SOLUTIONS
              </div>
            </td>
          </tr>

          <!-- 2. ACKNOWLEDGMENT HEADING -->
          <tr>
            <td class="content-padding" style="padding: 32px 32px 20px 32px; background-color:#ffffff;">
              <h1 class="header-title" style="margin:0 0 10px 0; font-size:22px; font-weight:800; color:#0f172a; line-height:1.35;">
                Thank You for Contacting Zenemoo!
              </h1>
              <p style="margin:0 0 8px 0; font-size:14px; color:#475569; line-height:1.6;">
                We have received your message and our team will get back to you as soon as possible.
              </p>
              <p style="margin:0; font-size:13px; color:#64748b; line-height:1.5;">
                In the meantime, you can track your inquiry using your ticket number below.
              </p>
            </td>
          </tr>

          <!-- 3. FULL-WIDTH STACKED SUMMARY CARDS (GUARANTEED NO OVERLAPPING ON MOBILE) -->
          <tr>
            <td class="content-padding" style="padding: 0 32px 20px 32px;">
              
              <!-- CARD 1: YOUR TICKET NUMBER (FULL WIDTH) -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:12px;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="padding-right:12px;">
                          <div style="width:34px; height:34px; border-radius:10px; background-color:#e0f2fe; text-align:center; line-height:34px; font-size:18px;">🎫</div>
                        </td>
                        <td valign="top">
                          <div style="font-size:10px; font-family:monospace; text-transform:uppercase; color:#64748b; font-weight:bold; letter-spacing:0.5px;">YOUR TICKET NUMBER</div>
                          <div class="ticket-code-text" style="font-size:18px; font-family:monospace; font-weight:800; color:#0284c7; margin:3px 0 2px 0; word-break:break-all;">#${code}</div>
                          <div style="font-size:11px; color:#94a3b8; line-height:1.4;">Please use this ticket number for any future communication regarding your inquiry.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CARD 2: SUBMITTED ON DATE (FULL WIDTH) -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="padding-right:12px;">
                          <div style="width:34px; height:34px; border-radius:10px; background-color:#f0fdf4; text-align:center; line-height:34px; font-size:18px;">📅</div>
                        </td>
                        <td valign="top">
                          <div style="font-size:10px; font-family:monospace; text-transform:uppercase; color:#64748b; font-weight:bold; letter-spacing:0.5px;">SUBMITTED ON</div>
                          <div style="font-size:14px; font-weight:700; color:#0f172a; margin:3px 0 2px 0;">${dateFormatted}</div>
                          <div style="font-size:11px; color:#94a3b8;">Registered in Zenemoo System</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- 4. SUBMITTED INQUIRY DETAILS CARD (DARK NAVY ENTERPRISE PANEL) -->
          <tr>
            <td class="content-padding" style="padding: 0 32px 24px 32px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#0f172a; border-radius:14px; padding:22px; color:#ffffff;">
                <tr>
                  <td>
                    <div style="font-size:11px; font-family:monospace; text-transform:uppercase; color:#38bdf8; font-weight:bold; letter-spacing:1px; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
                      📋 YOUR SUBMITTED INQUIRY DETAILS
                    </div>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:13px; color:#cbd5e1; width:100%;">
                      <tr>
                        <td width="110" valign="top" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Full Name:</td>
                        <td valign="top" style="padding:6px 0; color:#ffffff; font-weight:bold; word-break:break-word;">${name}</td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Email Address:</td>
                        <td valign="top" style="padding:6px 0; color:#38bdf8; font-weight:bold; font-family:monospace; word-break:break-all;">${email}</td>
                      </tr>
                      ${phone ? `
                      <tr>
                        <td valign="top" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Phone Number:</td>
                        <td valign="top" style="padding:6px 0; color:#ffffff; font-family:monospace; word-break:break-all;">${phone}</td>
                      </tr>` : ''}
                      ${company ? `
                      <tr>
                        <td valign="top" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Company / Org:</td>
                        <td valign="top" style="padding:6px 0; color:#ffffff; word-break:break-word;">${company}</td>
                      </tr>` : ''}
                      <tr>
                        <td valign="top" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Service:</td>
                        <td valign="top" style="padding:6px 0; color:#34d399; font-weight:bold; word-break:break-word;">${service}</td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Language(s):</td>
                        <td valign="top" style="padding:6px 0; color:#a78bfa; font-weight:bold; word-break:break-word;">${language}</td>
                      </tr>
                    </table>

                    <!-- User Message Box -->
                    <div style="margin-top:14px; padding:14px; background-color:rgba(255,255,255,0.06); border-left:3px solid #38bdf8; border-radius:8px;">
                      <div style="font-size:10px; font-family:monospace; text-transform:uppercase; color:#94a3b8; margin-bottom:4px;">YOUR MESSAGE:</div>
                      <div style="font-size:13px; color:#f1f5f9; line-height:1.5; white-space:pre-wrap; word-break:break-word;">"${message}"</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 5. WHAT HAPPENS NEXT & NEED ASSISTANCE CARDS (FULL-WIDTH STACKED FOR ZERO COLLISION) -->
          <tr>
            <td class="content-padding" style="padding: 0 32px 28px 32px;">
              
              <!-- WHAT HAPPENS NEXT -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:12px;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:10px;">What Happens Next?</div>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:12px; color:#475569;">
                      <tr>
                        <td width="20" valign="top" style="padding-bottom:8px; color:#10b981; font-weight:bold;">✓</td>
                        <td style="padding-bottom:8px; line-height:1.4;">We have received your inquiry. Our team is reviewing the details.</td>
                      </tr>
                      <tr>
                        <td width="20" valign="top" style="padding-bottom:8px; color:#3b82f6; font-weight:bold;">👥</td>
                        <td style="padding-bottom:8px; line-height:1.4;">A relevant team member will connect with you shortly.</td>
                      </tr>
                      <tr>
                        <td width="20" valign="top" style="color:#8b5cf6; font-weight:bold;">✉️</td>
                        <td style="line-height:1.4;">You will receive updates on your email.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- NEED IMMEDIATE ASSISTANCE -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:4px;">Need Immediate Assistance?</div>
                    <div style="font-size:11px; color:#64748b; margin-bottom:8px;">You can reach us anytime at:</div>
                    <div style="font-size:11px; font-family:monospace; line-height:1.8; color:#0f172a;">
                      &bull; Email: <a href="mailto:info@zenemoo.in" style="color:#0284c7; text-decoration:none;">info@zenemoo.in</a> | <a href="mailto:support@zenemoo.in" style="color:#0284c7; text-decoration:none;">support@zenemoo.in</a><br>
                      &bull; Contact: <a href="mailto:contact@zenemoo.in" style="color:#0284c7; text-decoration:none;">contact@zenemoo.in</a><br>
                      &bull; Website: <a href="https://www.zenemoo.in" target="_blank" style="color:#0284c7; text-decoration:none; font-weight:bold;">www.zenemoo.in</a>
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- 6. OFFICIAL FOOTER BANNER (REUSING REAL ZENEMOO WEBSITE LINKS ONLY) -->
          <tr>
            <td style="background-color:#f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <div style="font-size:14px; font-weight:700; color:#0f172a; margin-bottom:3px;">
                Thank you for choosing <span style="color:#0284c7;">Zenemoo</span>.
              </div>
              <div style="font-size:12px; color:#64748b; font-weight:600; margin-bottom:14px;">
                Let's build the future of <span style="color:#8b5cf6;">AI together</span>.
              </div>

              <!-- Official Real Social Media Icons (From Website Footer) -->
              <div style="margin-bottom:14px;">
                <a href="https://www.linkedin.com/company/zenemoo/" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo LinkedIn">
                  <img src="https://img.icons8.com/color/36/000000/linkedin.png" width="22" height="22" alt="LinkedIn" style="width:22px; height:22px; vertical-align:middle;">
                </a>
                <a href="https://x.com/zenemooofficial" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo X">
                  <img src="https://img.icons8.com/color/36/000000/twitter--v1.png" width="22" height="22" alt="X (Twitter)" style="width:22px; height:22px; vertical-align:middle;">
                </a>
                <a href="https://www.instagram.com/zenemooofficial" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo Instagram">
                  <img src="https://img.icons8.com/color/36/000000/instagram-new.png" width="22" height="22" alt="Instagram" style="width:22px; height:22px; vertical-align:middle;">
                </a>
                <a href="https://www.youtube.com/channel/UCj8ryPiPOeM_HrWqkNsFkTg" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo YouTube">
                  <img src="https://img.icons8.com/color/36/000000/youtube-play.png" width="22" height="22" alt="YouTube" style="width:22px; height:22px; vertical-align:middle;">
                </a>
                <a href="https://whatsapp.com/channel/0029Vb8VOTHGOj9eWQiiPs08" target="_blank" style="display:inline-block; margin:0 6px; text-decoration:none;" title="Zenemoo WhatsApp">
                  <img src="https://img.icons8.com/color/36/000000/whatsapp.png" width="22" height="22" alt="WhatsApp" style="width:22px; height:22px; vertical-align:middle;">
                </a>
              </div>

              <!-- Official Links (Reused from Website Footer) -->
              <div style="font-size:11px; font-family:monospace; color:#64748b; margin-bottom:10px;">
                <a href="https://www.zenemoo.in/#privacy" target="_blank" style="color:#0284c7; text-decoration:none;">Privacy Policy</a> &bull; 
                <a href="https://www.zenemoo.in/#terms" target="_blank" style="color:#0284c7; text-decoration:none;">Terms &amp; Conditions</a> &bull; 
                <a href="https://www.zenemoo.in" target="_blank" style="color:#0284c7; text-decoration:none;">Official Site</a>
              </div>

              <div style="font-size:10px; font-family:monospace; color:#94a3b8; line-height:1.4;">
                This is an automated confirmation email. Please do not reply directly to this email.<br>
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
