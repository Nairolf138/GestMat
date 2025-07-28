const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const { JWT_SECRET } = process.env;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const { createUser, findUserByUsername } = require('../models/User');
const { findStructureById } = require('../models/Structure');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.'
});

router.post('/register', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { username, password, role, structure } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await createUser(db, { username, password: hashed, role, structure });
    const { password: _pw, ...userData } = user;
    res.json(userData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const user = await findUserByUsername(db, username);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.structure) {
      user.structure = await findStructureById(db, user.structure);
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
    const { password: _pw, ...userData } = user;
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
