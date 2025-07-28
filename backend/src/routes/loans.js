const express = require('express');
const {
  findLoans,
  createLoan,
  updateLoan,
  deleteLoan,
} = require('../models/LoanRequest');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth(), async (req, res) => {
  const db = req.app.locals.db;
  const loans = await findLoans(db);
  res.json(loans);
});

router.post('/', auth(), async (req, res) => {
  const db = req.app.locals.db;
  const loan = await createLoan(db, req.body);
  res.json(loan);
});

router.put('/:id', auth(), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const updated = await updateLoan(db, req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth(), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const removed = await deleteLoan(db, req.params.id);
    if (!removed) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Loan request deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
