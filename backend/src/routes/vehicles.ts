import express, { Request, Response, NextFunction } from 'express';
import { Filter } from 'mongodb';
import auth from '../middleware/auth';
import checkId from '../middleware/checkObjectId';
import validate from '../middleware/validate';
import permissions from '../config/permissions';
import logger from '../utils/logger';
import { badRequest, notFound } from '../utils/errors';
import {
  Vehicle,
  buildAvailabilityFilter,
  createVehicle,
  deleteVehicle,
  findVehicleById,
  findVehicles,
  updateVehicle,
} from '../models/Vehicle';
import {
  createVehicleValidator,
  updateVehicleValidator,
} from '../validators/vehicleValidator';

const { MANAGE_VEHICLES } = permissions;

const router = express.Router();

function buildVehicleFilter(query: any): Filter<Vehicle> {
  const filter: Filter<Vehicle> = {};
  if (query.search) {
    const searchRegex = new RegExp(query.search as string, 'i');
    filter.$or = [
      { name: searchRegex },
      { brand: searchRegex },
      { model: searchRegex },
      { registrationNumber: searchRegex },
    ];
  }
  if (query.status) {
    filter.status = query.status as string;
  }
  if (query.location) {
    filter.location = query.location as string;
  }
  if (query.availableStart && query.availableEnd) {
    const start = new Date(query.availableStart as string);
    const end = new Date(query.availableEnd as string);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw badRequest('Invalid availability range');
    }
    filter.$and = [...(filter.$and || []), buildAvailabilityFilter(start, end)];
  }
  return filter;
}

router.get('/', auth(), async (req: Request, res: Response, next: NextFunction) => {
  const db = req.app.locals.db;
  try {
    const filter = buildVehicleFilter(req.query);
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 0;
    const vehicles = await findVehicles(db, filter, page, limit);
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
});

router.get(
  '/:id',
  auth(),
  checkId(),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const vehicle = await findVehicleById(db, req.params.id);
      if (!vehicle) return next(notFound('Vehicle not found'));
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  auth({ permissions: MANAGE_VEHICLES, action: 'vehicles:create' }),
  createVehicleValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const vehicle = await createVehicle(db, req.body);
      logger.info('Vehicle created by %s', req.user?.id ?? 'unknown');
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/:id',
  auth({ permissions: MANAGE_VEHICLES, action: 'vehicles:update' }),
  checkId(),
  updateVehicleValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const vehicle = await updateVehicle(db, req.params.id, req.body);
      if (!vehicle) return next(notFound('Vehicle not found'));
      logger.info('Vehicle %s updated by %s', req.params.id, req.user?.id ?? 'unknown');
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id',
  auth({ permissions: MANAGE_VEHICLES, action: 'vehicles:delete' }),
  checkId(),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const removed = await deleteVehicle(db, req.params.id);
      if (!removed) return next(notFound('Vehicle not found'));
      logger.info('Vehicle %s removed by %s', req.params.id, req.user?.id ?? 'unknown');
      res.json({ message: 'Vehicle deleted' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
