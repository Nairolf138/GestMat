import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../types';
import permissionsConfig from '../config/permissions';

const { PERMISSIONS } = permissionsConfig as any;

type Permissions = string | string[];

export default function auth(requiredPermissions: Permissions = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = decoded;

      const perms = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];
      if (perms.length) {
        const userRole = decoded.role;
        const hasPermission = perms.some(
          (perm) => PERMISSIONS[perm]?.includes(userRole),
        );
        if (!hasPermission) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }

      next();
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}
