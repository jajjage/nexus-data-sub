export interface UserPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

export interface JwtPayload {
  userId: string;
  email?: string;
  role?: string;
  permissions?: string[];
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface SessionData {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}
