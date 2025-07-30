const { body } = require('express-validator');

const createEquipmentValidator = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').notEmpty().withMessage('Type is required'),
  body('totalQty').isInt({ min: 0 }).withMessage('totalQty must be >= 0'),
  body('availableQty').optional().isInt({ min: 0 }).withMessage('availableQty must be >= 0'),
];

const updateEquipmentValidator = [
  body('name').optional().notEmpty(),
  body('type').optional().notEmpty(),
  body('totalQty').optional().isInt({ min: 0 }),
  body('availableQty').optional().isInt({ min: 0 }),
];

module.exports = { createEquipmentValidator, updateEquipmentValidator };
