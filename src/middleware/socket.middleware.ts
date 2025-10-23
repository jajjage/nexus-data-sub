/* eslint-disable @typescript-eslint/no-unused-vars */
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { UserModel } from '../models/User';
import { JwtService } from '../services/jwt.service';
import { SessionService } from '../services/session.service';
import { UserPayload } from '../types/auth.types';

export interface AuthenticatedSocket extends Socket {
  user?: UserPayload;
}

export const verifySocketMiddleware = async (
  socket: AuthenticatedSocket,
  next: (err?: ExtendedError) => void
) => {
  const token =
    socket.handshake.auth.token || socket.handshake.headers['authorization'];

  if (!token) {
    return next(new Error('Authentication error: Token not provided'));
  }

  try {
    const decoded = JwtService.verifyToken(token);
    if (!decoded) {
      return next(new Error('Authentication error: Invalid token'));
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    if (decoded.sessionId) {
      const session = await SessionService.getSession(decoded.sessionId);
      if (!session || session.userId !== decoded.userId) {
        return next(new Error('Authentication error: Invalid session'));
      }
    }

    socket.user = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      permissions: user.permissions ?? [],
      sessionId: decoded.sessionId ?? '',
    };

    next();
  } catch (error) {
    next(new Error('Authentication error: Internal server error'));
  }
};
