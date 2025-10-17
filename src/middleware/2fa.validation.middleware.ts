import { body, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { handleValidationErrors } from './validation.middleware';

export const validate2FASetup: (
  | ValidationChain
  | ((req: Request, res: Response, next: NextFunction) => void)
)[] = [
  body('totpCode')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('TOTP code must be a 6-digit number'),
  handleValidationErrors,
];

export const validate2FAVerification: (
  | ValidationChain
  | ((req: Request, res: Response, next: NextFunction) => void)
)[] = [
  body('totpCode')
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('TOTP code must be a 6-digit number'),
  body('backupCode')
    .optional()
    .isString()
    .withMessage('Backup code must be a string'),
  (req: Request, res: Response, next: NextFunction) => {
    const { totpCode, backupCode } = req.body;
    if (!totpCode && !backupCode) {
      return res.status(400).json({
        success: false,
        message: 'Either TOTP code or backup code is required',
      });
    }

    if (totpCode && backupCode) {
      return res.status(400).json({
        success: false,
        message: 'Provide either TOTP code or backup code, not both',
      });
    }
    return next();
  },
];
