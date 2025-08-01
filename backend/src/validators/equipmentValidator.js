const { body } = require('express-validator');

const conditionValues = ['Neuf', 'L\u00e9g\u00e8rement us\u00e9', 'Us\u00e9', 'Tr\u00e8s us\u00e9'];

const createEquipmentValidator = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').notEmpty().withMessage('Type is required'),
  body('condition').isIn(conditionValues),
  body('totalQty').isInt({ min: 0 }).withMessage('totalQty must be >= 0'),
  body('availableQty')
    .optional()
    .isInt({ min: 0 })
    .withMessage('availableQty must be >= 0')
    .custom((value, { req }) => {
      const total = Number(req.body.totalQty);
      if (!Number.isNaN(total) && value > total) {
        throw new Error('availableQty cannot exceed totalQty');
      }
      return true;
    }),
];

const updateEquipmentValidator = [
  body('name').optional().notEmpty(),
  body('type').optional().notEmpty(),
  body('condition').optional().isIn(conditionValues),
  body('totalQty').optional().isInt({ min: 0 }),
  body('availableQty')
    .optional()
    .isInt({ min: 0 })
    .bail()
    .custom((value, { req }) => {
      if (req.body.totalQty !== undefined) {
        const total = Number(req.body.totalQty);
        if (!Number.isNaN(total) && value > total) {
          throw new Error('availableQty cannot exceed totalQty');
        }
      }
      return true;
    }),
];

module.exports = { createEquipmentValidator, updateEquipmentValidator };
