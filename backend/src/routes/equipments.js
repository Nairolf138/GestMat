const express = require('express');
const Equipment = require('../models/Equipment');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth(), async (req, res) => {
  const equipments = await Equipment.find().populate('structure');
  res.json(equipments);
});

router.post('/', auth(), async (req, res) => {
  const equipment = await Equipment.create(req.body);
  res.json(equipment);
});

module.exports = router;
