import { body, ValidationChain } from 'express-validator';

const STATUS_VALUES = ['draft', 'submitted', 'validated'];
const TARGET_YEAR_VALUES = ['year1', 'year2', '1', '2', 1, 2];

const targetYearValidator = (value: unknown): boolean => {
  if (TARGET_YEAR_VALUES.includes(value as never)) {
    return true;
  }
  throw new Error('targetYear must be year1 or year2');
};

const statusValidator = (value: unknown): boolean => {
  if (STATUS_VALUES.includes(value as never)) {
    return true;
  }
  throw new Error('status must be draft, submitted, or validated');
};

export const createInvestmentValidator: ValidationChain[] = [
  body('structure').optional().isMongoId().withMessage('structure must be a valid id'),
  body('targetYear').custom(targetYearValidator),
  body('status').optional().custom(statusValidator),
  body('lines').optional().isArray().withMessage('lines must be an array'),
  body('lines.*.structure').optional().isMongoId(),
  body('lines.*.targetYear').optional().custom(targetYearValidator),
  body('lines.*.status').optional().custom(statusValidator),
  body('lines.*.type')
    .if(body('lines').exists())
    .isString()
    .trim()
    .notEmpty()
    .withMessage('type is required'),
  body('lines.*.quantity')
    .if(body('lines').exists())
    .isFloat({ min: 0 })
    .withMessage('quantity must be a positive number'),
  body('lines.*.unitCost')
    .if(body('lines').exists())
    .isFloat({ min: 0 })
    .withMessage('unitCost must be a positive number'),
  body('lines.*.priority')
    .if(body('lines').exists())
    .isFloat({ min: 0 })
    .withMessage('priority must be a positive number'),
  body('lines.*.justification').optional().isString().trim(),
];

export const updateInvestmentValidator: ValidationChain[] = [
  body('structure').optional().isMongoId(),
  body('targetYear').optional().custom(targetYearValidator),
  body('status').optional().custom(statusValidator),
  body('lines').optional().isArray(),
  body('lines.*.structure').optional().isMongoId(),
  body('lines.*.targetYear').optional().custom(targetYearValidator),
  body('lines.*.status').optional().custom(statusValidator),
  body('lines.*.type').optional().isString().trim().notEmpty(),
  body('lines.*.quantity').optional().isFloat({ min: 0 }),
  body('lines.*.unitCost').optional().isFloat({ min: 0 }),
  body('lines.*.priority').optional().isFloat({ min: 0 }),
  body('lines.*.justification').optional().isString().trim(),
];
