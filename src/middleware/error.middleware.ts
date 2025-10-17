import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.utils';
import { sendError } from '../utils/response.utils';
import { ApiError } from '../utils/ApiError';

const handleApiError = (err: ApiError, res: Response) => {
  const { statusCode, message, isOperational } = err;
  if (isOperational) {
    logger.warn(message, { statusCode });
  } else {
    logger.error(message, { statusCode, stack: err.stack });
  }
  sendError(res, message, statusCode);
};

const handleGenericError = (err: Error, res: Response) => {
  logger.error('An unexpected error occurred', {
    message: err.message,
    stack: err.stack,
  });
  sendError(res, 'An internal server error occurred', 500);
};

export const errorMiddleware = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    handleApiError(err, res);
  } else {
    handleGenericError(err, res);
  }
};
