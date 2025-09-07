import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../types';

type Roles = string | string[];

export default function auth(allowedRoles: Roles = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = decoded;

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      next();
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}
