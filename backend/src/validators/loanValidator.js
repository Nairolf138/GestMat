const { body } = require('express-validator');

const statusValues = ['pending', 'accepted', 'refused'];

const createLoanValidator = [
  body('owner').isMongoId().withMessage('owner must be a valid id'),
  body('borrower').isMongoId().withMessage('borrower must be a valid id'),
  body('items').isArray().withMessage('items must be an array'),
  body('items.*.equipment').isMongoId().withMessage('equipment must be a valid id'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('quantity must be >= 1'),
  body('status').optional().isIn(statusValues),
];

const updateLoanValidator = [
  body('owner').optional().isMongoId(),
  body('borrower').optional().isMongoId(),
  body('items').optional().isArray(),
  body('items.*.equipment').optional().isMongoId(),
  body('items.*.quantity').optional().isInt({ min: 1 }),
  body('status').optional().isIn(statusValues),
];

module.exports = { createLoanValidator, updateLoanValidator };
