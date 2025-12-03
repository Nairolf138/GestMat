import { COOKIE_SAME_SITE, COOKIE_SECURE } from '../config';

export const cookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: COOKIE_SAME_SITE,
};

export default cookieOptions;
