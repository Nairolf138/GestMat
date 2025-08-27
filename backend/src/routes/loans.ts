import express, { Request, Response, NextFunction } from 'express';
import {
  listLoans,
  createLoanRequest,
  updateLoanRequest,
  deleteLoanRequest,
} from '../services/loanService';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import checkId from '../middleware/checkObjectId';
import { createLoanValidator, updateLoanValidator } from '../validators/loanValidator';

const router = express.Router();

router.get('/', auth(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.app.locals.db;
    const loans = await listLoans(db, req.user!);
    res.json(loans);
  } catch (err) {
    next(err);
  }
});

router.post('/', auth(), createLoanValidator, validate, async (req: Request, res: Response, next: NextFunction) => {
  const db = req.app.locals.db;
  try {
    const loan = await createLoanRequest(db, req.body);
    res.json(loan);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth(), checkId(), updateLoanValidator, validate, async (req: Request, res: Response, next: NextFunction) => {
  const db = req.app.locals.db;
  try {
    const updated = await updateLoanRequest(db, req.user!, req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth(), checkId(), async (req: Request, res: Response, next: NextFunction) => {
  const db = req.app.locals.db;
  try {
    const result = await deleteLoanRequest(db, req.user!, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

