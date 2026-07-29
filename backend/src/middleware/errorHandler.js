import { sendSystemNotification } from '../services/telegramNotificationService.js';

export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  // Asynchronously send Telegram System Error alert on 500 status codes (non-blocking)
  if (statusCode >= 500) {
    sendSystemNotification({
      service: req.originalUrl || 'Express API Route',
      error: err.message || 'Unhandled Server Exception',
      server: process.env.SERVER_NAME || 'Zenemoo Node.js Production Cluster',
    }).catch((e) => console.warn('[Telegram System Alert Note]', e.message));
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
