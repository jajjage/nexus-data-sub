import { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  return next();
};

export const validateTestWebhook = [
  body('userId').isUUID().withMessage('userId must be a valid UUID'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('amount must be a positive number greater than 0'),
  body('provider')
    .optional()
    .isLength({ max: 50 })
    .withMessage('provider name must be less than 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'provider name can only contain alphanumeric characters, underscores, and hyphens'
    ),
  body('providerVaId')
    .optional()
    .isLength({ max: 100 })
    .withMessage('providerVaId must be less than 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'providerVaId can only contain alphanumeric characters, underscores, and hyphens'
    ),
  handleValidationErrors,
];
