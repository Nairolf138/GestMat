const express = require('express');
const { findUsers, deleteUserById } = require('../models/User');
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

module.exports = router;
