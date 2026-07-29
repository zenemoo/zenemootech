/**
 * Telegram Bot Transactional Notification Service
 */
export const sendTelegramOtp = async (chatId, otp) => {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();

  console.log('-----------------------------------------------------');
  console.log('📬 TELEGRAM OTP DISPATCH INITIATED');
  console.log('   - Target Chat ID:', chatId);
  console.log('   - Bot Token Prefix:', botToken ? `${botToken.substring(0, 10)}...` : '❌ MISSING');
  console.log('-----------------------------------------------------');

  if (!botToken) {
    console.warn('[TELEGRAM ERROR] TELEGRAM_BOT_TOKEN is missing. Cannot dispatch message.');
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is missing in environment variables.' };
  }

  if (!chatId) {
    console.warn('[TELEGRAM ERROR] Target Chat ID is missing. Cannot dispatch message.');
    return { success: false, error: 'Target Chat ID is missing.' };
  }

  // Format exactly as requested:
  // 🔐 Zenemoo Security
  //
  // Your password reset code is:
  //
  // 482913
  //
  // Valid for 5 minutes.
  //
  // If you did not request this reset, ignore this message.
  const textMessage = `🔐 Zenemoo Security\n\nYour password reset code is:\n\n${otp}\n\nValid for 5 minutes.\n\nIf you did not request this reset, ignore this message.`;

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
      console.log('✅ [TELEGRAM SUCCESS] Dispatched to chat:', chatId);
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
