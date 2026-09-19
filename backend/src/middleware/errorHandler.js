import { sendSystemNotification } from '../services/telegramNotificationService.js';

export const errorHandler = (err, req, res, next) => {
  // Handle Body-Parser Entity Too Large (HTTP 413)
  if (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413) {
    return res.status(413).json({
      success: false,
      message: 'Payload Too Large. The request body exceeds the maximum allowed limit for this endpoint.',
    });
  }

  // Handle CORS Forbidden / Rejected Errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      code: 'CORS_NOT_ALLOWED',
      message: 'Cross-Origin Request Blocked: Origin is not allowed by CORS policy.',
    });
  }

  console.error('Unhandled Server Error:', err);

  const statusCode = err.status || err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  // Asynchronously send Telegram System Error alert on 500 status codes (non-blocking)
  if (statusCode >= 500) {
    sendSystemNotification({
      service: req.originalUrl || 'Express API Route',
      error: err.message || 'Unhandled Server Exception',
      server: process.env.SERVER_NAME || 'Zenemoo Node.js Production Cluster',
    }).catch((e) => console.warn('[Telegram System Alert Note]', e.message));
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const clientMessage = (statusCode >= 500 && isProduction)
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    stack: isProduction ? null : err.stack,
  });
};
