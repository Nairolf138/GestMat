import express, { Request, Response, NextFunction } from 'express';
import auth from '../middleware/auth';

const router = express.Router();

router.get('/loans', auth(), async (req: Request, res: Response, next: NextFunction) => {
  const db = req.app.locals.db;
  try {
    const agg = await db.collection('loanrequests').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray();
    res.json(agg);
  } catch (err) {
    next(err);
  }
});

export default router;
