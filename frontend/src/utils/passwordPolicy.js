export const PASSWORD_POLICY_REGEX = /^.*(?=.{12,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/;
export const PASSWORD_REQUIREMENT_KEY = 'reset_password.requirements';

export const isPasswordValid = (password) => PASSWORD_POLICY_REGEX.test(password || '');
