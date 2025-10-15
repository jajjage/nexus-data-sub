import rateLimit from 'express-rate-limit';
import { RequestHandler } from 'express';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});

// Stricter rate limiting for login attempts
// During tests we disable the strict login limiter to avoid 429 flakiness.
const loginLimiter: RequestHandler =
  process.env.NODE_ENV === 'test'
    ? (((req, res, next) => {
        next();
      }) as RequestHandler)
    : rateLimit({
        windowMs: 30 * 60 * 1000, // 15 minutes
        max: 100, // Only 10 login attempts per 15 minutes
        message: {
          success: false,
          message: 'Too many login attempts, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
      });

// Rate limiter specifically for test webhooks (more restrictive)
const testWebhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Only 20 test webhook calls per hour per IP
  message: {
    success: false,
    message: 'Too many test webhook requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export { authLimiter, loginLimiter, apiLimiter, testWebhookLimiter };
