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

  let ip = '127.0.0.1'; // Default fallback

  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, get the first one
    ip = forwarded.split(',')[0].trim();
  } else if (cfConnectingIP) {
    ip = cfConnectingIP;
  } else if (realIP) {
    ip = realIP;
  } else {
    // Fallback to connection remote address
    ip = (
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      '127.0.0.1'
    );
  }

  // Validate and sanitize the IP
  return sanitizeIP(ip);
};

const isValidIP = (ip: string): boolean => {
  // Validate IPv4 format
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    // Additional validation for IPv4 range
    const octets = ip.split('.').map(Number);
    return octets.every(octet => octet >= 0 && octet <= 255);
  }
  
  // Basic validation for IPv6 format
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  if (ipv6Regex.test(ip)) {
    return true;
  }
  
  // For IPv6 addresses with :: shorthand
  if (ip.includes('::')) {
    // More comprehensive check for IPv6 with shorthand notation
    const ipv6RegexWithShorthand = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}(:[0-9a-fA-F]{0,4}){0,7}$/;
    // Simplified validation for common IPv6 patterns with shorthand
    const parts = ip.split('::');
    if (parts.length === 2) {
      const leftSide = parts[0].split(':');
      const rightSide = parts[1].split(':');
      // Validate that each part is a valid hex value (0-4 chars)
      const allValid = [...leftSide, ...rightSide].every(part => 
        part === '' || /^[0-9a-fA-F]{0,4}$/.test(part)
      );
      return allValid;
    }
  }
  
  return false;
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

  // For forwarded IPs, take the first one
  const firstIP = ip.split(',')[0].trim();
  if (isValidIP(firstIP)) {
    return firstIP;
  }

  if (isValidIP(ip)) {
    return ip;
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
  isValidIP,  // Export for use in other modules if needed
};
