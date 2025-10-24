// src/middleware/rateLimiter.middleware.ts
import rateLimit from 'express-rate-limit';

export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  message: 'Too many messages sent, please try again later.',
});

export const channelCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many channels created, please try again later.',
});

export const channelJoinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many channels joined, please try again later.',
});
