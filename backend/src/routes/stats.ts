import express, { Request, Response, NextFunction } from 'express';
import auth from '../middleware/auth';
import permissions from '../config/permissions';
import { badRequest } from '../utils/errors';

const { MANAGE_STATS } = permissions;

const router = express.Router();

const normalizeDateQueryParam = (
  param: unknown,
): string | string[] | undefined => {
  if (typeof param === 'string') return param;
  if (Array.isArray(param) && param.every((value) => typeof value === 'string')) {
    return param as string[];
  }
  return undefined;
};

const extractDateValue = (value?: string | string[]): string | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

const normalizeDateRange = (
  from?: string | string[],
  to?: string | string[],
): { fromDate?: Date; toDate?: Date } => {
  const fromDateValue = extractDateValue(from);
  const toDateValue = extractDateValue(to);
  const fromDate = fromDateValue ? new Date(fromDateValue) : undefined;
  const toDate = toDateValue ? new Date(toDateValue) : undefined;

  if (fromDate && Number.isNaN(fromDate.getTime())) {
    throw badRequest('Invalid from date');
  }
  if (toDate && Number.isNaN(toDate.getTime())) {
    throw badRequest('Invalid to date');
  }
  if (fromDate && toDate && fromDate > toDate) {
    throw badRequest('Invalid date range');
  }

  return { fromDate, toDate };
};

const resolveDateRange = (
  from?: unknown,
  to?: unknown,
): { from?: string | string[]; to?: string | string[]; fromDate?: Date; toDate?: Date } => {
  const normalizedFrom = normalizeDateQueryParam(from);
  const normalizedTo = normalizeDateQueryParam(to);
  const { fromDate, toDate } = normalizeDateRange(normalizedFrom, normalizedTo);

  return { from: normalizedFrom, to: normalizedTo, fromDate, toDate };
};

router.get(
  '/loans',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const agg = await db
        .collection('loanrequests')
        .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        .toArray();
      res.json(agg);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/summary',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    try {
      const [activeUsers, ongoingLoans, completedLoansThisYear, totalEquipment] =
        await Promise.all([
          db
            .collection('sessions')
            .distinct('userId')
            .then((users: string[]) => users.length),
          db.collection('loanrequests').countDocuments({
            status: 'accepted',
            startDate: { $lte: now },
            endDate: { $gte: now },
            archived: { $ne: true },
          }),
          db.collection('loanrequests').countDocuments({
            status: 'accepted',
            endDate: { $gte: startOfYear, $lte: now },
            archived: { $ne: true },
          }),
          db.collection('equipments').countDocuments(),
        ]);

      res.json({
        activeUsers,
        ongoingLoans,
        completedLoansThisYear,
        totalEquipment,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/loans/monthly',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const from = req.query.from
        ? new Date(req.query.from as string)
        : undefined;
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

      type MonthlyCount = { _id: string; count: number };

      const agg = (await db
        .collection('loanrequests')
        .aggregate(pipeline)
        .toArray()) as MonthlyCount[];

      // ensure months with zero counts are included
      const result: MonthlyCount[] = [];
      const counts = new Map<string, number>(
        agg.map(({ _id, count }) => [_id, count] as const),
      );

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

const buildDateMatch = (
  from?: string | string[],
  to?: string | string[],
  field = 'startDate',
): Record<string, unknown> | undefined => {
  const match: Record<string, Date> = {};
  const { fromDate, toDate } = normalizeDateRange(from, to);

  if (fromDate) match.$gte = fromDate;
  if (toDate) match.$lte = toDate;

  if (!Object.keys(match).length) return undefined;
  return { [field]: match };
};

const buildReservationOverlapMatch = (
  fromDate?: Date,
  toDate?: Date,
): Record<string, unknown> | undefined => {
  if (!fromDate && !toDate) return undefined;

  const dateConditions: Record<string, unknown> = {};

  if (fromDate) dateConditions.end = { $gte: fromDate };
  if (toDate) dateConditions.start = { $lte: toDate };

  return { reservations: { $elemMatch: dateConditions } };
};

router.get(
  '/loans/duration',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const from = req.query.from
        ? new Date(req.query.from as string)
        : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;
      const needMedian =
        req.query.median === 'true' || req.query.median === '1';

      const match: any = {
        startDate: { $exists: true },
        endDate: { $exists: true },
      };
      if (from || to) {
        match.startDate = { ...match.startDate };
        if (from) match.startDate.$gte = from;
        if (to) match.startDate.$lte = to;
      }

      const pipeline: any[] = [{ $match: match }];
      pipeline.push({
        $project: {
          duration: {
            $divide: [
              { $subtract: ['$endDate', '$startDate'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      });

      if (needMedian) {
        pipeline.push({
          $group: {
            _id: null,
            avgDuration: { $avg: '$duration' },
            durations: { $push: '$duration' },
          },
        });
      } else {
        pipeline.push({
          $group: { _id: null, avgDuration: { $avg: '$duration' } },
        });
      }

      const agg = await db
        .collection('loanrequests')
        .aggregate(pipeline)
        .toArray();
      const avg = agg[0]?.avgDuration || 0;
      const result: any = { average: avg };

      if (needMedian) {
        const arr: number[] = agg[0]?.durations || [];
        arr.sort((a, b) => a - b);
        let median = 0;
        if (arr.length) {
          const mid = Math.floor(arr.length / 2);
          median =
            arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
        }
        result.median = median;
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/equipments/top',
  auth(MANAGE_STATS),
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

router.get(
  '/structures/top-lenders',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    const limit = parseInt(req.query.limit as string, 10) || 5;
    try {
      const from = normalizeDateQueryParam(req.query.from);
      const to = normalizeDateQueryParam(req.query.to);
      const match = buildDateMatch(from, to);
      const pipeline: any[] = [];
      if (match) pipeline.push({ $match: match });

      pipeline.push(
        { $group: { _id: '$owner', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'structures',
            localField: '_id',
            foreignField: '_id',
            as: 'structure',
          },
        },
        { $unwind: '$structure' },
        { $project: { _id: 1, count: 1, name: '$structure.name' } },
      );

      const agg = await db.collection('loanrequests').aggregate(pipeline).toArray();
      res.json(agg);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/structures/top-borrowers',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    const limit = parseInt(req.query.limit as string, 10) || 5;
    try {
      const from = normalizeDateQueryParam(req.query.from);
      const to = normalizeDateQueryParam(req.query.to);
      const match = buildDateMatch(from, to);
      const pipeline: any[] = [];
      if (match) pipeline.push({ $match: match });

      pipeline.push(
        { $group: { _id: '$borrower', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'structures',
            localField: '_id',
            foreignField: '_id',
            as: 'structure',
          },
        },
        { $unwind: '$structure' },
        { $project: { _id: 1, count: 1, name: '$structure.name' } },
      );

      const agg = await db.collection('loanrequests').aggregate(pipeline).toArray();
      res.json(agg);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/logins/monthly',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const from = normalizeDateQueryParam(req.query.from);
      const to = normalizeDateQueryParam(req.query.to);
      const match = buildDateMatch(from, to, 'createdAt');

      const pipeline: any[] = [];
      if (match) pipeline.push({ $match: match });

      pipeline.push(
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      );

      type MonthlyCount = { _id: string; count: number };
      const agg = (await db
        .collection('sessions')
        .aggregate(pipeline)
        .toArray()) as MonthlyCount[];

      const result: MonthlyCount[] = [];
      const counts = new Map<string, number>(
        agg.map(({ _id, count }) => [_id, count] as const),
      );

      const fromDateValue = extractDateValue(from);
      const toDateValue = extractDateValue(to);
      const fromDate = fromDateValue ? new Date(fromDateValue) : undefined;
      const toDate = toDateValue ? new Date(toDateValue) : undefined;

      const start = fromDate
        ? new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)
        : agg[0]
          ? new Date(`${agg[0]._id}-01`)
          : undefined;
      const end = toDate
        ? new Date(toDate.getFullYear(), toDate.getMonth(), 1)
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
  '/vehicles/status',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const { fromDate, toDate } = resolveDateRange(req.query.from, req.query.to);
      const reservationMatch = buildReservationOverlapMatch(fromDate, toDate);
      const pipeline: any[] = [];
      if (reservationMatch) pipeline.push({ $match: reservationMatch });

      pipeline.push(
        {
          $group: {
            _id: { $toLower: { $toString: { $ifNull: ['$status', 'unknown'] } } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      );

      const agg = await db.collection('vehicles').aggregate(pipeline).toArray();
      res.json(agg);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/vehicles/usage',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const agg = await db
        .collection('vehicles')
        .aggregate([
          {
            $project: {
              usage: { $toLower: { $toString: { $ifNull: ['$usage', 'unknown'] } } },
            },
          },
          {
            $group: {
              _id: '$usage',
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
  '/vehicles/occupancy',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const { fromDate, toDate } = resolveDateRange(req.query.from, req.query.to);

      if (!fromDate || !toDate) {
        throw badRequest('Query parameters "from" and "to" are required');
      }

      const reservationMatch = buildReservationOverlapMatch(fromDate, toDate);

      const [reservedVehicles, totalVehicles] = await Promise.all([
        db.collection('vehicles').countDocuments(reservationMatch ?? {}),
        db.collection('vehicles').countDocuments(),
      ]);

      const ratio = totalVehicles ? reservedVehicles / totalVehicles : 0;

      res.json({ reserved: reservedVehicles, total: totalVehicles, ratio });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/vehicles/mileage',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const [result] = await db
        .collection('vehicles')
        .aggregate([
          {
            $group: {
              _id: null,
              totalKilometers: { $sum: { $ifNull: ['$kilometersTraveled', 0] } },
              totalDowntimeDays: { $sum: { $ifNull: ['$downtimeDays', 0] } },
            },
          },
        ])
        .toArray();

      res.json({
        totalKilometers: result?.totalKilometers ?? 0,
        totalDowntimeDays: result?.totalDowntimeDays ?? 0,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
