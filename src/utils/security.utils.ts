import { Request, Response } from 'express';
import bcrypt from 'bcrypt';

const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
): void => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  };

  // Set access token cookie (short-lived)
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_EXPIRY,
  });

  // Set refresh token cookie (long-lived)
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_EXPIRY,
  });
};

const clearAuthCookies = (res: Response): void => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};

const getClientIP = (req: Request): string => {
  // Try to get IP from various headers in order of preference
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIP = req.headers['x-real-ip'] as string;
  const cfConnectingIP = req.headers['cf-connecting-ip'] as string;

  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, get the first one
    return forwarded.split(',')[0].trim();
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  if (realIP) {
    return realIP;
  }

  // Fallback to connection remote address
  return (
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.connection as any)?.socket?.remoteAddress ||
    '127.0.0.1'
  );
};

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

const sanitizeUserAgent = (userAgent: string | undefined): string => {
  if (!userAgent || typeof userAgent !== 'string') {
    return 'Unknown';
  }
  const sanitized = userAgent
    .replace(/[<>'"]/g, '')
    .replace(/\n|\r/g, ' ')
    .trim()
    .substring(0, 500);
  return sanitized || 'Unknown';
};

const sanitizeIP = (ip: string): string => {
  if (!ip || typeof ip !== 'string') {
    return 'unknown';
  }

  // Basic IP validation (IPv4 and IPv6)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
    return ip;
  }

  // For forwarded IPs, take the first one
  const firstIP = ip.split(',')[0].trim();
  if (ipv4Regex.test(firstIP) || ipv6Regex.test(firstIP)) {
    return firstIP;
  }

  return 'unknown';
};

export {
  setAuthCookies,
  clearAuthCookies,
  getClientIP,
  hashPassword,
  comparePassword,
  sanitizeUserAgent,
  sanitizeIP,
};
