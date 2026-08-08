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
 * Format timestamp into IST (Indian Standard Time) string: e.g. "10 Aug 2026, 11:20 AM (IST)"
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

export const ZENEMOO_LOGO_URL = 'https://raw.githubusercontent.com/zenemoo/zenemootech/main/frontend/public/assets/logo-email.png';
export const ZENEMOO_LOGO_FALLBACK_URL = 'https://www.zenemoo.in/assets/logo-email.png';

/**
 * Generate Responsive HTML Email Template for Zenemoo Application Acceptance
 * Matching exact design in mockup media__1786164516651.png
 */
export const generateApplicationAcceptanceHtml = (appData = {}) => {
  const applicantId = escapeHtml(appData.applicant_id || 'APP-2026-ACCEPTED');
  const name = escapeHtml(appData.applicant_name || 'Applicant');
  const email = escapeHtml(appData.applicant_email || '');
  const phone = escapeHtml(appData.applicant_phone || '');
  const opportunityTitle = escapeHtml(appData.opportunity_title || 'Program Opportunity');
  const companyName = escapeHtml(appData.company_name || appData.partner_name || 'DesiCrew');
  const acceptedDateFormatted = formatIstDateTime(appData.acceptance_email_sent_at || appData.updated_at || new Date().toISOString());

  const answersObj = appData.answers || {};

  // Extract custom answers if present
  const knownKeys = ['applicant_name', 'applicant_email', 'applicant_phone', 'opportunity_title', 'languages', 'language', 'company', 'company_name'];
  const customEntries = Object.entries(answersObj)
    .filter(([key, value]) => !knownKeys.includes(key.toLowerCase()) && value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => {
      let label = key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
      return { label: escapeHtml(label), value: escapeHtml(String(value)) };
    });

  const languageSkills = appData.languages || answersObj.languages || answersObj.language || '';
  const experience = answersObj.experience || answersObj.years_of_experience || '';
  const availability = answersObj.availability || answersObj.daily_hours || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Congratulations! Your Application Has Been Accepted — ${opportunityTitle} | ${applicantId}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    
    @media screen and (max-width: 620px) {
      .email-wrapper { padding: 10px 8px !important; }
      .container-table { width: 100% !important; max-width: 100% !important; border-radius: 12px !important; }
      .content-padding { padding: 20px 16px !important; }
      .header-title { font-size: 20px !important; line-height: 1.3 !important; }
      .app-id-text { font-size: 16px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; -webkit-font-smoothing:antialiased;">
  <!-- Outer Wrapper Table -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-wrapper" style="background-color:#f1f5f9; padding: 30px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container Card (Centered 640px Max Width) -->
        <table role="presentation" class="container-table" width="640" border="0" cellspacing="0" cellpadding="0" style="width:640px; max-width:640px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.08); border: 1px solid #cbd5e1; margin:0 auto;">
          
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
                AI DATA SOLUTIONS
              </div>
            </td>
          </tr>

          <!-- 2. CONGRATULATIONS HEADING WITH GREEN HIGHLIGHT -->
          <tr>
            <td class="content-padding" style="padding: 35px 35px 20px 35px; background-color:#ffffff;">
              <h1 class="header-title" style="margin:0 0 12px 0; font-size:24px; font-weight:800; color:#0f172a; line-height:1.35;">
                Congratulations! Your Application is <span style="color:#10b981;">Accepted.</span>
              </h1>
              <p style="margin:0 0 10px 0; font-size:15px; font-weight:700; color:#0284c7;">
                Hi ${name},
              </p>
              <p style="margin:0 0 10px 0; font-size:14px; color:#475569; line-height:1.6;">
                We are pleased to inform you that your application for the opportunity <strong style="color:#0f172a;">"${opportunityTitle}"</strong> has been accepted.
              </p>
              <p style="margin:0; font-size:13.5px; color:#475569; line-height:1.6;">
                Welcome to the Zenemoo community! Our team will reach out with further details and next steps.
              </p>
            </td>
          </tr>

          <!-- 3. FULL-WIDTH STACKED ACCEPTANCE CARDS (GUARANTEED NO COLLISION) -->
          <tr>
            <td class="content-padding" style="padding: 0 35px 20px 35px;">
              
              <!-- CARD 1: APPLICATION ID -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:12px;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="padding-right:12px;">
                          <div style="width:34px; height:34px; border-radius:10px; background-color:#f3e8ff; text-align:center; line-height:34px; font-size:18px;">🪪</div>
                        </td>
                        <td valign="top">
                          <div style="font-size:10px; font-family:monospace; text-transform:uppercase; color:#64748b; font-weight:bold; letter-spacing:0.5px;">APPLICATION ID</div>
                          <div class="app-id-text" style="font-size:18px; font-family:monospace; font-weight:800; color:#7e22ce; margin:3px 0 2px 0; word-break:break-all;">${applicantId}</div>
                          <div style="font-size:11px; color:#94a3b8; line-height:1.4;">Please keep this ID for future communication and reference.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CARD 2: ACCEPTED ON DATE -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; margin-bottom:12px;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="padding-right:12px;">
                          <div style="width:34px; height:34px; border-radius:10px; background-color:#dcfce7; text-align:center; line-height:34px; font-size:18px;">📅</div>
                        </td>
                        <td valign="top">
                          <div style="font-size:10px; font-family:monospace; text-transform:uppercase; color:#15803d; font-weight:bold; letter-spacing:0.5px;">ACCEPTED ON</div>
                          <div style="font-size:14px; font-weight:800; color:#166534; margin:3px 0 2px 0;">${acceptedDateFormatted}</div>
                          <div style="font-size:11px; color:#15803d;">Registered in Zenemoo System</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CARD 3: OPPORTUNITY & PARTNER -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="padding-right:12px;">
                          <div style="width:34px; height:34px; border-radius:10px; background-color:#e0f2fe; text-align:center; line-height:34px; font-size:18px;">💼</div>
                        </td>
                        <td valign="top">
                          <div style="font-size:10px; font-family:monospace; text-transform:uppercase; color:#64748b; font-weight:bold; letter-spacing:0.5px;">OPPORTUNITY</div>
                          <div style="font-size:14px; font-weight:700; color:#0f172a; margin:3px 0 2px 0;">${opportunityTitle}</div>
                          <div style="font-size:11px; color:#0284c7; font-weight:600;">${companyName}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- 4. ACCEPTED STATUS PROMINENT GREEN CARD -->
          <tr>
            <td class="content-padding" style="padding: 0 35px 24px 35px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:14px; padding:18px;">
                <tr>
                  <td>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="32" valign="top" style="padding-right:10px;">
                          <div style="font-size:22px; line-height:1;">✅</div>
                        </td>
                        <td valign="top">
                          <div style="font-size:12px; font-family:monospace; font-weight:bold; color:#15803d; text-transform:uppercase; letter-spacing:0.5px;">
                            APPLICATION STATUS &nbsp;<span style="background-color:#dcfce7; color:#166534; padding:3px 10px; border-radius:12px; font-size:11px; border:1px solid #86efac;">✓ ACCEPTED</span>
                          </div>
                          <div style="font-size:13px; color:#166534; margin-top:5px; line-height:1.5; font-weight:500;">
                            Your application has been reviewed and accepted by the Zenemoo team.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 5. APPLICATION DETAILS PANEL -->
          <tr>
            <td class="content-padding" style="padding: 0 35px 24px 35px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#0f172a; border-radius:14px; padding:22px; color:#ffffff;">
                <tr>
                  <td>
                    <div style="font-size:11px; font-family:monospace; text-transform:uppercase; color:#38bdf8; font-weight:bold; letter-spacing:1px; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
                      📄 ACCEPTED CANDIDATE SUMMARY
                    </div>
                    
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:13px; color:#cbd5e1; width:100%;">
                      <tr>
                        <td width="130" valign="top" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Applicant Name:</td>
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
                      <tr>
                        <td valign="top" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Opportunity:</td>
                        <td valign="top" style="padding:6px 0; color:#34d399; font-weight:bold; word-break:break-word;">${opportunityTitle}</td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Organization:</td>
                        <td valign="top" style="padding:6px 0; color:#ffffff; word-break:break-word;">${companyName}</td>
                      </tr>
                      ${languageSkills ? `
                      <tr>
                        <td valign="top" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Language(s):</td>
                        <td valign="top" style="padding:6px 0; color:#a78bfa; font-weight:bold; word-break:break-word;">${escapeHtml(String(languageSkills))}</td>
                      </tr>` : ''}
                      ${experience ? `
                      <tr>
                        <td valign="top" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Experience:</td>
                        <td valign="top" style="padding:6px 0; color:#ffffff; word-break:break-word;">${escapeHtml(String(experience))}</td>
                      </tr>` : ''}
                      ${availability ? `
                      <tr>
                        <td valign="top" style="padding:6px 0; color:#94a3b8; font-weight:bold;">Availability:</td>
                        <td valign="top" style="padding:6px 0; color:#ffffff; word-break:break-word;">${escapeHtml(String(availability))}</td>
                      </tr>` : ''}
                    </table>

                    ${customEntries.length > 0 ? `
                    <div style="margin-top:16px; border-top:1px solid rgba(255,255,255,0.1); pt-12px; padding-top:12px;">
                      <div style="font-size:10px; font-family:monospace; text-transform:uppercase; color:#38bdf8; font-weight:bold; margin-bottom:8px;">FORM RESPONSES:</div>
                      ${customEntries.map(item => `
                        <div style="margin-bottom:10px; padding:10px; background-color:rgba(255,255,255,0.04); border-left:2px solid #38bdf8; border-radius:6px;">
                          <div style="font-size:11px; color:#94a3b8; font-weight:bold; margin-bottom:2px;">${item.label}</div>
                          <div style="font-size:12px; color:#f1f5f9; line-height:1.4; word-break:break-word;">${item.value}</div>
                        </div>
                      `).join('')}
                    </div>` : ''}

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 6. WHAT HAPPENS NEXT CARD -->
          <tr>
            <td class="content-padding" style="padding: 0 35px 24px 35px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:18px;">
                <tr>
                  <td>
                    <div style="font-size:14px; font-weight:800; color:#166534; margin-bottom:12px; border-bottom:1px solid #bbf7d0; padding-bottom:6px;">
                      ✓ WHAT HAPPENS NEXT?
                    </div>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:12.5px; color:#15803d;">
                      <tr>
                        <td width="22" valign="top" style="padding-bottom:10px; color:#16a34a; font-weight:bold;">✓</td>
                        <td style="padding-bottom:10px; line-height:1.4;">Our team will contact you shortly with further details.</td>
                      </tr>
                      <tr>
                        <td width="22" valign="top" style="padding-bottom:10px; color:#16a34a; font-weight:bold;">✓</td>
                        <td style="padding-bottom:10px; line-height:1.4;">You may receive an onboarding email with tasks, guidelines, and timelines.</td>
                      </tr>
                      <tr>
                        <td width="22" valign="top" style="padding-bottom:10px; color:#16a34a; font-weight:bold;">✓</td>
                        <td style="padding-bottom:10px; line-height:1.4;">Please check your inbox (and spam folder) regularly.</td>
                      </tr>
                      <tr>
                        <td width="22" valign="top" style="color:#16a34a; font-weight:bold;">✓</td>
                        <td style="line-height:1.4;">If you have any questions, feel free to reach out to us.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 7. IMPORTANT & NEED HELP GRID -->
          <tr>
            <td class="content-padding" style="padding: 0 35px 28px 35px;">
              
              <!-- IMPORTANT SECURITY NOTICE -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:12px;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-size:12px; font-weight:800; color:#0f172a; margin-bottom:4px; font-family:monospace; text-transform:uppercase;">
                      ℹ️ IMPORTANT
                    </div>
                    <div style="font-size:11px; color:#64748b; line-height:1.5;">
                      Please do not share your Application ID or personal information with anyone. All official communication will be sent from Zenemoo channels only.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- NEED HELP -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-size:12px; font-weight:800; color:#0f172a; margin-bottom:4px; font-family:monospace; text-transform:uppercase;">
                      🎧 NEED HELP?
                    </div>
                    <div style="font-size:11px; color:#64748b; margin-bottom:8px;">We are here to help you:</div>
                    <div style="font-size:11px; font-family:monospace; line-height:1.8; color:#0f172a;">
                      &bull; Support: <a href="mailto:support@zenemoo.in" style="color:#0284c7; text-decoration:none;">support@zenemoo.in</a><br>
                      &bull; Website: <a href="https://www.zenemoo.in" target="_blank" style="color:#0284c7; text-decoration:none; font-weight:bold;">www.zenemoo.in</a>
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- 8. OFFICIAL FOOTER BANNER -->
          <tr>
            <td style="background-color:#f8fafc; padding: 24px 35px; text-align: center; border-top: 1px solid #e2e8f0;">
              <div style="font-size:13px; font-weight:700; color:#0f172a; margin-bottom:3px;">
                Building the future with <span style="color:#0284c7;">AI and People</span>.
              </div>

              <!-- Official Real Social Media Icons -->
              <div style="margin:12px 0;">
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

              <!-- Links -->
              <div style="font-size:11px; font-family:monospace; color:#64748b; margin-bottom:10px;">
                <a href="https://www.zenemoo.in/#privacy" target="_blank" style="color:#0284c7; text-decoration:none;">Privacy Policy</a> &bull; 
                <a href="https://www.zenemoo.in/#terms" target="_blank" style="color:#0284c7; text-decoration:none;">Terms &amp; Conditions</a> &bull; 
                <a href="https://www.zenemoo.in" target="_blank" style="color:#0284c7; text-decoration:none;">Official Site</a>
              </div>

              <div style="font-size:10px; font-family:monospace; color:#94a3b8; line-height:1.4;">
                This is an automated email from Zenemoo regarding your accepted application.<br>
                Please do not reply directly to this email.<br>
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
