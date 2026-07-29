import * as brevo from '@getbrevo/brevo';
import nodemailer from 'nodemailer';

/**
 * Enterprise Brevo Transactional Email Service
 * Performs REST v3 API dispatch with SMTP fallback and detailed log reporting
 */
export const sendOtpEmail = async (toEmail, otp) => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const senderName = (process.env.BREVO_SENDER_NAME || 'Zenemoo').trim();
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || 'noreply@zenemoo.in').trim();

  console.log('-----------------------------------------------------');
  console.log('📧 BREVO EMAIL DISPATCH INITIATED');
  console.log('   - Recipient:', toEmail);
  console.log('   - Sender:', `"${senderName}" <${senderEmail}>`);
  console.log('   - API Key Prefix:', apiKey ? `${apiKey.substring(0, 10)}...` : '❌ MISSING');
  console.log('-----------------------------------------------------');

  if (!apiKey) {
    console.warn('[BREVO ERROR] BREVO_API_KEY is missing. Cannot dispatch email.');
    return { success: false, message: 'BREVO_API_KEY is missing in environment variables.' };
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zenemoo Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050507; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050507; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560px" cellspacing="0" cellpadding="0" style="max-width: 560px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 24px; padding: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #06b6d4, #3b82f6, #9333ea); padding: 2px; margin: 0 auto 16px;">
                <img src="https://zenemoo.in/assets/logo.png" alt="Zenemoo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; background: #ffffff;" />
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">ZENEMOO</h1>
              <p style="color: #06b6d4; font-size: 12px; font-family: monospace; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px;">Admin Security Center</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1);">
              <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 12px; text-align: center;">Password Reset Request</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                Hello Administrator,<br>We received a request to reset your Zenemoo Admin Control Center password.
              </p>
              <div style="background: rgba(6, 182, 212, 0.08); border: 1px dashed rgba(6, 182, 212, 0.5); border-radius: 16px; padding: 24px; text-align: center; margin: 0 0 24px;">
                <span style="display: block; color: #94a3b8; font-size: 11px; font-family: monospace; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Your One-Time Password (OTP)</span>
                <span style="display: inline-block; color: #22d3ee; font-size: 38px; font-weight: 800; font-family: monospace; letter-spacing: 8px;">${otp}</span>
              </div>
              <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 12px 16px; text-align: center; margin-bottom: 16px;">
                <p style="color: #f87171; font-size: 12px; font-family: monospace; margin: 0;">
                  ⏰ <strong>This code expires in 5 minutes.</strong>
                </p>
              </div>
              <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                If you did not request this reset, please ignore this email or contact system administration immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="color: #475569; font-size: 11px; font-family: monospace; margin: 0;">
                © 2026 Zenemoo Security Team • https://zenemoo.in
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  let restErrorDetails = null;
  let smtpErrorDetails = null;

  // Method 1: Try Brevo HTTP REST API v3
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail }],
        subject: 'Zenemoo Password Reset OTP',
        htmlContent: htmlContent,
      }),
    });

    const resData = await response.json();

    if (response.ok) {
      console.log('✅ [BREVO REST SUCCESS] Dispatched to:', toEmail, '| Message ID:', resData.messageId);
      return { success: true, messageId: resData.messageId };
    } else {
      restErrorDetails = {
        status: response.status,
        code: resData?.code || 'unknown_code',
        message: resData?.message || 'No message provided',
        body: resData
      };
      console.warn(`⚠️ [BREVO REST REJECTED]
        - Status Code: ${restErrorDetails.status}
        - Error Code: ${restErrorDetails.code}
        - Error Message: ${restErrorDetails.message}
        - Response Body: ${JSON.stringify(restErrorDetails.body, null, 2)}`);
    }
  } catch (restError) {
    restErrorDetails = {
      status: 'EXCEPTION',
      code: restError?.name || 'Exception',
      message: restError?.message || String(restError),
      stack: restError?.stack
    };
    console.warn(`⚠️ [BREVO REST EXCEPTION]
      - Message: ${restErrorDetails.message}
      - Stack trace: ${restErrorDetails.stack}`);
  }

  // Method 2: Try SMTP Transport Fallback (smtp-relay.brevo.com:587)
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: senderEmail,
        pass: apiKey,
      },
    });

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: toEmail,
      subject: 'Zenemoo Password Reset OTP',
      html: htmlContent,
    });

    console.log('✅ [BREVO SMTP SUCCESS] Dispatched to:', toEmail, '| Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (smtpError) {
    smtpErrorDetails = {
      name: smtpError?.name || 'Error',
      message: smtpError?.message || String(smtpError),
      code: smtpError?.code || 'unknown_code',
      response: smtpError?.response
    };
    console.error(`❌ [BREVO SMTP ERROR]
      - Error Name: ${smtpErrorDetails.name}
      - Error Message: ${smtpErrorDetails.message}
      - Error Code: ${smtpErrorDetails.code}
      - Server Response: ${smtpErrorDetails.response || 'None'}`);
    
    return { 
      success: false, 
      error: `Brevo dispatch failed. REST error: ${restErrorDetails ? restErrorDetails.message : 'None'}. SMTP error: ${smtpErrorDetails.message}`
    };
  }
};
