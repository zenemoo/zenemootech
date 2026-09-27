export interface EmailBlockItem {
  id: string;
  name: string;
  category: string;
  description: string;
  html: string;
}

export interface EmailTemplatePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  preheader: string;
  html: string;
}

export const ZENEMOO_FULL_TEMPLATES: EmailTemplatePreset[] = [
  {
    id: 'vendor_delivery_partner_intro',
    name: 'Vendor / Delivery Partner Introduction',
    category: 'Partnership',
    description: 'Respond to companies interested in partnering with Zenemoo.',
    subject: 'Vendor / Delivery Partnership Opportunity | Zenemoo',
    preheader: 'Exploring a potential Vendor / Delivery Partnership with Zenemoo',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vendor / Delivery Partnership Opportunity | Zenemoo</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <!-- Email Preheader (Hidden) -->
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    Exploring a potential Vendor / Delivery Partnership with Zenemoo
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #090d16 0%, #0f172a 100%); padding: 32px 28px; text-align: left; border-bottom: 2px solid #06b6d4;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="https://www.zenemoo.in/assets/logo.png" alt="Zenemoo" width="38" height="38" style="display: block; border-radius: 50%; border: 1px solid #06b6d4; background-color: #ffffff;" />
                        </td>
                        <td style="vertical-align: middle;">
                          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            ZENEMOO <span style="color: #06b6d4;">AI</span> SOLUTIONS
                          </h1>
                          <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            A Bright Tomorrow, Together.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Category Badge -->
          <tr>
            <td style="padding: 24px 28px 0 28px;">
              <span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #0284c7; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                🤝 PARTNERSHIP &bull; VENDOR INTRO
              </span>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 20px 28px 32px 28px; font-size: 14px; line-height: 1.6; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">
                Dear {{RECIPIENT_NAME}},
              </p>
              
              <p style="margin: 0 0 16px 0;">
                Thank you for reaching out to Zenemoo and for sharing <strong>{{COMPANY_NAME}}</strong>’s company details and capability profile. We appreciate your interest in working with Zenemoo.
              </p>
              
              <p style="margin: 0 0 20px 0;">
                Based on the capabilities you shared, we would be interested in exploring <strong>{{COMPANY_NAME}}</strong> as a Vendor / Delivery Partner for Zenemoo’s current and upcoming AI data projects.
              </p>

              <!-- Vendor Registration Section -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 8px; margin: 0 0 20px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 6px;">
                      Vendor Registration:
                    </div>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #334155; line-height: 1.5;">
                      For the initial onboarding, we request you to complete your Vendor Registration on our platform using the link below:
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #16a34a; border-radius: 6px;">
                          <a href="https://www.zenemoo.in/talent-registration" target="_blank" style="display: inline-block; padding: 9px 20px; font-size: 12px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 6px;">
                            Complete Vendor Registration &rarr;
                          </a>
                        </td>
                        <td style="padding-left: 12px;">
                          <a href="https://www.zenemoo.in/talent-registration" target="_blank" style="font-size: 12px; color: #0284c7; text-decoration: underline; word-break: break-all;">
                            https://www.zenemoo.in/talent-registration
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px 0;">
                While completing the registration, please select &ldquo;Vendor / Agency&rdquo; and provide your company details, service capabilities, workforce capacity, and other relevant information.
              </p>

              <!-- Talent Hub Section -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0284c7; border-radius: 8px; margin: 0 0 20px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 13px; font-weight: 700; color: #075985; margin-bottom: 6px;">
                      Talent Hub:
                    </div>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #334155; line-height: 1.5;">
                      Once registered, you can access and manage your profile through our Talent Hub:
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #0284c7; border-radius: 6px;">
                          <a href="https://www.zenemoo.in/talent-hub" target="_blank" style="display: inline-block; padding: 9px 20px; font-size: 12px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 6px;">
                            Access Talent Hub &rarr;
                          </a>
                        </td>
                        <td style="padding-left: 12px;">
                          <a href="https://www.zenemoo.in/talent-hub" target="_blank" style="font-size: 12px; color: #0284c7; text-decoration: underline; word-break: break-all;">
                            https://www.zenemoo.in/talent-hub
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px 0;">
                After your registration is completed, our team will review your profile and connect with you regarding suitable current or upcoming opportunities and potential project collaboration.
              </p>

              <p style="margin: 0 0 16px 0;">
                We would also be happy to schedule a short discussion to understand <strong>{{COMPANY_NAME}}</strong>’s capabilities and explore how we can work together.
              </p>

              <!-- Meeting Section -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-left: 4px solid #9333ea; border-radius: 8px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 13px; font-weight: 700; color: #6b21a8; margin-bottom: 6px;">
                      Meeting:
                    </div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #9333ea; border-radius: 6px;">
                          <a href="https://www.zenemoo.in/30min" target="_blank" style="display: inline-block; padding: 9px 20px; font-size: 12px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 6px;">
                            Schedule a meeting with Zenemoo &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0;">
                Thank you for your interest in partnering with Zenemoo. We look forward to exploring a mutually beneficial collaboration.
              </p>

              <!-- Official Sign-off -->
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                <p style="color: #0891b2; font-size: 14px; font-weight: 700; margin: 0 0 3px 0;">
                  Prem Prasad Pradhan
                </p>
                <p style="color: #334155; font-size: 12px; font-weight: 500; margin: 0 0 2px 0;">
                  Founder &amp; CEO &bull; Leadership &amp; AI Platform
                </p>
                <p style="color: #64748b; font-size: 11px; margin: 0;">
                  Zenemoo AI Solutions | <a href="https://www.zenemoo.in" target="_blank" style="color: #0284c7; text-decoration: underline;">www.zenemoo.in</a> | <a href="mailto:prem@zenemoo.in" style="color: #0284c7; text-decoration: none;">prem@zenemoo.in</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Zenemoo AI Solutions
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Ganjam, Odisha, India
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <a href="https://www.zenemoo.in" target="_blank" style="color: #0284c7; text-decoration: underline;">www.zenemoo.in</a> &bull; <a href="mailto:contact@zenemoo.in" style="color: #0284c7; text-decoration: underline;">contact@zenemoo.in</a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                &copy; 2026 Zenemoo AI Solutions. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: 'introducing_zenemoo',
    name: 'Introducing Zenemoo AI Solutions',
    category: 'Company',
    description: 'Professional introductory email when introducing Zenemoo to a new organization, partner, or contact.',
    subject: 'Introducing Zenemoo AI Solutions | AI Data & Technology Opportunities',
    preheader: 'Introducing Zenemoo and our work in AI data and technology.',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Introducing Zenemoo AI Solutions | AI Data & Technology Opportunities</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <!-- Email Preheader (Hidden) -->
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    Introducing Zenemoo and our work in AI data and technology.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #090d16 0%, #0f172a 100%); padding: 32px 28px; text-align: left; border-bottom: 2px solid #06b6d4;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="https://www.zenemoo.in/assets/logo.png" alt="Zenemoo" width="38" height="38" style="display: block; border-radius: 50%; border: 1px solid #06b6d4; background-color: #ffffff;" />
                        </td>
                        <td style="vertical-align: middle;">
                          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            ZENEMOO <span style="color: #06b6d4;">AI</span> SOLUTIONS
                          </h1>
                          <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            A Bright Tomorrow, Together.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Category Badge -->
          <tr>
            <td style="padding: 24px 28px 0 28px;">
              <span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #0284c7; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                🏢 COMPANY INTRODUCTION
              </span>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 20px 28px 32px 28px; font-size: 14px; line-height: 1.6; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">
                Dear {{RECIPIENT_NAME}},
              </p>
              
              <p style="margin: 0 0 16px 0;">
                I hope you are doing well.
              </p>
              
              <p style="margin: 0 0 16px 0;">
                I am reaching out to introduce Zenemoo AI Solutions and briefly share what we are building and the opportunities we are working on.
              </p>

              <p style="margin: 0 0 16px 0;">
                Zenemoo AI Solutions is focused on connecting people, data, and AI opportunities while creating meaningful opportunities for talent and contributing to a stronger AI ecosystem.
              </p>

              <p style="margin: 0 0 20px 0;">
                Our approach is centered around building practical technology, connecting capable people and organizations, and creating opportunities through AI and data-driven work.
              </p>

              <!-- Collaboration Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0284c7; border-radius: 8px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 13px; font-weight: 700; color: #075985; margin-bottom: 6px;">
                      Opportunities &amp; Collaboration:
                    </div>
                    <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">
                      We would be happy to explore potential opportunities to work together, whether through talent, vendor capabilities, data projects, technology collaboration, or other relevant initiatives.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Links -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="padding-right: 12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #0284c7; border-radius: 6px;">
                          <a href="https://www.zenemoo.in" target="_blank" style="display: inline-block; padding: 10px 22px; font-size: 12px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 6px;">
                            Visit Zenemoo &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
                          <a href="https://www.zenemoo.in/talent-hub" target="_blank" style="display: inline-block; padding: 9px 18px; font-size: 12px; font-weight: 700; color: #0f172a; text-decoration: none; border-radius: 6px;">
                            Explore Talent Hub &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0;">
                If you would like to learn more about Zenemoo or explore a potential collaboration, we would be happy to connect.
              </p>

              <p style="margin: 0 0 24px 0;">
                Thank you for your time and interest.
              </p>

              <p style="margin: 0 0 16px 0; font-weight: 600; color: #0f172a;">
                Best regards,
              </p>

              <!-- Official Sign-off -->
              <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                <p style="color: #0891b2; font-size: 14px; font-weight: 700; margin: 0 0 3px 0;">
                  Prem Prasad Pradhan
                </p>
                <p style="color: #334155; font-size: 12px; font-weight: 500; margin: 0 0 2px 0;">
                  Founder &amp; CEO &bull; Leadership &amp; AI Platform
                </p>
                <p style="color: #64748b; font-size: 11px; margin: 0;">
                  Zenemoo AI Solutions &bull; Ganjam, Odisha, India | <a href="https://www.zenemoo.in" target="_blank" style="color: #0284c7; text-decoration: underline;">www.zenemoo.in</a> | <a href="mailto:prem@zenemoo.in" style="color: #0284c7; text-decoration: none;">prem@zenemoo.in</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Zenemoo AI Solutions
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Ganjam, Odisha, India
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <a href="https://www.zenemoo.in" target="_blank" style="color: #0284c7; text-decoration: underline;">www.zenemoo.in</a> &bull; <a href="mailto:contact@zenemoo.in" style="color: #0284c7; text-decoration: underline;">contact@zenemoo.in</a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                &copy; 2026 Zenemoo AI Solutions. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: 'interview_invitation',
    name: 'Interview Invitation & Assessment',
    category: 'HR',
    description: 'Official candidate interview invitation with scheduled format and timeline.',
    subject: 'Invitation for Interview — Zenemoo AI Solutions',
    preheader: 'Next steps for your interview discussion with Zenemoo AI Solutions.',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation for Interview — Zenemoo AI Solutions</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #090d16 0%, #0f172a 100%); padding: 32px 28px; text-align: left; border-bottom: 2px solid #06b6d4;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                ZENEMOO <span style="color: #06b6d4;">AI</span> SOLUTIONS
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Talent Operations &bull; Interview Schedule
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 28px 32px 28px; font-size: 14px; line-height: 1.6; color: #334155;">
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">
                Dear {{RECIPIENT_NAME}},
              </p>
              <p style="margin: 0 0 16px 0;">
                Thank you for your interest in collaborating with Zenemoo AI Solutions. We have reviewed your background and would like to invite you for a discussion.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #06b6d4; border-radius: 8px; margin: 0 0 20px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Discussion Highlights:</div>
                    <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #334155;">
                      <li>Role overview and technical scope review</li>
                      <li>Delivery milestones and workflow expectations</li>
                      <li>Q&amp;A regarding the AI data platform</li>
                    </ul>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 20px 0;">
                Please let us know your availability, or book a convenient slot directly using our meeting link.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td style="background-color: #0284c7; border-radius: 6px;">
                    <a href="https://www.zenemoo.in/30min" target="_blank" style="display: inline-block; padding: 10px 22px; font-size: 12px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 6px;">
                      Confirm Discussion Slot &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                <p style="color: #0891b2; font-size: 14px; font-weight: 700; margin: 0 0 3px 0;">Prem Prasad Pradhan</p>
                <p style="color: #64748b; font-size: 11px; margin: 0;">Zenemoo AI Solutions &bull; Ganjam, Odisha, India | www.zenemoo.in</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  }
];

export const ZENEMOO_EMAIL_BLOCKS: EmailBlockItem[] = [
  {
    id: 'partnership_intro',
    name: 'Vendor / Delivery Partner Introduction',
    category: 'Partnership',
    description: 'Respond to companies interested in partnering with Zenemoo.',
    html: `<!-- ZENEMOO PARTNER / VENDOR INTRODUCTION BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
  <tr>
    <td style="padding: 8px 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155; font-size: 14px; line-height: 1.6;">
      <p style="margin: 0 0 12px 0;">Dear {{RECIPIENT_NAME}},</p>
      <p style="margin: 0 0 12px 0;">
        Thank you for reaching out to Zenemoo and for sharing <strong>{{COMPANY_NAME}}</strong>’s company details and capability profile. We appreciate your interest in working with Zenemoo.
      </p>
      <p style="margin: 0 0 16px 0;">
        Based on the capabilities you shared, we would be interested in exploring <strong>{{COMPANY_NAME}}</strong> as a Vendor / Delivery Partner for Zenemoo’s current and upcoming AI data projects.
      </p>

      <p style="margin: 0 0 8px 0; font-weight: 700; color: #0f172a;">For the initial onboarding, we request you to complete your Vendor Registration on our platform using the link below:</p>
      
      <!-- Vendor Registration Box -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 8px; margin: 12px 0 16px 0;">
        <tr>
          <td style="padding: 12px 16px;">
            <div style="font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 4px;">Vendor Registration:</div>
            <a href="https://www.zenemoo.in/talent-registration" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline; font-size: 13px;">https://www.zenemoo.in/talent-registration</a>
          </td>
        </tr>
      </table>

      <p style="margin: 0 0 16px 0;">
        While completing the registration, please select &ldquo;Vendor / Agency&rdquo; and provide your company details, service capabilities, workforce capacity, and other relevant information.
      </p>

      <p style="margin: 0 0 8px 0; font-weight: 700; color: #0f172a;">Once registered, you can access and manage your profile through our Talent Hub:</p>
      
      <!-- Talent Hub Box -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0284c7; border-radius: 8px; margin: 12px 0 16px 0;">
        <tr>
          <td style="padding: 12px 16px;">
            <div style="font-size: 13px; font-weight: 700; color: #075985; margin-bottom: 4px;">Talent Hub:</div>
            <a href="https://www.zenemoo.in/talent-hub" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline; font-size: 13px;">https://www.zenemoo.in/talent-hub</a>
          </td>
        </tr>
      </table>

      <p style="margin: 0 0 16px 0;">
        After your registration is completed, our team will review your profile and connect with you regarding suitable current or upcoming opportunities and potential project collaboration.
      </p>

      <p style="margin: 0 0 16px 0;">
        We would also be happy to schedule a short discussion to understand <strong>{{COMPANY_NAME}}</strong>’s capabilities and explore how we can work together.
      </p>

      <!-- Meeting Link -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0 20px 0;">
        <tr>
          <td style="padding: 10px 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <span style="font-weight: 700; color: #0f172a; margin-right: 8px;">Meeting:</span>
            <a href="https://www.zenemoo.in/30min" target="_blank" style="color: #0284c7; font-weight: 700; text-decoration: underline;">Schedule a meeting with Zenemoo &rarr;</a>
          </td>
        </tr>
      </table>

      <p style="margin: 0;">
        Thank you for your interest in partnering with Zenemoo. We look forward to exploring a mutually beneficial collaboration.
      </p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'header',
    name: 'Zenemoo Header',
    category: 'Header',
    description: 'Branded header with Zenemoo logo, title, and tagline.',
    html: `<!-- ZENEMOO HEADER BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #090d16 0%, #0f172a 100%); border-radius: 12px; border-bottom: 2px solid #06b6d4; margin-bottom: 20px;">
  <tr>
    <td style="padding: 24px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="left" style="vertical-align: middle;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align: middle; padding-right: 12px;">
                  <img src="https://www.zenemoo.in/assets/logo.png" alt="Zenemoo" width="36" height="36" style="display: block; border-radius: 50%; border: 1px solid #06b6d4; background-color: #ffffff;" />
                </td>
                <td style="vertical-align: middle;">
                  <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ZENEMOO <span style="color: #06b6d4;">AI</span> SOLUTIONS
                  </h1>
                  <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    A Bright Tomorrow, Together.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'welcome',
    name: 'Welcome & Introduction',
    category: 'Content',
    description: 'Clean welcome heading and introductory paragraph.',
    html: `<!-- ZENEMOO WELCOME / INTRODUCTION BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
  <tr>
    <td style="padding: 8px 4px;">
      <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Welcome to Zenemoo AI Solutions
      </h2>
      <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear Team Member &amp; Valued Partner,
      </p>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        We are pleased to collaborate with you. At <strong>Zenemoo AI Solutions</strong>, we deliver standard-setting accuracy, secure data annotation pipelines, and cutting-edge artificial intelligence workflows designed for enterprise-scale performance.
      </p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'info_card',
    name: 'Information Card',
    category: 'Content',
    description: 'Highlighted callout card with key takeaways and bullet points.',
    html: `<!-- ZENEMOO INFORMATION CARD BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #06b6d4; border-radius: 8px; margin-bottom: 20px;">
  <tr>
    <td style="padding: 18px 20px;">
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        📌 Key Project Highlights &amp; Deliverables
      </div>
      <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.5; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Please review the following milestone telemetry and operational progress updates:
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <li style="margin-bottom: 4px;"><strong>Accuracy Compliance:</strong> 99.4% Verified Quality Score</li>
        <li style="margin-bottom: 4px;"><strong>Security Protocol:</strong> AES-256 Encrypted Delivery Pipeline</li>
        <li style="margin-bottom: 0;"><strong>Execution Status:</strong> 100% Operational &amp; Ahead of Schedule</li>
      </ul>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'cta_button',
    name: 'Call-To-Action Button',
    category: 'Buttons',
    description: 'Email-safe bulletproof CTA button with customizable link.',
    html: `<!-- ZENEMOO CALL-TO-ACTION BUTTON BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="border-radius: 8px; background-color: #059669;">
            <a href="https://www.zenemoo.in" target="_blank" style="display: inline-block; padding: 13px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
              Access Portal Dashboard &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'two_column',
    name: 'Two-Column Information',
    category: 'Layout',
    description: 'Responsive side-by-side informational columns.',
    html: `<!-- ZENEMOO TWO-COLUMN INFORMATION BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
  <tr>
    <td align="center" style="padding: 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <!-- Column 1 -->
          <td width="48%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; vertical-align: top;">
            <div style="font-size: 13px; font-weight: 700; color: #0284c7; margin-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              🚀 Module A: Audio Annotation
            </div>
            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              High precision multi-dialect transcription, phonetic alignment, and speaker diarization datasets.
            </p>
          </td>

          <!-- Spacer -->
          <td width="4%">&nbsp;</td>

          <!-- Column 2 -->
          <td width="48%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; vertical-align: top;">
            <div style="font-size: 13px; font-weight: 700; color: #059669; margin-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              🛡️ Module B: Data Verification
            </div>
            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              Triple-layer QA audits, anonymization filters, and enterprise security compliance verification.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'signature',
    name: 'Zenemoo Signature',
    category: 'Signature',
    description: 'Official corporate sender signature with name and title.',
    html: `<!-- ZENEMOO SIGNATURE BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
  <tr>
    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <p style="color: #0891b2; font-size: 14px; font-weight: 700; margin: 0 0 3px 0;">
        Prem Prasad Pradhan
      </p>
      <p style="color: #334155; font-size: 12px; font-weight: 500; margin: 0 0 2px 0;">
        Founder &amp; CEO &bull; Leadership &amp; AI Platform
      </p>
      <p style="color: #64748b; font-size: 11px; margin: 0;">
        Zenemoo AI Solutions &bull; Ganjam, Odisha, India | <a href="https://www.zenemoo.in" target="_blank" style="color: #0284c7; text-decoration: underline;">www.zenemoo.in</a> | <a href="mailto:prem@zenemoo.in" style="color: #0284c7; text-decoration: none;">prem@zenemoo.in</a>
      </p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'social_footer',
    name: 'Social Media Footer',
    category: 'Footer',
    description: 'Verified official Zenemoo social channels (LinkedIn, X, Instagram, YouTube, WhatsApp).',
    html: `<!-- ZENEMOO SOCIAL MEDIA FOOTER BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px; padding: 16px 0; text-align: center;">
  <tr>
    <td align="center" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">
        Connect With Zenemoo
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
        <tr>
          <td style="padding: 0 6px;">
            <a href="https://www.linkedin.com/company/zenemoo/" target="_blank" style="display: inline-block; padding: 6px 12px; font-size: 11px; font-weight: 600; color: #0a66c2; background-color: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 6px; text-decoration: none;">
              LinkedIn
            </a>
          </td>
          <td style="padding: 0 6px;">
            <a href="https://x.com/zenemooofficial" target="_blank" style="display: inline-block; padding: 6px 12px; font-size: 11px; font-weight: 600; color: #0f172a; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-decoration: none;">
              X (Twitter)
            </a>
          </td>
          <td style="padding: 0 6px;">
            <a href="https://www.instagram.com/zenemooofficial" target="_blank" style="display: inline-block; padding: 6px 12px; font-size: 11px; font-weight: 600; color: #e4405f; background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; text-decoration: none;">
              Instagram
            </a>
          </td>
          <td style="padding: 0 6px;">
            <a href="https://www.youtube.com/channel/UCj8ryPiPOeM_HrWqkNsFkTg" target="_blank" style="display: inline-block; padding: 6px 12px; font-size: 11px; font-weight: 600; color: #dc2626; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; text-decoration: none;">
              YouTube
            </a>
          </td>
          <td style="padding: 0 6px;">
            <a href="https://whatsapp.com/channel/0029Vb8VOTHGOj9eWQiiPs08" target="_blank" style="display: inline-block; padding: 6px 12px; font-size: 11px; font-weight: 600; color: #16a34a; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; text-decoration: none;">
              WhatsApp
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'complete_footer',
    name: 'Complete Zenemoo Footer',
    category: 'Footer',
    description: 'Clean verified company footer with location, website, and contact email.',
    html: `<!-- ZENEMOO COMPLETE FOOTER BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px; margin-top: 24px;">
  <tr>
    <td style="padding: 24px 28px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #1e293b;">
        Zenemoo AI Solutions
      </p>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
        Ganjam, Odisha, India
      </p>
      <p style="margin: 0 0 10px 0; font-size: 11px; color: #64748b;">
        <a href="https://www.zenemoo.in" target="_blank" style="color: #0284c7; text-decoration: underline;">www.zenemoo.in</a> &bull;
        <a href="mailto:contact@zenemoo.in" style="color: #0284c7; text-decoration: underline;">contact@zenemoo.in</a>
      </p>
      <p style="margin: 0; font-size: 10px; color: #94a3b8;">
        &copy; 2026 Zenemoo AI Solutions. All rights reserved.
      </p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'hero_banner',
    name: 'Hero Section & Headline',
    category: 'Hero',
    description: 'Prominent headline banner with intro text and key value proposition.',
    html: `<!-- ZENEMOO HERO SECTION BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%); border: 1px solid #bbf7d0; border-radius: 12px;">
  <tr>
    <td style="padding: 28px 24px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #16a34a; background-color: #dcfce7; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
        ✨ AI Technology &amp; Operations
      </span>
      <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
        Empowering Scalable AI &amp; Data Operations
      </h2>
      <p style="margin: 0 auto; max-width: 480px; font-size: 14px; line-height: 1.6; color: #475569;">
        Connecting enterprise pipelines with high-precision annotation workflows, verified datasets, and workforce intelligence.
      </p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'feature_list',
    name: 'Feature Checklist',
    category: 'Features',
    description: 'Structured 3-point feature checklist with check icons.',
    html: `<!-- ZENEMOO FEATURE CHECKLIST BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
  <tr>
    <td style="padding: 20px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">
        🚀 Core Platform Capabilities:
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: top; padding: 6px 0;">
            <span style="color: #16a34a; font-weight: bold; margin-right: 8px;">✓</span>
            <strong style="color: #1e293b; font-size: 13px;">High Precision Annotation:</strong>
            <span style="color: #475569; font-size: 13px;"> Multi-lingual speech, audio, and computer vision labeling.</span>
          </td>
        </tr>
        <tr>
          <td style="vertical-align: top; padding: 6px 0;">
            <span style="color: #16a34a; font-weight: bold; margin-right: 8px;">✓</span>
            <strong style="color: #1e293b; font-size: 13px;">Triple QA Verification:</strong>
            <span style="color: #475569; font-size: 13px;"> Automated validation and expert human audit review.</span>
          </td>
        </tr>
        <tr>
          <td style="vertical-align: top; padding: 6px 0;">
            <span style="color: #16a34a; font-weight: bold; margin-right: 8px;">✓</span>
            <strong style="color: #1e293b; font-size: 13px;">Enterprise Security:</strong>
            <span style="color: #475569; font-size: 13px;"> Robust encryption protocols and zero-breach standards.</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'contact_section',
    name: 'Contact & Helpdesk Card',
    category: 'Contact',
    description: 'Direct contact card with verified email and website information.',
    html: `<!-- ZENEMOO CONTACT SECTION BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px;">
  <tr>
    <td style="padding: 18px 22px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="font-size: 13px; font-weight: 700; color: #0369a1; margin-bottom: 6px;">
        📞 Questions or Partnership Enquiries?
      </div>
      <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.5; color: #334155;">
        Our team is here to assist you with any questions regarding our projects, vendor onboarding, or collaboration.
      </p>
      <p style="margin: 0; font-size: 12px; color: #64748b;">
        Email: <a href="mailto:contact@zenemoo.in" style="color: #0284c7; font-weight: 600; text-decoration: underline;">contact@zenemoo.in</a> &bull; Website: <a href="https://www.zenemoo.in" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">www.zenemoo.in</a>
      </p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'divider',
    name: 'Clean Divider Line',
    category: 'Layout',
    description: 'Subtle separator line for dividing content sections.',
    html: `<!-- ZENEMOO CLEAN DIVIDER BLOCK -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
  <tr>
    <td style="border-top: 1px solid #e2e8f0; font-size: 0; line-height: 0;">&nbsp;</td>
  </tr>
</table>`,
  },
];
