const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth('admin'), async (req, res) => {
  const users = await User.find().populate('structure');
  const sanitized = users.map((u) => {
    const { password: _pw, ...data } = u.toObject();
    return data;
  });
  res.json(sanitized);
});

router.delete('/:id', auth('admin'), async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;
