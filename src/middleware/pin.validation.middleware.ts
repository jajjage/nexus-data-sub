import { body } from 'express-validator';
import { validationMiddleware } from './validation.middleware';

export const validatePin = [
  body('pin')
    .isString()
    .withMessage('PIN must be a string')
    .isLength({ min: 4, max: 4 })
    .withMessage('PIN must be 4 digits')
    .matches(/^\d{4}$/)
    .withMessage('PIN must be numeric'),
  validationMiddleware,
];
