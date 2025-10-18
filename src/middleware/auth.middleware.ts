import { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { JwtService } from '../services/jwt.service';
import { SessionService } from '../services/session.service';
import { UserPayload } from '../types/auth.types';
import { ApiError } from '../utils/ApiError';

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserPayload;
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new ApiError(401, 'Access token required'));
    }

    const decoded = JwtService.verifyToken(token);

    if (!decoded) {
      return next(new ApiError(401, 'Invalid or expired access token'));
    }

    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    if (decoded.sessionId) {
      const session = await SessionService.getSession(decoded.sessionId);
      if (!session || session.userId !== decoded.userId) {
        return next(new ApiError(401, 'Invalid session'));
      }
    }

    req.user = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      permissions: user.permissions ?? [],
      sessionId: decoded.sessionId ?? '',
    };

    // Debug log for permissions
    console.log('User permissions:', req.user.permissions);

    return next();
  } catch (_error) {
    return next(new ApiError(500, `Authentication error ${_error}`));
  }
};

export const authenticateRefresh = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken =
      req.cookies?.refreshToken ||
      req.headers['x-refresh-token']?.toString() ||
      req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    const session = await SessionService.getSessionByRefreshToken(refreshToken);

    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    const user = await UserModel.findById(session.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      sessionId: session.id,
    };

    return next();
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: `Refresh token authentication error ${_error}`,
    });
  }
};
