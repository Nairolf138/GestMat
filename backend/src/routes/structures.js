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

router.put('/:id', auth('admin'), async (req, res) => {
  try {
    const updated = await Structure.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth('admin'), async (req, res) => {
  try {
    const removed = await Structure.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Structure deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
