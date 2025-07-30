const express = require('express');
const roles = require('../config/roles');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(roles);
});

module.exports = router;
