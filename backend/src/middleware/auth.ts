import jwt from 'jsonwebtoken';
import client, { Counter } from 'prom-client';
import { JWT_SECRET } from '../config';
import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../types';
import permissionsConfig from '../config/permissions';
import logger from '../utils/logger';

const { PERMISSIONS } = permissionsConfig as any;

type Permissions = string | string[];
type AuthOptions = { permissions?: Permissions; action?: string };
type AuthInput = Permissions | AuthOptions;

const authorizationCounter =
  (client.register.getSingleMetric('authorization_decisions_total') as Counter<
    string
  >) ||
  new Counter({
    name: 'authorization_decisions_total',
    help: 'Count of authorization decisions by action and outcome',
    registers: [client.register],
    labelNames: ['action', 'outcome'],
  });

function resolvePermissions(input: AuthInput): {
  permissions: Permissions;
  action?: string;
} {
  if (typeof input === 'string' || Array.isArray(input)) {
    return { permissions: input };
  }
  return {
    permissions: input.permissions ?? [],
    action: input.action,
  };
}

export default function auth(input: AuthInput = []) {
  const { permissions: requiredPermissions, action } = resolvePermissions(input);
  return (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    const actionLabel = action || 'unspecified';
    if (!token) {
      authorizationCounter.labels(actionLabel, 'unauthenticated').inc();
      return res.status(401).json({ message: 'No token provided' });
    }

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
          authorizationCounter.labels(actionLabel, 'denied').inc();
          logger.warn('Authorization denied for %s on %s', decoded.id, actionLabel);
          return res.status(403).json({ message: 'Access denied' });
        }
      }

      authorizationCounter.labels(actionLabel, 'allowed').inc();
      logger.info('Authorization allowed for %s on %s', decoded.id, actionLabel);
      next();
    } catch (err) {
      authorizationCounter.labels(actionLabel, 'invalid').inc();
      logger.warn('Invalid token for action %s: %o', actionLabel, err as Error);
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}
