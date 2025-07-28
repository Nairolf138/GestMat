const express = require('express');
const bcrypt = require('bcryptjs');
const { findUsers, deleteUserById, findUserById, updateUser } = require('../models/User');
const { findStructureById } = require('../models/Structure');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth('admin'), async (req, res) => {
  const db = req.app.locals.db;
  const users = await findUsers(db);
  for (const user of users) {
    if (user.structure) {
      user.structure = await findStructureById(db, user.structure);
    }
    delete user.password;
  }
  res.json(users);
});

router.delete('/:id', auth('admin'), async (req, res) => {
  const db = req.app.locals.db;
  await deleteUserById(db, req.params.id);
  res.json({ message: 'User deleted' });
});

router.get('/me', auth(), async (req, res) => {
  const db = req.app.locals.db;
  const user = await findUserById(db, req.user.id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  if (user.structure) {
    user.structure = await findStructureById(db, user.structure);
  }
  delete user.password;
  res.json(user);
});

router.put('/me', auth(), async (req, res) => {
  const db = req.app.locals.db;
  const data = { ...req.body };
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  const updated = await updateUser(db, req.user.id, data);
  if (!updated) return res.status(404).json({ message: 'Not found' });
  if (updated.structure) {
    updated.structure = await findStructureById(db, updated.structure);
  }
  delete updated.password;
  res.json(updated);
});

module.exports = router;
