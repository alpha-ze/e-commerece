import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints.
 * Allows 100 requests per 15-minute window per IP.
 *
 * Validates: Requirements 19.4
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,  // Return rate-limit info in RateLimit-* headers
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later.',
    },
  },
});
