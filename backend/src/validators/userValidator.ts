import { body, ValidationChain } from 'express-validator';

export const registerValidator: ValidationChain[] = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('role').optional().isString().withMessage('Invalid role'),
  body('structure').optional().isMongoId().withMessage('Invalid structure'),
];

export const loginValidator: ValidationChain[] = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const updateUserValidator: ValidationChain[] = [
  body('firstName').optional().notEmpty(),
  body('lastName').optional().notEmpty(),
  body('email').optional().isEmail(),
  body('password').optional().notEmpty(),
];
