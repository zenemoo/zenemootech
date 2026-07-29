import { supabase } from '../config/supabase.js';

const ADMIN_PANEL_LINK = 'https://www.zenemoo.in/#portal/9KqvA2Nz8';

/**
 * Format IST Date and Time strings
 * Output: { date: '29 Jul 2026', time: '08:26 PM IST' }
 */
export const getFormattedDateTimeIST = () => {
  const date = new Date();
  const options = { timeZone: 'Asia/Kolkata' };

  const day = date.toLocaleDateString('en-GB', { ...options, day: '2-digit' });
  const month = date.toLocaleDateString('en-GB', { ...options, month: 'short' });
  const year = date.toLocaleDateString('en-GB', { ...options, year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { ...options, hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    date: `${day} ${month} ${year}`,
    time: `${timeStr} IST`,
  };
};

/**
 * Fetch all active administrator Telegram Chat IDs from Supabase + ENV fallback
 */
export const getActiveAdminChatIds = async () => {
  const chatIds = new Set();

  // Primary ENV fallback chat ID
  if (process.env.TELEGRAM_CHAT_ID && process.env.TELEGRAM_CHAT_ID.trim()) {
    chatIds.add(process.env.TELEGRAM_CHAT_ID.trim());
  }

  // Fetch active admins from Supabase authorized_admin_emails table
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('authorized_admin_emails')
        .select('telegram_chat_id, status, notifications_enabled');

      if (!error && Array.isArray(data)) {
        data.forEach((admin) => {
          const isEnabled = admin.notifications_enabled !== false && admin.notifications_enabled !== 'false';
          const isActive = !admin.status || admin.status === 'active';
          if (isActive && isEnabled && admin.telegram_chat_id && admin.telegram_chat_id.trim()) {
            chatIds.add(admin.telegram_chat_id.trim());
          }
        });
      }
    } catch (err) {
      console.warn('[Telegram Service DB Fetch Note]', err.message || err);
    }
  }

  return Array.from(chatIds);
};

/**
 * Send raw Telegram message to a single chat ID with automatic retries
 */
export const sendTelegramMessageToChat = async (chatId, textMessage, retries = 2) => {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!botToken || !chatId) {
    console.warn('[Telegram Dispatch Skipped] Missing TELEGRAM_BOT_TOKEN or Chat ID');
    return false;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: textMessage,
          disable_web_page_preview: true,
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.ok) {
        console.log(`✅ [Telegram Notification Delivered] Chat ID: ${chatId} | MSG ID: ${resData.result?.message_id}`);
        return true;
      }

      console.warn(`⚠️ [Telegram API Retry ${attempt + 1}/${retries + 1}] Chat ID: ${chatId} | Status: ${response.status} | ${resData?.description}`);
    } catch (err) {
      console.error(`❌ [Telegram Network Exception ${attempt + 1}/${retries + 1}] Chat ID: ${chatId} | ${err.message}`);
    }

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }

  return false;
};

/**
 * Broadcast Telegram message asynchronously to every authorized administrator
 */
export const broadcastTelegramNotification = async (textMessage) => {
  try {
    const chatIds = await getActiveAdminChatIds();
    if (chatIds.length === 0) {
      console.warn('[Telegram Broadcast Skipped] No active administrator chat IDs found.');
      return;
    }

    console.log(`📡 [Telegram Broadcast Initiated] Dispatching to ${chatIds.length} administrator(s)...`);
    await Promise.allSettled(chatIds.map((chatId) => sendTelegramMessageToChat(chatId, textMessage)));
  } catch (err) {
    console.error('[Telegram Broadcast Exception]', err.message || err);
  }
};

// =========================================================================
// PUBLIC NOTIFICATION DISPATCH FUNCTIONS
// =========================================================================

/**
 * 1. New Contact Form Notification
 */
export const sendContactNotification = async (data = {}) => {
  const { date, time } = getFormattedDateTimeIST();
  const name = data.name || 'Anonymous Visitor';
  const email = data.email || 'Not Provided';
  const phone = data.phone || 'Not Provided';
  const company = data.company || 'Not Specified';
  const subject = data.subject || data.service || 'General Inquiry';
  const message = data.message || 'No message content provided.';

  const text = `📩 ZENEMOO • NEW CONTACT INQUIRY

━━━━━━━━━━━━━━━━━━━━━━

👤 Name
${name}

📧 Email
${email}

📞 Phone
${phone}

🏢 Company
${company}

📝 Subject
${subject}

💬 Message

${message}

━━━━━━━━━━━━━━━━━━━━━━

🕒 Received
${date} • ${time}

🌐 Dashboard
${ADMIN_PANEL_LINK}

━━━━━━━━━━━━━━━━━━━━━━

Zenemoo Admin Control Center`;

  await broadcastTelegramNotification(text);
};

/**
 * 2. New Career / Program Opportunity Application Notification
 */
export const sendApplicationNotification = async (data = {}) => {
  const { date, time } = getFormattedDateTimeIST();
  const name = data.name || data.applicant_name || 'Applicant';
  const email = data.email || data.applicant_email || 'Not Provided';
  const phone = data.phone || data.applicant_phone || 'Not Provided';
  const position = data.position || data.opportunity_title || 'Career Opportunity';
  const qualification = data.qualification || 'Relevant Degree / Qualification Uploaded';

  const text = `💼 ZENEMOO • NEW CAREER APPLICATION

━━━━━━━━━━━━━━━━━━━━━━

👤 Applicant
${name}

📧 Email
${email}

📞 Phone
${phone}

💼 Position
${position}

🎓 Qualification
${qualification}

📄 Resume
Uploaded Successfully

━━━━━━━━━━━━━━━━━━━━━━

🕒 Applied
${date} • ${time}

🌐 Dashboard
${ADMIN_PANEL_LINK}

━━━━━━━━━━━━━━━━━━━━━━

Zenemoo Admin Control Center`;

  await broadcastTelegramNotification(text);
};

/**
 * 3. New Enterprise Partnership Request Notification
 */
export const sendPartnerNotification = async (data = {}) => {
  const { date, time } = getFormattedDateTimeIST();
  const company = data.company || data.name || 'Partner Company';
  const contact = data.contact || data.contact_person || 'Executive Contact';
  const email = data.email || 'Not Provided';
  const phone = data.phone || 'Not Provided';
  const website = data.website || data.website_url || 'https://zenemoo.in';

  const text = `🤝 ZENEMOO • NEW PARTNERSHIP REQUEST

━━━━━━━━━━━━━━━━━━━━━━

🏢 Company
${company}

👤 Contact Person
${contact}

📧 Email
${email}

📞 Phone
${phone}

🌍 Website
${website}

━━━━━━━━━━━━━━━━━━━━━━

🕒 Submitted
${date} • ${time}

🌐 Dashboard
${ADMIN_PANEL_LINK}

━━━━━━━━━━━━━━━━━━━━━━

Zenemoo Admin Control Center`;

  await broadcastTelegramNotification(text);
};

/**
 * 4. Security Alert Notification
 */
export const sendSecurityNotification = async (data = {}) => {
  const { date, time } = getFormattedDateTimeIST();
  const event = data.event || 'Administrator Security Event';
  const email = data.email || 'Admin Account';
  const ip = data.ip || 'Unknown IP';
  const device = data.device || 'Web Browser';
  const location = data.location || 'Unknown Location';

  const text = `🛡️ ZENEMOO SECURITY ALERT

━━━━━━━━━━━━━━━━━━━━━━

🔐 Event
${event}

👤 Administrator
${email}

🌐 IP Address
${ip}

💻 Device
${device}

📍 Location
${location}

━━━━━━━━━━━━━━━━━━━━━━

🕒
${date} • ${time}

If this activity was not authorized,
please investigate immediately.

━━━━━━━━━━━━━━━━━━━━━━

Zenemoo Security Center`;

  await broadcastTelegramNotification(text);
};

/**
 * 5. Critical System Error Notification
 */
export const sendSystemNotification = async (data = {}) => {
  const { date, time } = getFormattedDateTimeIST();
  const service = data.service || 'Express API Service';
  const errorMsg = data.error || 'Internal Server Error';
  const server = data.server || 'Zenemoo Production Node Cluster';

  const text = `🚨 ZENEMOO SYSTEM ALERT

━━━━━━━━━━━━━━━━━━━━━━

❌ Service
${service}

⚠ Error

${errorMsg}

🖥 Server
${server}

📍 Environment
Production

━━━━━━━━━━━━━━━━━━━━━━

🕒 ${date} • ${time}

Immediate attention required.`;

  await broadcastTelegramNotification(text);
};
