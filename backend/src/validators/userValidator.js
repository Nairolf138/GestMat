const { body } = require('express-validator');

const registerValidator = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const loginValidator = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateUserValidator = [
  body('password').optional().notEmpty(),
  body('email').optional().isEmail(),
];
module.exports = { registerValidator, loginValidator, updateUserValidator };
