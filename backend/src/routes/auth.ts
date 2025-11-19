import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

import validate from '../middleware/validate';
import { registerValidator, loginValidator } from '../validators/userValidator';
import ROLES, { ADMIN_ROLE, AUTRE_ROLE } from '../config/roles';

const DEFAULT_ROLE = AUTRE_ROLE;
const ALLOWED_ROLES = ROLES.filter((r) => r !== ADMIN_ROLE);

import { JWT_SECRET } from '../config';
import { cookieOptions } from '../utils/cookieOptions';
import { createUser, findUserByUsername } from '../models/User';
import { findStructureById } from '../models/Structure';
import {
  createSession,
  findSessionByToken,
  deleteSessionByToken,
  deleteSessionsByUser,
  hashToken,
} from '../models/Session';
import { unauthorized, ApiError } from '../utils/errors';
import { AuthUser } from '../types';
import { normalizeRole } from '../utils/roleAccess';
import { sendMail } from '../utils/sendMail';
import logger from '../utils/logger';
import { NOTIFY_EMAIL } from '../config';

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
});

router.post(
  '/register',
  registerValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      let { username, password, role, structure, firstName, lastName, email } =
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
        firstName,
        lastName,
        email,
      });
      const { password: _pw, ...userData } = user;
      try {
        const recipients = [email, NOTIFY_EMAIL].filter(
          (value): value is string => Boolean(value),
        );
        if (recipients.length) {
          const displayName = `${firstName ? `${firstName} ` : ''}${lastName ?? ''}`.trim() ||
            username;
          const structureLabel = (structureData as any)?.name ?? structure ?? 'N/A';
          await sendMail({
            to: recipients.join(','),
            subject: 'Nouvel utilisateur créé sur GestMat',
            text: `Un nouvel utilisateur a été créé.\nNom: ${displayName}\nIdentifiant: ${username}\nStructure: ${structureLabel}\nRôle: ${role}`,
          });
        }
      } catch (mailError) {
        logger.error('Failed to send registration email: %o', mailError);
      }
      res.json(userData);
    } catch (err: any) {
      if (err.message === 'Username already exists') {
        next(new ApiError(409, err.message));
      } else {
        next(new ApiError(400, err.message || 'Registration failed'));
      }
    }
  },
);

router.post(
  '/login',
  loginLimiter,
  loginValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const { username, password } = req.body;
      const user = await findUserByUsername(db, username);
      if (!user) return next(unauthorized('Invalid credentials'));

      const valid = await bcrypt.compare(password, user.password!);
      if (!valid) return next(unauthorized('Invalid credentials'));

      if (user.structure) {
        const struct = await findStructureById(db, user.structure.toString());
        if (struct) user.structure = struct;
      }

      const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const refreshToken = jwt.sign(
        { id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' },
      );
      const hashedRefreshToken = hashToken(refreshToken);
      await deleteSessionsByUser(db, user._id!.toString());
      await createSession(db, {
        token: hashedRefreshToken,
        userId: user._id!.toString(),
      });
      res.cookie('token', token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
      res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      const { password: _pw, ...userData } = user;
      res.json({ user: userData });
    } catch (err: any) {
      next(new ApiError(500, 'Server error'));
    }
  },
);

router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;
      const { refreshToken } = req.cookies || {};
      if (!refreshToken) return next(unauthorized('Refresh token required'));

      let payload: AuthUser;
      try {
        payload = jwt.verify(refreshToken, JWT_SECRET) as AuthUser;
      } catch {
        return next(unauthorized('Invalid refresh token'));
      }

      const hashedRefreshToken = hashToken(refreshToken);
      const session = await findSessionByToken(db, hashedRefreshToken);
      if (!session) return next(unauthorized('Invalid refresh token'));

      const token = jwt.sign(
        { id: payload.id, role: payload.role },
        JWT_SECRET,
        { expiresIn: '1h' },
      );
      const newRefreshToken = jwt.sign(
        { id: payload.id, role: payload.role },
        JWT_SECRET,
        { expiresIn: '7d' },
      );
      const hashedNewRefreshToken = hashToken(newRefreshToken);
      await createSession(db, {
        token: hashedNewRefreshToken,
        userId: String(payload.id),
      });
      await deleteSessionByToken(db, hashedRefreshToken);
      res.cookie('token', token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
      res.cookie('refreshToken', newRefreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json({});
    } catch (err: any) {
      next(new ApiError(500, 'Server error'));
    }
  },
);

router.post('/logout', async (req: Request, res: Response) => {
  const db = req.app.locals.db;
  const { refreshToken } = req.cookies || {};
  if (refreshToken) {
    await deleteSessionByToken(db, hashToken(refreshToken)).catch(() => {});
  }
  res.clearCookie('token', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.sendStatus(204);
});

export default router;
