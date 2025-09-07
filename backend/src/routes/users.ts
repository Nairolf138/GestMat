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
import { updateUserValidator } from '../validators/userValidator';
import { notFound } from '../utils/errors';

const { MANAGE_USERS } = permissions;

const router = express.Router();

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
    const allowed = ['firstName', 'lastName', 'email', 'password'];
    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (data.password) {
      data.password = await bcrypt.hash(data.password as string, 10);
    }
    const updated = await updateUser(db, req.user!.id, data);
    if (!updated) return next(notFound('User not found'));
    if (updated.structure) {
      const struct = await findStructureById(db, updated.structure.toString());
      if (struct) updated.structure = struct;
    }
    delete updated.password;
    res.json(updated);
  },
);

export default router;
