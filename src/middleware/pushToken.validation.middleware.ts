import { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/response.utils';

export function validatePushToken(
  req: Request,
  res: Response,
  next: NextFunction
): void | Response {
  const { token, platform } = req.body;

  // Validate required fields
  if (!token || !platform) {
    return sendError(res, 'Token and platform are required', 400, []);
  }

  // Validate platform
  const validPlatforms = ['ios', 'android', 'web'];
  if (!validPlatforms.includes(platform)) {
    return sendError(
      res,
      `Platform must be one of: ${validPlatforms.join(', ')}`,
      400,
      []
    );
  }

  // Validate token format
  if (typeof token !== 'string' || token.length < 32) {
    return sendError(res, 'Invalid token format', 400, []);
  }

  next();
}
