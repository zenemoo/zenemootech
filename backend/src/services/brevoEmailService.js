import brevo from '@getbrevo/brevo';

/**
 * Enterprise Brevo Transactional Email Service
 */
export const sendOtpEmail = async (toEmail, otp) => {
  const apiKey = process.env.BREVO_API_KEY || '';
  const senderName = process.env.BREVO_SENDER_NAME || 'Zenemoo Security';
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@zenemoo.in';

  if (!apiKey) {
    console.warn('[BREVO WARNING] BREVO_API_KEY is missing in environment variables.');
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
          <!-- Logo & Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #06b6d4, #3b82f6, #9333ea); padding: 2px; margin: 0 auto 16px;">
                <img src="https://zenemoo.in/assets/logo.png" alt="Zenemoo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; background: #ffffff;" />
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">ZENEMOO</h1>
              <p style="color: #06b6d4; font-size: 12px; font-family: monospace; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px;">Admin Security Center</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 24px 0; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1);">
              <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 12px; text-align: center;">Password Reset Request</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                Hello Administrator,<br>We received a request to reset your Zenemoo Admin Control Center password.
              </p>

              <!-- OTP Box -->
              <div style="background: rgba(6, 182, 212, 0.08); border: 1px dashed rgba(6, 182, 212, 0.5); border-radius: 16px; padding: 24px; text-align: center; margin: 0 0 24px;">
                <span style="display: block; color: #94a3b8; font-size: 11px; font-family: monospace; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Your One-Time Password (OTP)</span>
                <span style="display: inline-block; color: #22d3ee; font-size: 38px; font-weight: 800; font-family: monospace; letter-spacing: 8px;">${otp}</span>
              </div>

              <!-- Expiry Note -->
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

          <!-- Footer -->
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

  // Method 1: Try @getbrevo/brevo SDK
  try {
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = 'Zenemoo Password Reset OTP';
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: senderName, email: senderEmail };
    sendSmtpEmail.to = [{ email: toEmail }];

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('[BREVO SDK SUCCESS] Email dispatched to:', toEmail, data?.body?.messageId || '');
    return { success: true, messageId: data?.body?.messageId };
  } catch (sdkError) {
    console.warn('[BREVO SDK Fallback] Retrying via direct Brevo HTTP REST API...', sdkError?.message || sdkError);
  }

  // Method 2: Direct REST API Endpoint Fallback
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

    if (!response.ok) {
      console.error('[BREVO REST API ERROR]', resData);
      throw new Error(resData?.message || 'Failed to dispatch email via Brevo REST API');
    }

    console.log('[BREVO REST API SUCCESS] Dispatched to:', toEmail, resData.messageId || '');
    return { success: true, messageId: resData.messageId };
  } catch (restError) {
    console.error('[BREVO DISPATCH CRITICAL ERROR]', restError?.message || restError);
    throw restError;
  }
};
