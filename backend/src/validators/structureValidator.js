const { body } = require('express-validator');

const structureValidator = [
  body('name').notEmpty().withMessage('Name is required'),
];

module.exports = { structureValidator };
