/**
 * Reusable User-Agent parsing helper.
 * Resolves OS and Browser names.
 */
export const parseUserAgent = (ua) => {
  if (!ua) return { device: 'Unknown OS', browser: 'Unknown Browser' };
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';

  return { device: os, browser };
};

/**
 * Reusable formatted timezone timestamp generator.
 * Format: 29 Jul 2026, 02:45 PM IST
 */
export const getFormattedTime = () => {
  const date = new Date();
  const options = { timeZone: 'Asia/Kolkata' };
  
  const day = date.toLocaleDateString('en-GB', { ...options, day: '2-digit' });
  const month = date.toLocaleDateString('en-GB', { ...options, month: 'short' });
  const year = date.toLocaleDateString('en-GB', { ...options, year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { ...options, hour: '2-digit', minute: '2-digit', hour12: true });
  
  return `${day} ${month} ${year}, ${timeStr} IST`;
};

/**
 * Reusable client IP address extractor.
 * Handles reverse proxies (Render), standard Express ip, and sockets.
 */
export const getClientIp = (req) => {
  if (!req) return 'Unknown';
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.ip || 
             req.socket?.remoteAddress || 
             'Unknown';
  return ip.split(',')[0].trim();
};

/**
 * Resolves the approximate location of an IP address using ip-api.com.
 * Falls back to "Local Development" or "Unknown".
 */
export const getApproximateLocation = async (ip) => {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'Unknown') {
    return 'Local Development';
  }
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        return `${data.city}, ${data.regionName}, ${data.country}`;
      }
    }
  } catch (e) {
    console.error('GeoIP lookup error:', e.message);
  }
  return 'Unknown';
};

// Separate templates from execution logic
const TEMPLATES = {
  otp: (data) => `🔐 Zenemoo Security Alert

A password reset request has been initiated for your administrator account.

━━━━━━━━━━━━━━━━━━━━
📧 Email: ${data.email}
🕒 Time: ${data.time}
🌐 IP Address: ${data.ip}
📍 Location: ${data.location}
🖥️ Device: ${data.device} / ${data.browser}
━━━━━━━━━━━━━━━━━━━━

🔑 One-Time Password (OTP)

OTP: ${data.otp}

This OTP is valid for 5 minutes and can only be used once.

⚠️ If you did not request this password reset, do NOT share this OTP with anyone. Please secure your administrator account immediately.

━━━━━━━━━━━━━━━━━━━━

Zenemoo Security System

https://www.zenemoo.in/#portal/9KqvA2Nz8`,

  password_changed: (data) => `✅ Zenemoo Security Alert

Your administrator account password has been changed successfully.

━━━━━━━━━━━━━━━━━━━━
📧 Email: ${data.email}
🕒 Time: ${data.time}
🌐 IP Address: ${data.ip}
📍 Location: ${data.location}
🖥️ Device: ${data.device} / ${data.browser}
━━━━━━━━━━━━━━━━━━━━

If you made this change, no further action is required.

⚠️ If you did NOT make this change, secure your account immediately and contact the system administrator.

━━━━━━━━━━━━━━━━━━━━

Zenemoo Security System

https://www.zenemoo.in/#portal/9KqvA2Nz8`,

  login: (data) => `🔓 Zenemoo Security Alert

A successful administrator login has been detected.

━━━━━━━━━━━━━━━━━━━━
📧 Email: ${data.email}
🕒 Time: ${data.time}
🌐 IP Address: ${data.ip}
📍 Location: ${data.location}
🖥️ Device: ${data.device} / ${data.browser}
━━━━━━━━━━━━━━━━━━━━
${data.isNewDevice ? `
⚠️ New Device Detected

This login appears to be from a device or browser that has not been used previously for this account.

━━━━━━━━━━━━━━━━━━━━
` : ''}
If this was you, no further action is required.

⚠️ If you did NOT perform this login, change your password immediately.

━━━━━━━━━━━━━━━━━━━━

Zenemoo Security System

https://www.zenemoo.in/#portal/9KqvA2Nz8`
};

/**
 * Send professional, enterprise-grade Telegram security alerts
 */
export const sendTelegramAlert = async (chatId, templateName, rawData) => {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();

  console.log('-----------------------------------------------------');
  console.log('📬 TELEGRAM NOTIFICATION DISPATCH INITIATED');
  console.log('   - Template:', templateName);
  console.log('   - Target Chat ID:', chatId);
  console.log('   - Bot Token Prefix:', botToken ? `${botToken.substring(0, 10)}...` : '❌ MISSING');
  console.log('-----------------------------------------------------');

  if (!botToken) {
    console.warn('[TELEGRAM ERROR] TELEGRAM_BOT_TOKEN is missing. Cannot dispatch alert.');
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is missing in environment variables.' };
  }

  if (!chatId) {
    console.warn('[TELEGRAM ERROR] Target Chat ID is missing. Cannot dispatch alert.');
    return { success: false, error: 'Target Chat ID is missing.' };
  }

  const templateFn = TEMPLATES[templateName];
  if (!templateFn) {
    console.warn(`[TELEGRAM ERROR] Unknown template name: ${templateName}`);
    return { success: false, error: `Unknown template: ${templateName}` };
  }

  // Resolve user agent details
  const { device, browser } = parseUserAgent(rawData.userAgent);

  // Format time
  const time = getFormattedTime();

  // Populate dynamic payload
  const textMessage = templateFn({
    email: rawData.email,
    otp: rawData.otp,
    ip: rawData.ip || 'Unknown',
    location: rawData.location || 'Unknown',
    isNewDevice: !!rawData.isNewDevice,
    device,
    browser,
    time
  });

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: textMessage,
      }),
    });

    const resData = await response.json();

    if (response.ok && resData.ok) {
      console.log(`✅ [TELEGRAM SUCCESS] Alert [${templateName}] sent to chat: ${chatId}`);
      return { success: true, messageId: resData.result?.message_id };
    } else {
      console.warn(`⚠️ [TELEGRAM REJECTED] Status: ${response.status} | Description: ${resData?.description}`);
      return { success: false, error: resData?.description || 'Telegram API error' };
    }
  } catch (error) {
    console.error('❌ [TELEGRAM EXCEPTION]', error?.message || error);
    return { success: false, error: error?.message || 'Telegram connection exception' };
  }
};
