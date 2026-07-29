import rateLimit from 'express-rate-limit';

/**
 * Contact Form Submission Rate Limiter
 * Max 5 submissions per IP every 10 minutes
 */
export const contactRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many contact inquiries from this IP address. Please try again after 10 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Career / Opportunity Application Rate Limiter
 * Max 3 applications per IP every 30 minutes
 */
export const applicationRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3,
  message: {
    success: false,
    message: 'Too many job applications submitted from this IP address. Please try again after 30 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Enterprise Partner Request Rate Limiter
 * Max 5 requests per IP every 30 minutes
 */
export const partnerRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many partnership requests from this IP address. Please try again after 30 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
