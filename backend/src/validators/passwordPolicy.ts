import { body, ValidationChain } from 'express-validator';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;

export const passwordPolicy = (field = 'password'): ValidationChain =>
  body(field)
    .notEmpty()
    .withMessage('Password is required')
    .matches(PASSWORD_REGEX)
    .withMessage(
      'Password must be at least 12 characters long and include at least one uppercase letter, one lowercase letter, and one number',
    );

export default passwordPolicy;
