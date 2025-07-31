const { body } = require('express-validator');

const registerValidator = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('role').optional().isString().withMessage('Invalid role'),
  body('structure').optional().isMongoId().withMessage('Invalid structure'),
];

const loginValidator = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateUserValidator = [
  body('firstName').optional().notEmpty(),
  body('lastName').optional().notEmpty(),
  body('email').optional().isEmail(),
  body('password').optional().notEmpty(),
];
module.exports = { registerValidator, loginValidator, updateUserValidator };
