const express = require('express');
const bcrypt = require('bcryptjs');
const { findUsers, deleteUserById, findUserById, updateUser } = require('../models/User');
const { findStructureById } = require('../models/Structure');
const auth = require('../middleware/auth');
const { ADMIN_ROLE } = require('../config/roles');
const validate = require('../middleware/validate');
const checkId = require('../middleware/checkObjectId');
const { updateUserValidator } = require('../validators/userValidator');
const { notFound } = require('../utils/errors');

const router = express.Router();

router.get('/', auth(ADMIN_ROLE), async (req, res) => {
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

router.delete('/:id', auth(ADMIN_ROLE), checkId(), async (req, res) => {
  const db = req.app.locals.db;
  await deleteUserById(db, req.params.id);
  res.json({ message: 'User deleted' });
});

router.get('/me', auth(), async (req, res, next) => {
  const db = req.app.locals.db;
  const user = await findUserById(db, req.user.id);
  if (!user) return next(notFound('User not found'));
  if (user.structure) {
    user.structure = await findStructureById(db, user.structure);
  }
  delete user.password;
  res.json(user);
});

router.put('/me', auth(), updateUserValidator, validate, async (req, res, next) => {
  const db = req.app.locals.db;
  const allowed = ['firstName', 'lastName', 'email', 'password'];
  const data = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  const updated = await updateUser(db, req.user.id, data);
  if (!updated) return next(notFound('User not found'));
  if (updated.structure) {
    updated.structure = await findStructureById(db, updated.structure);
  }
  delete updated.password;
  res.json(updated);
});

module.exports = router;
