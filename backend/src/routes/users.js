const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth('admin'), async (req, res) => {
  const users = await User.find().populate('structure');
  res.json(users);
});

router.delete('/:id', auth('admin'), async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;
