import { NextFunction, Request, RequestHandler, Response } from 'express';
import { body, ValidationChain, validationResult, check } from 'express-validator';

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

export const validateRegistration: (ValidationChain | RequestHandler)[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    ),
  body('fullName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters long')
    .trim(),
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .trim(),
  handleValidationErrors,
];

export const validateUserCreation: (ValidationChain | RequestHandler)[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    ),
  body('fullName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters long')
    .trim(),
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .trim(),
  body('role')
    .optional()
    .isIn(['admin', 'staff', 'user'])
    .withMessage('Invalid role specified'),
  handleValidationErrors,
];

export const validateLogin: (ValidationChain | RequestHandler)[] = [
  body('password').notEmpty().withMessage('Password is required'),
  check()
    .custom((_, { req }) => {
      const { email, phoneNumber } = req.body;
      if (email && phoneNumber) {
        throw new Error('Please provide either email or phone number, not both');
      }
      if (!email && !phoneNumber) {
        throw new Error('Please provide either email or phone number');
      }
      return true;
    })
    .custom((_, { req }) => {
      const { email, phoneNumber } = req.body;
      if (email) {
        return body('email')
          .isEmail()
          .withMessage('Please provide a valid email')
          .run(req);
      }
      if (phoneNumber) {
        return body('phoneNumber')
          .isMobilePhone('any')
          .withMessage('Please provide a valid phone number')
          .run(req);
      }
      return true;
    }),
  handleValidationErrors,
];
