const express = require('express');
const Structure = require('../models/Structure');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth(), async (req, res) => {
  const structures = await Structure.find();
  res.json(structures);
});

router.post('/', auth('admin'), async (req, res) => {
  const structure = await Structure.create({ name: req.body.name });
  res.json(structure);
});

module.exports = router;
