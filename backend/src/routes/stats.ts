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
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;

      const pipeline: any[] = [];
      if (from || to) {
        const match: Record<string, Date> = {};
        if (from) match.$gte = from;
        if (to) match.$lte = to;
        pipeline.push({ $match: { startDate: match } });
      }

      pipeline.push(
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$startDate' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      );

      const agg = await db.collection('loanrequests').aggregate(pipeline).toArray();

      // ensure months with zero counts are included
      const result: { _id: string; count: number }[] = [];
      const counts = new Map(agg.map(({ _id, count }) => [_id, count]));

      const start = from
        ? new Date(from.getFullYear(), from.getMonth(), 1)
        : agg[0]
          ? new Date(`${agg[0]._id}-01`)
          : undefined;
      const end = to
        ? new Date(to.getFullYear(), to.getMonth(), 1)
        : agg[agg.length - 1]
          ? new Date(`${agg[agg.length - 1]._id}-01`)
          : start;

      if (start && end) {
        for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          result.push({ _id: key, count: counts.get(key) || 0 });
        }
      }

      res.json(result);
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
          {
            $lookup: {
              from: 'equipments',
              localField: '_id',
              foreignField: '_id',
              as: 'equipment',
            },
          },
          { $unwind: '$equipment' },
          {
            $project: {
              _id: 1,
              count: 1,
              name: '$equipment.name',
            },
          },
        ])
        .toArray();
      res.json(agg);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
