const express = require('express');
const { getRoles } = require('../models/Role');

const router = express.Router();

router.get('/', async (req, res, next) => {
  const db = req.app.locals.db;
  try {
    const roles = await getRoles(db);
    res.json(roles.map((r) => r.name));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
