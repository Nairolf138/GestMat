declare module './config';
declare module './config/db';
declare module './config/roles';
declare module '../config';
declare module '../config/roles';
declare module './middleware/checkObjectId';
declare module '../middleware/checkObjectId';
declare module 'nodemailer';
declare module './routes/auth';
declare module './routes/users';
declare module './routes/structures';
declare module './routes/equipments';
declare module './routes/vehicles';
declare module './routes/loans';
declare module './routes/stats';
declare module './routes/roles';
declare module './routes/investments';

export interface AuthUser {
  id: string;
  role: string;
  structure?: string;
  stayLoggedIn?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
