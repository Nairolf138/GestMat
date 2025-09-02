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

router.get(
  '/loans/monthly',
  auth(),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const agg = await db
        .collection('loanrequests')
        .aggregate([
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m', date: '$startDate' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();
      res.json(agg);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/equipments/top',
  auth(),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    const limit = parseInt(req.query.limit as string, 10) || 5;
    try {
      const agg = await db
        .collection('loanrequests')
        .aggregate([
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.equipment',
              count: { $sum: '$items.quantity' },
            },
          },
          { $sort: { count: -1 } },
          { $limit: limit },
        ])
        .toArray();
      res.json(agg);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
