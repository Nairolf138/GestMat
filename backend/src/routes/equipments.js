const express = require('express');
const Equipment = require('../models/Equipment');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth(), async (req, res) => {
  const search = req.query.search || '';
  const filter = search
    ? { name: { $regex: search, $options: 'i' } }
    : {};
  const equipments = await Equipment.find(filter)
    .sort({ name: 1 })
    .populate('structure');
  res.json(equipments);
});

router.post('/', auth(), async (req, res) => {
  const equipment = await Equipment.create(req.body);
  res.json(equipment);
});

router.put('/:id', auth(), async (req, res) => {
  try {
    const updated = await Equipment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth(), async (req, res) => {
  try {
    const removed = await Equipment.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Equipment deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
