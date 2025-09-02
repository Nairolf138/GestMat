import { NODE_ENV } from '../config';

export const cookieOptions = {
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

export default cookieOptions;
