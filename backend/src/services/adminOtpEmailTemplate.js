/**
 * Zenemoo Administrator Password Reset OTP Email Template
 * Precision-engineered responsive HTML email matching Zenemoo Security visual design specifications.
 * Email-client compatible: Gmail (desktop/mobile), Outlook, Apple Mail, Yahoo.
 */

export const ZENEMOO_LOGO_URL = 'https://www.zenemoo.in/assets/logo.png';
export const ZENEMOO_LOGO_FALLBACK_URL = 'https://raw.githubusercontent.com/zenemoo/zenemootech/main/frontend/public/assets/logo-email.png';

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
 * Generate Administrator Password Reset OTP Responsive HTML Email
 * @param {Object} params
 * @param {string} params.email - Normalized administrator email
 * @param {string} params.otp - 6-digit dynamic OTP
 * @param {string} params.clientIp - Optional client IP for audit trail
 * @returns {string} - Clean, robust email-safe HTML string
 */
export const generateAdminOtpEmailHtml = ({ email = '', otp = '', clientIp = '' }) => {
  const safeEmail = escapeHtml(email);
  const safeOtp = escapeHtml(otp);
  const safeIp = escapeHtml(clientIp || 'Authorized Session');
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Zenemoo Administrator Password Reset OTP</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset & Email client base styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #060b17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    /* Responsive styles */
    @media screen and (max-width: 640px) {
      .email-wrapper { padding: 12px 6px !important; }
      .main-card { width: 100% !important; max-width: 100% !important; border-radius: 16px !important; }
      .card-content { padding: 24px 18px !important; }
      .otp-code { font-size: 32px !important; letter-spacing: 8px !important; }
      .header-table td { display: block !important; width: 100% !important; text-align: center !important; }
      .header-tagline { text-align: center !important; margin-top: 10px !important; }
      .info-pills td { display: block !important; width: 100% !important; text-align: center !important; padding: 6px 0 !important; }
      .pill-divider { display: none !important; }
      .signature-table td { display: block !important; width: 100% !important; text-align: center !important; }
      .social-cell { text-align: center !important; margin-top: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #060b17; background-image: radial-gradient(circle at 50% 10%, #0f1d38 0%, #060b17 80%); -webkit-font-smoothing: antialiased;">
  <!-- Outer Email Background -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-wrapper" style="background-color: #060b17; padding: 36px 14px;">
    <tr>
      <td align="center" valign="top">
        
        <!-- Main Card Container (Max 640px, Crisp White, Rounded) -->
        <!--[if (gte mso 9)|(IE)]>
        <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="640">
        <tr>
        <td align="center" valign="top">
        <![endif]-->
        <table role="presentation" class="main-card" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 640px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35); border: 1px solid #e2e8f0; margin: 0 auto;">
          
          <!-- Inner Card Padding -->
          <tr>
            <td class="card-content" style="padding: 36px 36px 28px 36px;">
              
              <!-- 1. Top Brand Header: Logo (Left) & Tagline (Right) -->
              <table role="presentation" class="header-table" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="middle" style="padding-right: 10px;">
                          <a href="https://www.zenemoo.in/" target="_blank" style="text-decoration: none;">
                            <img src="${ZENEMOO_LOGO_URL}" srcset="${ZENEMOO_LOGO_FALLBACK_URL} 1x, ${ZENEMOO_LOGO_URL} 2x" alt="Zenemoo" width="38" height="38" style="width: 38px; height: 38px; border-radius: 10px; display: block;" />
                          </a>
                        </td>
                        <td valign="middle">
                          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 800; letter-spacing: 1.5px; color: #0f172a; line-height: 1;">
                            ZENEMOO
                          </div>
                          <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 8px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-top: 3px;">
                            CONNECT &bull; OPPORTUNITY &bull; GROWTH
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle" class="header-tagline">
                    <div style="font-size: 11px; font-weight: 600; color: #475569; line-height: 1.3;">
                      From Talent to<br>Global Opportunities
                    </div>
                    <div style="height: 2px; width: 44px; background: linear-gradient(90deg, #0284c7, #8b5cf6); border-radius: 2px; margin-top: 4px; display: inline-block;"></div>
                  </td>
                </tr>
              </table>

              <!-- 2. Security Shield Badge & Title Header -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: center; margin: 12px 0 20px 0;">
                <tr>
                  <td align="center">
                    <!-- Security Shield Icon -->
                    <div style="width: 54px; height: 54px; margin: 0 auto 16px auto; border-radius: 50%; background: linear-gradient(135deg, #e0f2fe 0%, #ede9fe 100%); border: 1px solid #bae6fd; text-align: center; line-height: 54px;">
                      <span style="font-size: 26px; vertical-align: middle;">🛡️</span>
                    </div>
                    
                    <h1 style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; line-height: 1.3;">
                      Administrator Password Reset OTP
                    </h1>
                    
                    <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                      A password reset request has been initiated for your administrator account<br>
                      (<strong style="color: #0284c7; font-weight: 700;">${safeEmail}</strong>).
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                      Use the OTP below to reset your password.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- 3. Large Premium OTP Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%); border: 2px dashed #93c5fd; border-radius: 16px; padding: 26px 18px;">
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #2563eb; margin-bottom: 10px;">
                      YOUR PASSWORD RESET OTP IS
                    </div>
                    
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center">
                      <tr>
                        <td align="center" valign="middle">
                          <div class="otp-code" style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 44px; font-weight: 800; letter-spacing: 12px; color: #1d4ed8; line-height: 1.1; margin-left: 12px;">
                            ${safeOtp}
                          </div>
                        </td>
                        <td valign="middle" style="padding-left: 12px;">
                          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(37, 99, 235, 0.1); border: 1px solid rgba(37, 99, 235, 0.2); text-align: center; line-height: 32px; font-size: 15px;" title="Verification OTP">
                            🔐
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 4. Expiration & One-time Use Information Blocks -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="info-pills" style="margin: 14px 0 22px 0;">
                <tr>
                  <td align="center" valign="middle" width="48%" style="padding: 8px 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center">
                      <tr>
                        <td valign="middle" style="font-size: 18px; padding-right: 8px;">⏱</td>
                        <td valign="middle" align="left" style="font-size: 12px; color: #334155; line-height: 1.3;">
                          <span style="color: #64748b; font-size: 11px;">Expires in</span><br>
                          <strong style="color: #0f172a; font-weight: 700;">5 minutes</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <td width="4%" class="pill-divider"></td>
                  
                  <td align="center" valign="middle" width="48%" style="padding: 8px 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center">
                      <tr>
                        <td valign="middle" style="font-size: 18px; padding-right: 8px;">🔒</td>
                        <td valign="middle" align="left" style="font-size: 12px; color: #334155; line-height: 1.3;">
                          <strong style="color: #0f172a; font-weight: 700;">One-time use only</strong><br>
                          <span style="color: #64748b; font-size: 11px;">This OTP can only be used once</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 5. Security Warning Box (Soft Red/Pink) -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 14px; margin: 20px 0;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="30" valign="top" style="font-size: 20px; padding-right: 10px; line-height: 1;">
                          🚨
                        </td>
                        <td valign="top">
                          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                            Security Warning
                          </div>
                          <ul style="margin: 0; padding: 0 0 0 16px; font-size: 12px; color: #7f1d1d; line-height: 1.6;">
                            <li style="margin-bottom: 3px;"><strong>Do NOT share this OTP</strong> with anyone under any circumstances.</li>
                            <li style="margin-bottom: 3px;">Zenemoo staff will <strong>never ask</strong> for your verification code or password.</li>
                            <li>If you did not initiate this request, please secure your administrator account immediately by changing your password.</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 6. Support Section -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 18px 0 24px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="middle" style="font-size: 20px; padding-right: 12px;">🎧</td>
                        <td valign="middle" style="font-size: 12px; color: #475569; line-height: 1.5;">
                          <strong style="color: #0f172a;">Need help?</strong> If you're facing any issues, please contact the Zenemoo support team at <a href="mailto:support@zenemoo.in" style="color: #0284c7; font-weight: 700; text-decoration: underline;">support@zenemoo.in</a>.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="height: 1px; background-color: #e2e8f0; margin: 24px 0 20px 0;"></div>

              <!-- 7. Signature & Official Social Media Links (Website Matching) -->
              <table role="presentation" class="signature-table" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Left: Signature -->
                  <td align="left" valign="top">
                    <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
                      Best regards,<br>
                      <strong style="font-size: 14px; color: #0f172a; font-weight: 700;">The Zenemoo Team</strong><br>
                      <span style="font-size: 11px; color: #64748b;">Zenemoo Technologies Private Limited</span>
                    </div>
                  </td>

                  <!-- Right: Real Website Social Links -->
                  <td align="right" valign="top" class="social-cell">
                    <div style="margin-bottom: 6px;">
                      <!-- LinkedIn -->
                      <a href="https://www.linkedin.com/company/zenemoo/" target="_blank" style="display: inline-block; margin-left: 8px; text-decoration: none;" title="Zenemoo on LinkedIn">
                        <img src="https://img.icons8.com/color/36/000000/linkedin.png" width="22" height="22" alt="LinkedIn" style="width: 22px; height: 22px; vertical-align: middle; display: inline-block;" />
                      </a>
                      <!-- Instagram -->
                      <a href="https://www.instagram.com/zenemooofficial" target="_blank" style="display: inline-block; margin-left: 8px; text-decoration: none;" title="Zenemoo on Instagram">
                        <img src="https://img.icons8.com/color/36/000000/instagram-new.png" width="22" height="22" alt="Instagram" style="width: 22px; height: 22px; vertical-align: middle; display: inline-block;" />
                      </a>
                      <!-- YouTube -->
                      <a href="https://www.youtube.com/channel/UCj8ryPiPOeM_HrWqkNsFkTg" target="_blank" style="display: inline-block; margin-left: 8px; text-decoration: none;" title="Zenemoo on YouTube">
                        <img src="https://img.icons8.com/color/36/000000/youtube-play.png" width="22" height="22" alt="YouTube" style="width: 22px; height: 22px; vertical-align: middle; display: inline-block;" />
                      </a>
                      <!-- Website -->
                      <a href="https://www.zenemoo.in/" target="_blank" style="display: inline-block; margin-left: 8px; text-decoration: none;" title="Zenemoo Official Website">
                        <img src="https://img.icons8.com/color/36/000000/domain.png" width="22" height="22" alt="Zenemoo Website" style="width: 22px; height: 22px; vertical-align: middle; display: inline-block;" />
                      </a>
                    </div>
                    <div style="font-size: 10px; color: #64748b; font-weight: 600;">
                      From Talent to Global Opportunities
                    </div>
                    <div style="height: 2px; width: 44px; background: linear-gradient(90deg, #0284c7, #8b5cf6); border-radius: 2px; margin-top: 3px; display: inline-block;"></div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- 8. Clean Card Footer (Subtle Bottom Section) -->
          <tr>
            <td style="padding: 16px 36px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 11px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; color: #64748b; line-height: 1.5;">
                &copy; ${currentYear} <strong>Zenemoo</strong> &bull; Automated Security Notification
              </div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
                Support: <a href="mailto:support@zenemoo.in" style="color: #0284c7; text-decoration: underline;">support@zenemoo.in</a> &bull; <a href="https://www.zenemoo.in/" target="_blank" style="color: #0284c7; text-decoration: none;">www.zenemoo.in</a> &bull; Requested from IP: ${safeIp}
              </div>
            </td>
          </tr>

        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->

      </td>
    </tr>
  </table>
</body>
</html>`;
};
