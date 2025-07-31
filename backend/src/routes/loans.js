const express = require('express');
const {
  listLoans,
  createLoanRequest,
  updateLoanRequest,
  deleteLoanRequest,
} = require('../services/loanService');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const checkId = require('../middleware/checkObjectId');
const { createLoanValidator, updateLoanValidator } = require('../validators/loanValidator');

const router = express.Router();

router.get('/', auth(), async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const loans = await listLoans(db, req.user);
    res.json(loans);
  } catch (err) {
    next(err);
  }
});

router.post('/', auth(), createLoanValidator, validate, async (req, res, next) => {
  const db = req.app.locals.db;
  try {
    const loan = await createLoanRequest(db, req.body);
    res.json(loan);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth(), checkId(), updateLoanValidator, validate, async (req, res, next) => {
  const db = req.app.locals.db;
  try {
    const updated = await updateLoanRequest(db, req.user, req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth(), checkId(), async (req, res, next) => {
  const db = req.app.locals.db;
  try {
    const result = await deleteLoanRequest(db, req.user, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

