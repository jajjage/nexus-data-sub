import { NextFunction, Request, Response } from 'express';
import { UAParser } from 'ua-parser-js';
import { sanitizeUserAgent } from '../utils/security.utils';

interface DeviceInfo {
  type: string;
  browser: string;
  os: string;
  brand: string;
  model: string;
  deviceId: string;
  appVersion: string;
  device: string;
  rawUserAgent: string;
  parsed: UAParser.IResult;
  isWebClient: boolean;
  isMobileApp: boolean;
  isTablet: boolean;
  isEmulator: boolean;
  networkType: string;
  confidence: 'high' | 'medium' | 'low';
}

declare module 'express-serve-static-core' {
  interface Request {
    deviceInfo?: DeviceInfo;
  }
}

export const deviceInfoMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userAgent = req.headers['user-agent'] || '';
  const sanitizedUA = sanitizeUserAgent(userAgent);

  // Check for custom headers that mobile apps might send
  const customAppInfo = req.headers['x-app-platform'] as string;
  const customDeviceInfo = req.headers['x-device-info'] as string;
  const customDeviceId = req.headers['x-device-id'] as string;
  const customAppVersion = req.headers['x-app-version'] as string;
  const customNetworkType = req.headers['x-network-type'] as string;
  const customIsTablet = req.headers['x-is-tablet'] as string;
  const customIsEmulator = req.headers['x-is-emulator'] as string;

  // Parse the User-Agent
  const parsed = UAParser(sanitizedUA);

  // Determine if this is likely a web client or mobile app
  const isWebClient = !!(
    parsed.browser.name ||
    sanitizedUA.includes('Mozilla') ||
    sanitizedUA.includes('Chrome') ||
    sanitizedUA.includes('Safari') ||
    sanitizedUA.includes('Firefox')
  );

  // Detect potential mobile app clients
  const isMobileApp = !!(
    customAppInfo ||
    customDeviceInfo ||
    customDeviceId ||
    (!isWebClient && customAppVersion) ||
    (!parsed.browser.name && parsed.device.type === 'mobile') ||
    sanitizedUA.includes('okhttp') || // Android HTTP client
    sanitizedUA.includes('CFNetwork') || // iOS HTTP client
    sanitizedUA.includes('Alamofire') || // iOS HTTP client
    sanitizedUA.includes('axios') // Common HTTP client
  );

  // Determine device type with fallbacks
  let deviceType = 'Desktop';
  let isTablet = false;
  if (customIsTablet !== undefined) {
    // Use custom header if available
    isTablet = customIsTablet === 'true';
    deviceType = isTablet ? 'Tablet' : 'Mobile';
  } else if (customAppInfo) {
    // Use custom header info if available
    deviceType = customAppInfo.toLowerCase().includes('tablet')
      ? 'Tablet'
      : customAppInfo.toLowerCase().includes('mobile')
        ? 'Mobile'
        : 'Mobile';
    isTablet = deviceType === 'Tablet';
  } else if (parsed.device.type === 'mobile') {
    deviceType = 'Mobile';
  } else if (parsed.device.type === 'tablet') {
    deviceType = 'Tablet';
    isTablet = true;
  } else if (isMobileApp) {
    deviceType = 'Mobile'; // Assume mobile for unidentified apps
  }

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (isWebClient && parsed.browser.name && parsed.os.name) {
    confidence = 'high';
  } else if (
    customAppInfo ||
    customDeviceInfo ||
    customDeviceId ||
    parsed.browser.name ||
    parsed.os.name
  ) {
    confidence = 'medium';
  }

  // Enhanced browser detection
  let browser = 'Unknown';
  if (customAppInfo) {
    browser = `Mobile App: ${customAppInfo}`;
  } else if (parsed.browser.name) {
    browser = `${parsed.browser.name} ${parsed.browser.version || ''}`.trim();
  } else if (isMobileApp) {
    browser = 'Mobile App';
  } else if (isWebClient) {
    browser = 'Web Browser';
  }

  // Enhanced OS detection
  let os = 'Unknown';
  if (customAppInfo) {
    os = customAppInfo;
  } else if (parsed.os.name) {
    os = `${parsed.os.name} ${parsed.os.version || ''}`.trim();
  }

  // Enhanced brand detection
  let brand = 'Unknown';
  if (customDeviceInfo) {
    // Extract brand from device info (format: "Brand Model")
    const parts = customDeviceInfo.split(' ');
    brand = parts[0] || 'Unknown';
  } else if (parsed.device.vendor) {
    brand = parsed.device.vendor;
  }

  // Enhanced model detection
  let model = 'Unknown';
  if (customDeviceInfo) {
    // Extract model from device info (format: "Brand Model")
    const parts = customDeviceInfo.split(' ');
    model = parts.slice(1).join(' ') || 'Unknown';
  } else if (parsed.device.model) {
    model = parsed.device.model;
  }

  // Enhanced device detection
  let device = 'Unknown';
  if (parsed.device.vendor || parsed.device.model) {
    device =
      `${parsed.device.vendor || ''} ${parsed.device.model || ''}`.trim();
  } else if (customDeviceInfo) {
    device = customDeviceInfo;
  }

  // Emulator detection
  let isEmulator = false;
  if (customIsEmulator !== undefined) {
    isEmulator = customIsEmulator === 'true';
  }

  // Network type
  let networkType = 'unknown';
  if (customNetworkType) {
    networkType = customNetworkType;
  }

  // Device ID
  let deviceId = 'unknown';
  if (customDeviceId) {
    deviceId = customDeviceId;
  }

  // App version
  let appVersion = 'unknown';
  if (customAppVersion) {
    appVersion = customAppVersion;
  }

  req.deviceInfo = {
    type: deviceType,
    browser,
    os,
    brand,
    model,
    deviceId,
    appVersion,
    device,
    rawUserAgent: sanitizedUA,
    parsed,
    isWebClient,
    isMobileApp,
    isTablet,
    isEmulator,
    networkType,
    confidence,
  };

  next();
};
