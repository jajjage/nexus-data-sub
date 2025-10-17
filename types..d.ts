declare namespace Express {
  export interface Request {
    deviceInfo?: {
      type: string;
      browser: string;
      os: string;
      device: string;
      rawUserAgent: string;
    };
  }
}
