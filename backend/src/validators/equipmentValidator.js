const { body } = require('express-validator');

const createEquipmentValidator = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').notEmpty().withMessage('Type is required'),
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
