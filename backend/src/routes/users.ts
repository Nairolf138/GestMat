import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import {
  findUsers,
  deleteUserById,
  findUserById,
  updateUser,
} from '../models/User';
import { findStructureById } from '../models/Structure';
import auth from '../middleware/auth';
import permissions from '../config/permissions';
import validate from '../middleware/validate';
import checkId from '../middleware/checkObjectId';
import {
  adminCreateUserValidator,
  adminUpdateUserValidator,
  updateUserValidator,
} from '../validators/userValidator';
import { ApiError, notFound } from '../utils/errors';
import { sendMail } from '../utils/sendMail';
import { NOTIFY_EMAIL } from '../config';
import logger from '../utils/logger';
import type { User } from '../models/User';
import { DEFAULT_USER_PREFERENCES, mergePreferences } from '../models/User';
import { accountUpdateTemplate } from '../utils/mailTemplates';
import { isNotificationEnabled } from '../utils/notificationPreferences';
import { createUser } from '../models/User';
import { normalizeRole } from '../utils/roleAccess';
import ROLES, { ADMIN_ROLE, AUTRE_ROLE } from '../config/roles';

const { MANAGE_USERS } = permissions;
const DEFAULT_ROLE = AUTRE_ROLE;
const ALLOWED_ROLES = ROLES.filter((r) => r !== ADMIN_ROLE);

export const notifyAccountUpdate = async (
  user: User,
  changedFields: string[],
): Promise<void> => {
  if (!changedFields.length) return;

  const recipients = [
    isNotificationEnabled(user, 'accountUpdates') ? user.email : undefined,
    NOTIFY_EMAIL,
  ].filter((value): value is string => Boolean(value));

  if (!recipients.length) {
    logger.info(
      'Account update notification not sent: no recipient for user %s',
      user.username,
    );
    return;
  }

  const displayName = `${user.firstName ? `${user.firstName} ` : ''}${
    user.lastName ?? ''
  }`.trim()
    || user.username;

  const { subject, text, html } = accountUpdateTemplate({
    displayName,
    changedFields,
  });

  try {
    await sendMail({
      to: recipients.join(','),
      subject,
      text,
      html,
    });
  } catch (error) {
    logger.error(
      'Failed to send account update notification for user %s: %o',
      user.username,
      error,
    );
  }
};

const router = express.Router();

router.post(
  '/',
  auth(MANAGE_USERS),
  adminCreateUserValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      let { username, password, role, structure, email, firstName, lastName } =
        req.body;
      role = normalizeRole(role);
      if (!ALLOWED_ROLES.includes(role)) {
        role = DEFAULT_ROLE;
      }
      const structureData = structure
        ? await findStructureById(db, structure)
        : undefined;
      if (structure && !structureData) {
        return next(new ApiError(400, 'Structure not found'));
      }
      const hashed = await bcrypt.hash(password, 10);
      const user = await createUser(db, {
        username,
        password: hashed,
        role,
        structure,
        email,
        firstName,
        lastName,
      });
      const { password: _pw, ...userData } = user;
      res.status(201).json(userData);
    } catch (err: any) {
      if (err.message === 'Username already exists') {
        return next(new ApiError(409, err.message));
      }
      next(new ApiError(400, err.message || 'User creation failed'));
    }
  },
);

router.get('/', auth(MANAGE_USERS), async (req: Request, res: Response) => {
  const db = req.app.locals.db;
  const search = (req.query.search as string) || '';
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const users = await findUsers(db, search, page, limit);
  await Promise.all(
    users.map(async (user) => {
      if (user.structure) {
        const struct = await findStructureById(db, user.structure.toString());
        if (struct) user.structure = struct;
      }
      delete user.password;
    }),
  );
  res.json(users);
});

router.delete(
  '/:id',
  auth(MANAGE_USERS),
  checkId(),
  async (req: Request, res: Response) => {
    const db = req.app.locals.db;
    await deleteUserById(db, req.params.id);
    res.json({ message: 'User deleted' });
  },
);

router.get(
  '/me',
  auth(),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    const user = await findUserById(db, req.user!.id);
    if (!user) return next(notFound('User not found'));
    if (user.structure) {
      const struct = await findStructureById(db, user.structure.toString());
      if (struct) user.structure = struct;
    }
    delete user.password;
    res.json(user);
  },
);

router.put(
  '/me',
  auth(),
  updateUserValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    const existingUser = await findUserById(db, req.user!.id);
    if (!existingUser) return next(notFound('User not found'));
    const allowed = ['firstName', 'lastName', 'email', 'password'];
    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    const currentPreferences = existingUser.preferences
      ? mergePreferences(undefined, existingUser.preferences)
      : DEFAULT_USER_PREFERENCES;
    const preferencesUpdate = req.body.preferences as
      | Partial<User['preferences']>
      | undefined;

    if (preferencesUpdate !== undefined) {
      data.preferences = mergePreferences(preferencesUpdate, existingUser.preferences);
    } else if (!existingUser.preferences) {
      data.preferences = currentPreferences;
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password as string, 10);
    }
    const updated = await updateUser(db, req.user!.id, data);
    if (!updated) return next(notFound('User not found'));
    const changedFields: string[] = [];
    if (data.email !== undefined && data.email !== existingUser.email) {
      changedFields.push('adresse e-mail');
    }
    if (data.password !== undefined) {
      changedFields.push('mot de passe');
    }
    if (data.role !== undefined && data.role !== existingUser.role) {
      changedFields.push('rôle');
    }
    if (
      data.preferences !== undefined &&
      JSON.stringify(data.preferences) !== JSON.stringify(currentPreferences)
    ) {
      changedFields.push('préférences');
    }
    if (updated.structure) {
      const struct = await findStructureById(db, updated.structure.toString());
      if (struct) updated.structure = struct;
    }
    delete updated.password;
    await notifyAccountUpdate(updated, changedFields);
    res.json(updated);
  },
);

router.put(
  '/:id',
  auth(MANAGE_USERS),
  checkId(),
  adminUpdateUserValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    const existingUser = await findUserById(db, req.params.id);
    if (!existingUser) return next(notFound('User not found'));

    const allowed = [
      'username',
      'firstName',
      'lastName',
      'email',
      'password',
      'role',
      'structure',
    ];
    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    const currentPreferences = existingUser.preferences
      ? mergePreferences(undefined, existingUser.preferences)
      : DEFAULT_USER_PREFERENCES;
    const preferencesUpdate = req.body.preferences as
      | Partial<User['preferences']>
      | undefined;

    if (preferencesUpdate !== undefined) {
      data.preferences = mergePreferences(preferencesUpdate, existingUser.preferences);
    } else if (!existingUser.preferences) {
      data.preferences = currentPreferences;
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password as string, 10);
    }

    const updated = await updateUser(db, req.params.id, data);
    if (!updated) return next(notFound('User not found'));

    const changedFields: string[] = [];
    if (data.username !== undefined && data.username !== existingUser.username) {
      changedFields.push("nom d'utilisateur");
    }
    if (data.firstName !== undefined && data.firstName !== existingUser.firstName) {
      changedFields.push('prénom');
    }
    if (data.lastName !== undefined && data.lastName !== existingUser.lastName) {
      changedFields.push('nom');
    }
    if (data.email !== undefined && data.email !== existingUser.email) {
      changedFields.push('adresse e-mail');
    }
    if (data.password !== undefined) {
      changedFields.push('mot de passe');
    }
    if (data.role !== undefined && data.role !== existingUser.role) {
      changedFields.push('rôle');
    }
    if (
      data.structure !== undefined &&
      data.structure?.toString() !== existingUser.structure?.toString()
    ) {
      changedFields.push('structure');
    }
    if (
      data.preferences !== undefined &&
      JSON.stringify(data.preferences) !== JSON.stringify(currentPreferences)
    ) {
      changedFields.push('préférences');
    }

    if (updated.structure) {
      const struct = await findStructureById(db, updated.structure.toString());
      if (struct) updated.structure = struct;
    }
    delete updated.password;
    await notifyAccountUpdate(updated, changedFields);
    res.json(updated);
  },
);

export default router;
