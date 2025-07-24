const express = require('express');
const LoanRequest = require('../models/LoanRequest');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth(), async (req, res) => {
  const loans = await LoanRequest.find().populate('borrower owner items.equipment');
  res.json(loans);
});

router.post('/', auth(), async (req, res) => {
  const loan = await LoanRequest.create(req.body);
  res.json(loan);
});

router.put('/:id', auth(), async (req, res) => {
  try {
    const updated = await LoanRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('borrower owner items.equipment');
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth(), async (req, res) => {
  try {
    const removed = await LoanRequest.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Loan request deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
