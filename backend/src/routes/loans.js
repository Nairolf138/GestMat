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

module.exports = router;
