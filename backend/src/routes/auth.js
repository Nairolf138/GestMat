const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const validate = require('../middleware/validate');
const {
  registerValidator,
  loginValidator,
} = require('../validators/userValidator');
const ROLES = require('../config/roles');
const { ADMIN_ROLE } = ROLES;

const DEFAULT_ROLE = 'Autre';
const ALLOWED_ROLES = ROLES.filter(r => r !== ADMIN_ROLE);

const { JWT_SECRET, NODE_ENV } = require('../config');
const { createUser, findUserByUsername } = require('../models/User');
const { findStructureById } = require('../models/Structure');
const {
  createSession,
  findSessionByToken,
  deleteSessionByToken,
  deleteSessionsByUser,
} = require('../models/Session');
const { unauthorized, ApiError } = require('../utils/errors');
const { normalizeRole } = require('../utils/roleAccess');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.'
});

router.post('/register', registerValidator, validate, async (req, res, next) => {
  const db = req.app.locals.db;
  try {
    let { username, password, role, structure, firstName, lastName, email } = req.body;
    role = normalizeRole(role);
    if (!ALLOWED_ROLES.includes(role)) {
      role = DEFAULT_ROLE;
    }
    if (structure) {
      const exists = await findStructureById(db, structure);
      if (!exists) {
        return next(new ApiError(400, 'Structure not found'));
      }
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
    res.json(userData);
  } catch (err) {
    if (err.message === 'Username already exists') {
      next(new ApiError(409, err.message));
    } else {
      next(new ApiError(400, err.message || 'Registration failed'));
    }
  }
});

router.post('/login', loginLimiter, loginValidator, validate, async (req, res, next) => {
  const db = req.app.locals.db;
  try {
    const { username, password } = req.body;
    const user = await findUserByUsername(db, username);
    if (!user) return next(unauthorized('Invalid credentials'));

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return next(unauthorized('Invalid credentials'));

    if (user.structure) {
      user.structure = await findStructureById(db, user.structure);
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    await deleteSessionsByUser(db, user._id);
    await createSession(db, { token: refreshToken, userId: user._id });
    const cookieOptions = {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
    };
    res.cookie('token', token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const { password: _pw, ...userData } = user;
    res.json({ user: userData });
  } catch (err) {
    next(new ApiError(500, 'Server error'));
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { refreshToken } = req.cookies;
    if (!refreshToken) return next(unauthorized('Refresh token required'));

    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_SECRET);
    } catch {
      return next(unauthorized('Invalid refresh token'));
    }

    const session = await findSessionByToken(db, refreshToken);
    if (!session) return next(unauthorized('Invalid refresh token'));

    const token = jwt.sign(
      { id: payload.id, role: payload.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const newRefreshToken = jwt.sign(
      { id: payload.id, role: payload.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    await createSession(db, { token: newRefreshToken, userId: payload.id });
    await deleteSessionByToken(db, refreshToken);
    const cookieOptions = {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
    };
    res.cookie('token', token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({});
  } catch (err) {
    next(new ApiError(500, 'Server error'));
  }
});

router.post('/logout', async (req, res) => {
  const db = req.app.locals.db;
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    await deleteSessionByToken(db, refreshToken).catch(() => {});
  }
  const cookieOptions = {
    httpOnly: true,
      secure: NODE_ENV === 'production',
    sameSite: 'strict',
  };
  res.clearCookie('token', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.sendStatus(204);
});

module.exports = router;
