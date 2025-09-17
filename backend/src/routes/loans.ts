import express, { Request, Response, NextFunction } from 'express';
import {
  listLoans,
  getLoanRequestById,
  createLoanRequest,
  updateLoanRequest,
  deleteLoanRequest,
} from '../services/loanService';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import checkId from '../middleware/checkObjectId';
import {
  createLoanValidator,
  updateLoanValidator,
} from '../validators/loanValidator';
import permissions from '../config/permissions';
import { notFound } from '../utils/errors';

const { MANAGE_LOANS } = permissions;

const router = express.Router();

router.get(
  '/',
  auth(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;
      const page = req.query.page
        ? parseInt(req.query.page as string)
        : undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const loans = await listLoans(db, req.user!, page, limit);
      res.json(loans);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id',
  auth(),
  checkId(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;
      const loan = await getLoanRequestById(db, req.params.id);
      if (!loan) {
        return next(notFound('Loan request not found'));
      }
      res.json(loan);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  auth(),
  createLoanValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const loan = await createLoanRequest(db, req.body, req.user!);
      res.json(loan);
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/:id',
  auth(MANAGE_LOANS),
  checkId(),
  updateLoanValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const updated = await updateLoanRequest(
        db,
        req.user!,
        req.params.id,
        req.body,
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id',
  auth(MANAGE_LOANS),
  checkId(),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const result = await deleteLoanRequest(db, req.user!, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
