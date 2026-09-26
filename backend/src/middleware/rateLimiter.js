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

/**
 * Authentication Login Rate Limiter (Admin & Portal)
 * Max 10 attempts per IP every 15 minutes
 */
export const authLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts from this IP address. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Password Recovery & OTP Verification Rate Limiter
 * Max 5 attempts per IP every 15 minutes
 */
export const authOtpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many OTP or password recovery requests. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Admin Email Verification Rate Limiter
 * Max 15 checks per IP every 15 minutes
 */
export const authCheckEmailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: {
    success: false,
    message: 'Too many email verification requests. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});


/**
 * Talent Registration Rate Limiter
 * Max 5 registrations per IP every 30 minutes
 */
export const talentRegisterRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many talent registrations from this IP address. Please try again after 30 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Meeting Call Booking Rate Limiter
 * Max 5 bookings per IP every 30 minutes
 */
export const bookingRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many meeting bookings submitted from this IP address. Please try again after 30 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Newsletter Subscription Rate Limiter
 * Max 10 subscriptions per IP every 30 minutes
 */
export const subscriberRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many subscription requests from this IP address. Please try again after 30 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Outbound Email Sending Rate Limiter
 * Max 30 email dispatches per 15 minutes per IP
 */
export const emailSendRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    success: false,
    message: 'Too many outbound email requests. Please slow down and try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public AI Chat Query Rate Limiter
 * Max 20 queries per IP every 10 minutes
 */
export const aiRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: {
    success: false,
    message: 'Too many AI requests. Please wait a moment before asking more questions.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Customer / Candidate Review Submission Rate Limiter
 * Max 5 review submissions per IP every 15 minutes
 */
export const reviewRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many review submissions from this IP address. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
