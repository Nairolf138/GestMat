const express = require('express');
const {
  findLoans,
  createLoan,
  updateLoan,
  deleteLoan,
} = require('../models/LoanRequest');
const auth = require('../middleware/auth');
const { sendMail } = require('../utils/sendMail');

const router = express.Router();

router.get('/', auth(), async (req, res) => {
  const db = req.app.locals.db;
  const loans = await findLoans(db);
  res.json(loans);
});

router.post('/', auth(), async (req, res) => {
  const db = req.app.locals.db;
  const loan = await createLoan(db, { ...req.body, status: 'pending' });
  try {
    await sendMail({
      to: process.env.NOTIFY_EMAIL || 'admin@example.com',
      subject: 'Nouvelle demande de prêt',
      text: `Demande de prêt de ${loan.borrower?.name || ''} pour ${loan.owner?.name || ''}`,
    });
  } catch (err) {
    console.error('mail error', err);
  }
  res.json(loan);
});

router.put('/:id', auth(), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const updated = await updateLoan(db, req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    if (req.body.status) {
      try {
        await sendMail({
          to: process.env.NOTIFY_EMAIL || 'admin@example.com',
          subject: `Demande ${req.body.status}`,
          text: `La demande ${updated._id} est maintenant ${req.body.status}`,
        });
      } catch (err) {
        console.error('mail error', err);
      }
    }
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
