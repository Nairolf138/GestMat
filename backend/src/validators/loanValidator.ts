import { body, ValidationChain } from 'express-validator';

const statusValues = ['pending', 'accepted', 'refused', 'cancelled'];

export const createLoanValidator: ValidationChain[] = [
  body('owner').isMongoId().withMessage('owner must be a valid id'),
  body('borrower').isMongoId().withMessage('borrower must be a valid id'),
  body('items').isArray().withMessage('items must be an array'),
  body('items.*.equipment')
    .isMongoId()
    .withMessage('equipment must be a valid id'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('quantity must be >= 1'),
  body('startDate')
    .isISO8601()
    .withMessage('startDate must be a valid ISO8601 date'),
  body('endDate')
    .isISO8601()
    .withMessage('endDate must be a valid ISO8601 date')
    .custom((value, { req }) => {
      if (new Date(req.body.startDate) > new Date(value)) {
        throw new Error('startDate must be before or equal to endDate');
      }
      return true;
    }),
  body('status').optional().isIn(statusValues),
];

export const updateLoanValidator: ValidationChain[] = [
  body('owner').optional().isMongoId(),
  body('borrower').optional().isMongoId(),
  body('items').optional().isArray(),
  body('items.*.equipment').optional().isMongoId(),
  body('items.*.quantity').optional().isInt({ min: 1 }),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO8601 date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('startDate must be in the future');
      }
      return true;
    }),
  body('endDate')
    .optional()
    .isISO8601()
    .custom((value, { req }) => {
      if (
        req.body.startDate &&
        new Date(req.body.startDate) > new Date(value)
      ) {
        throw new Error('startDate must be before or equal to endDate');
      }
      return true;
    }),
  body('status').optional().isIn(statusValues),
];
