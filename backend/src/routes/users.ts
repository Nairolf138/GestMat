import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { findUsers, deleteUserById, findUserById, updateUser } from '../models/User';
import { findStructureById } from '../models/Structure';
import auth from '../middleware/auth';
import PERMISSIONS from '../config/permissions';
import validate from '../middleware/validate';
import checkId from '../middleware/checkObjectId';
import { updateUserValidator } from '../validators/userValidator';
import { notFound } from '../utils/errors';

const { MANAGE_USERS } = PERMISSIONS;

interface AuthRequest extends Request {
  user: any;
}

const router = express.Router();

router.get('/', auth(MANAGE_USERS), async (req: AuthRequest, res: Response) => {
  const db = req.app.locals.db;
  const users = await findUsers(db);
  await Promise.all(
    users.map(async (user) => {
      if (user.structure) {
        user.structure = await findStructureById(db, user.structure);
      }
      delete user.password;
    })
  );
  res.json(users);
});

router.delete('/:id', auth(MANAGE_USERS), checkId(), async (req: AuthRequest, res: Response) => {
  const db = req.app.locals.db;
  await deleteUserById(db, req.params.id);
  res.json({ message: 'User deleted' });
});

router.get('/me', auth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  const db = req.app.locals.db;
  const user = await findUserById(db, req.user.id);
  if (!user) return next(notFound('User not found'));
  if (user.structure) {
    user.structure = await findStructureById(db, user.structure);
  }
  delete user.password;
  res.json(user);
});

router.put('/me', auth(), updateUserValidator, validate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const db = req.app.locals.db;
  const allowed = ['firstName', 'lastName', 'email', 'password'];
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  if (data.password) {
    data.password = await bcrypt.hash(data.password as string, 10);
  }
  const updated = await updateUser(db, req.user.id, data);
  if (!updated) return next(notFound('User not found'));
  if (updated.structure) {
    updated.structure = await findStructureById(db, updated.structure);
  }
  delete updated.password;
  res.json(updated);
});

export default router;
