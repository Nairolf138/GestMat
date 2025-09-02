import { body, ValidationChain } from 'express-validator';

export const structureValidator: ValidationChain[] = [
  body('name').notEmpty().withMessage('Name is required'),
];
