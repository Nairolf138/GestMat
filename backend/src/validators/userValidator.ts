import { body, ValidationChain } from 'express-validator';
import { passwordPolicy } from './passwordPolicy';

export const registerValidator: ValidationChain[] = [
  body('username').notEmpty().withMessage('Username is required'),
  passwordPolicy(),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('role').optional().isString().withMessage('Invalid role'),
  body('structure').optional().isMongoId().withMessage('Invalid structure'),
];

export const loginValidator: ValidationChain[] = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('stayLoggedIn').optional().isBoolean().toBoolean(),
];

export const forgotPasswordValidator: ValidationChain[] = [
  body('identifier').notEmpty().withMessage('Identifier is required'),
];

export const forgotUsernameValidator: ValidationChain[] = [
  body('email').isEmail().withMessage('Valid email is required'),
];

export const resetPasswordValidator: ValidationChain[] = [
  body('token').notEmpty().withMessage('Token is required'),
  passwordPolicy(),
];

export const adminCreateUserValidator: ValidationChain[] = [
  body('username').notEmpty().withMessage('Username is required'),
  passwordPolicy(),
  body('role').optional().isString(),
  body('structure').optional().isMongoId(),
  body('email').optional().isEmail(),
  body('firstName').optional().notEmpty(),
  body('lastName').optional().notEmpty(),
];

export const updateUserValidator: ValidationChain[] = [
  body('firstName').optional().notEmpty(),
  body('lastName').optional().notEmpty(),
  body('email').optional().isEmail(),
  body('password').optional().notEmpty(),
  body('preferences').optional().isObject(),
  body('preferences.emailNotifications').optional().isObject(),
  body('preferences.emailNotifications.accountUpdates')
    .optional()
    .isBoolean()
    .toBoolean(),
  body('preferences.emailNotifications.loanRequests')
    .optional()
    .isBoolean()
    .toBoolean(),
  body('preferences.emailNotifications.loanStatusChanges')
    .optional()
    .isBoolean()
    .toBoolean(),
  body('preferences.emailNotifications.returnReminders')
    .optional()
    .isBoolean()
    .toBoolean(),
  body('preferences.emailNotifications.structureUpdates')
    .optional()
    .isBoolean()
    .toBoolean(),
  body('preferences.emailNotifications.systemAlerts')
    .optional()
    .isBoolean()
    .toBoolean(),
];

export const adminUpdateUserValidator: ValidationChain[] = [
  body('username').optional().notEmpty(),
  ...updateUserValidator,
  body('role').optional().isString(),
  body('structure').optional().isMongoId(),
];
