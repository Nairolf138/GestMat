import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

import validate from '../middleware/validate';
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  forgotUsernameValidator,
  resetPasswordValidator,
} from '../validators/userValidator';
import ROLES, { ADMIN_ROLE, AUTRE_ROLE } from '../config/roles';

const DEFAULT_ROLE = AUTRE_ROLE;
const ALLOWED_ROLES = ROLES.filter((r) => r !== ADMIN_ROLE);

import { API_PREFIX, API_URL, JWT_SECRET, NOTIFY_EMAIL } from '../config';
import { cookieOptions } from '../utils/cookieOptions';
import { createUser, findUserByEmail, findUserById, findUserByUsername, updateUser } from '../models/User';
import { findStructureById } from '../models/Structure';
import {
  createSession,
  findSessionByToken,
  deleteSessionByToken,
  deleteSessionsByUser,
  hashToken,
} from '../models/Session';
import {
  createPasswordReset,
  deletePasswordResetById,
  deletePasswordResetsByUser,
  findValidPasswordReset,
} from '../models/PasswordReset';
import { unauthorized, ApiError } from '../utils/errors';
import { AuthUser } from '../types';
import { normalizeRole } from '../utils/roleAccess';
import { sendMail } from '../utils/sendMail';
import logger from '../utils/logger';
import {
  accountCreationTemplate,
  passwordResetTemplate,
  usernameReminderTemplate,
} from '../utils/mailTemplates';
import { isNotificationEnabled } from '../utils/notificationPreferences';
import crypto from 'crypto';

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset attempts, please try again later.',
});

const usernameReminderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many username reminder attempts, please try again later.',
});

const buildResetUrl = (token: string): string => {
  try {
    const url = new URL(API_URL);
    if (API_PREFIX && url.pathname.endsWith(API_PREFIX)) {
      url.pathname = url.pathname.slice(0, -API_PREFIX.length) || '/';
    }
    url.pathname = `${url.pathname.replace(/\/$/, '')}/reset-password`;
    url.searchParams.set('token', token);
    return url.toString();
  } catch (error) {
    logger.error('Failed to build reset URL: %o', error);
    return `/reset-password?token=${encodeURIComponent(token)}`;
  }
};

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
        const recipients = [
          isNotificationEnabled(user, 'accountUpdates') ? email : undefined,
          NOTIFY_EMAIL,
        ].filter((value): value is string => Boolean(value));
        if (recipients.length) {
          const displayName =
            `${firstName ? `${firstName} ` : ''}${lastName ?? ''}`.trim() || username;
          const structureLabel = (structureData as any)?.name ?? structure ?? 'N/A';
          const { subject, text, html } = accountCreationTemplate({
            username,
            displayName,
            role,
            structure: structureLabel,
          });
          await sendMail({
            to: recipients.join(','),
            subject,
            text,
            html,
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
      const stayLoggedIn: boolean = req.body.stayLoggedIn ?? true;
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
        { id: user._id, role: user.role, stayLoggedIn },
        JWT_SECRET,
        { expiresIn: stayLoggedIn ? '7d' : '1d' },
      );
      const hashedRefreshToken = hashToken(refreshToken);
      await createSession(db, {
        token: hashedRefreshToken,
        userId: user._id!.toString(),
      });
      res.cookie('token', token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
      res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        ...(stayLoggedIn ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : {}),
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

      const stayLoggedIn = (payload as AuthUser).stayLoggedIn ?? true;
      const token = jwt.sign(
        { id: payload.id, role: payload.role },
        JWT_SECRET,
        { expiresIn: '1h' },
      );
      const newRefreshToken = jwt.sign(
        { id: payload.id, role: payload.role, stayLoggedIn },
        JWT_SECRET,
        { expiresIn: stayLoggedIn ? '7d' : '1d' },
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
        ...(stayLoggedIn ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : {}),
      });
      res.json({});
    } catch (err: any) {
      next(new ApiError(500, 'Server error'));
    }
  },
);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  forgotPasswordValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    const { identifier } = req.body;
    logger.info('Password reset requested: %s', identifier);
    try {
      const user =
        (await findUserByUsername(db, identifier)) ||
        (await findUserByEmail(db, identifier));

      if (!user?._id || !user.email) {
        return res.json({ message: 'If an account exists, a reset link will be sent.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await deletePasswordResetsByUser(db, user._id.toString());
      await createPasswordReset(db, {
        token,
        userId: user._id.toString(),
        expiresAt,
      });

      const displayName =
        `${user.firstName ? `${user.firstName} ` : ''}${user.lastName ?? ''}`.trim() || user.username;
      const resetLink = buildResetUrl(token);
      const { subject, text, html } = passwordResetTemplate({
        displayName,
        resetLink,
        expiresInHours: 1,
      });

      await sendMail({
        to: user.email,
        subject,
        text,
        html,
      });

      res.json({ message: 'If an account exists, a reset link will be sent.' });
    } catch (err: any) {
      logger.error('Failed to handle password reset request: %o', err);
      next(new ApiError(500, 'Unable to process password reset'));
    }
  },
);

router.post(
  '/forgot-username',
  usernameReminderLimiter,
  forgotUsernameValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    const { email } = req.body;
    logger.info('Username reminder requested for email: %s', email);
    try {
      const user = await findUserByEmail(db, email);

      if (user?.username && user.email) {
        const displayName =
          `${user.firstName ? `${user.firstName} ` : ''}${user.lastName ?? ''}`.trim() ||
          user.username;
        const { subject, text, html } = usernameReminderTemplate({
          displayName,
          username: user.username,
        });

        await sendMail({
          to: user.email,
          subject,
          text,
          html,
        });
        logger.info('Username reminder email sent to %s', email);
      } else {
        logger.info('Username reminder requested for unknown email: %s', email);
      }

      res.json({ message: 'If an account exists, username details will be sent.' });
    } catch (err) {
      logger.error('Failed to process username reminder: %o', err);
      next(new ApiError(500, 'Unable to process username reminder'));
    }
  },
);

router.post(
  '/reset-password',
  passwordResetLimiter,
  resetPasswordValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const { token, password } = req.body;
    const db = req.app.locals.db;
    try {
      const resetRequest = await findValidPasswordReset(db, token);
      if (!resetRequest) {
        return next(new ApiError(400, 'Invalid or expired reset token'));
      }

      const userId = resetRequest.userId.toString();
      const user = await findUserById(db, userId);
      if (!user) {
        await deletePasswordResetById(db, resetRequest._id!);
        return next(new ApiError(400, 'Invalid or expired reset token'));
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await updateUser(db, userId, { password: hashedPassword });
      await deletePasswordResetsByUser(db, userId);
      await deleteSessionsByUser(db, userId);
      logger.info('Password reset completed for user %s', userId);

      res.json({ message: 'Password updated' });
    } catch (err: any) {
      logger.error('Failed to reset password: %o', err);
      next(new ApiError(500, 'Unable to reset password'));
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
