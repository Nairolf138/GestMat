import { body, query, ValidationChain } from 'express-validator';
import { ObjectId } from 'mongodb';

const statusValues = ['pending', 'accepted', 'refused', 'cancelled'];
const loanItemKinds = ['equipment', 'vehicle'] as const;

const isMongoId = (value: unknown): boolean =>
  typeof value === 'string' && ObjectId.isValid(value);

const validateLoanItem = (item: unknown): true => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error('each item must be an object');
  }

  const typedItem = item as Record<string, unknown>;
  const kind = typedItem.kind ?? 'equipment';

  if (!loanItemKinds.includes(kind as (typeof loanItemKinds)[number])) {
    throw new Error('kind must be either equipment or vehicle');
  }

  if (kind === 'vehicle') {
    if (!isMongoId(typedItem.vehicle)) {
      throw new Error('vehicle must be a valid id when kind is vehicle');
    }
    if (
      typedItem.quantity !== undefined &&
      !(typedItem.quantity === 1 || typedItem.quantity === '1')
    ) {
      throw new Error('quantity must be 1 for vehicle items');
    }
    return true;
  }

  if (!isMongoId(typedItem.equipment)) {
    throw new Error('equipment must be a valid id when kind is equipment');
  }

  const quantity = typedItem.quantity;
  if (
    quantity === undefined ||
    quantity === null ||
    !Number.isInteger(Number(quantity)) ||
    Number(quantity) < 1
  ) {
    throw new Error('quantity must be >= 1 for equipment items');
  }

  return true;
};

export const createLoanValidator: ValidationChain[] = [
  body('owner').isMongoId().withMessage('owner must be a valid id'),
  body('borrower').isMongoId().withMessage('borrower must be a valid id'),
  body('items').isArray().withMessage('items must be an array'),
  body('items.*.kind')
    .optional()
    .default('equipment')
    .isIn(loanItemKinds)
    .withMessage('kind must be either equipment or vehicle'),
  body('items.*').custom(validateLoanItem),
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
  body('note').optional().isString().isLength({ max: 500 }),
  body('status').optional().isIn(statusValues),
  body('direct').optional().isBoolean(),
];

export const updateLoanValidator: ValidationChain[] = [
  body('owner').optional().isMongoId(),
  body('borrower').optional().isMongoId(),
  body('items').optional().isArray(),
  body('items.*.kind')
    .optional()
    .default('equipment')
    .isIn(loanItemKinds)
    .withMessage('kind must be either equipment or vehicle'),
  body('items.*')
    .if(body('items').exists())
    .custom(validateLoanItem),
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
  body('note').optional().isString().isLength({ max: 500 }),
  body('status').optional().isIn(statusValues),
  body('decisionNote')
    .optional()
    .custom((value, { req }) => {
      if (!['accepted', 'refused'].includes(req.body.status)) {
        throw new Error('decisionNote is only allowed when accepting or refusing a loan');
      }
      return true;
    })
    .isString()
    .isLength({ max: 500 }),
];

export const listLoanQueryValidator: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be >= 1'),
];
