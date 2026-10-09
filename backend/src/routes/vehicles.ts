import express, { Request, Response, NextFunction } from 'express';
import { Condition, Filter, ObjectId } from 'mongodb';
import auth from '../middleware/auth';
import checkId from '../middleware/checkObjectId';
import validate from '../middleware/validate';
import permissions from '../config/permissions';
import logger from '../utils/logger';
import { badRequest, notFound, forbidden } from '../utils/errors';
import {
  canAssignVehicle,
  canManageVehicle,
  validateVehicleManagers,
  vehicleManagerIds,
  vehiclePermissions,
} from '../utils/vehicleAccess';
import { idOf, publicActor } from '../utils/loanLines';
import { ADMIN_ROLE, REGISSEUR_GENERAL_ROLE } from '../config/roles';
import {
  Vehicle,
  VehicleStatus,
  VEHICLE_STATUSES,
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

const vehicleFields = [
  'name',
  'type',
  'usage',
  'structure',
  'brand',
  'model',
  'registrationNumber',
  'status',
  'location',
  'characteristics',
  'maintenance',
  'insurance',
  'technicalInspection',
  'complianceDocuments',
  'kilometersTraveled',
  'downtimeDays',
  'notes',
  'managerIds',
];
function safeVehicleInput(body: any): any {
  if (Object.keys(body).some((key) => !vehicleFields.includes(key)))
    throw badRequest('Protected or unknown vehicle field');
  return { ...body };
}

const router = express.Router();
async function transaction(db: any, operation: any): Promise<any> {
  const session = db.client.startSession();
  try {
    let result: any;
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

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
  if (typeof query.status === 'string') {
    const status = query.status.toLowerCase();
    if (VEHICLE_STATUSES.includes(status as VehicleStatus)) {
      filter.status = status as Condition<VehicleStatus>;
    }
  }
  if (query.location) {
    filter.location = query.location as string;
  }
  if (query.structure && ObjectId.isValid(query.structure as string)) {
    filter.structure = new ObjectId(query.structure as string);
  }
  if (query.usage) {
    filter.usage = (query.usage as string).toLowerCase();
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

router.get(
  '/',
  auth(),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const filter = buildVehicleFilter(req.query);
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 0;
      const vehicles = await findVehicles(db, filter, page, limit);
      res.json(
        await Promise.all(
          vehicles.map(async (vehicle) => ({
            ...vehicle,
            permissions: await vehiclePermissions(db, req.user!, vehicle),
          })),
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/manager-candidates',
  auth(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;
      const vehicle =
        req.query.vehicleId && ObjectId.isValid(String(req.query.vehicleId))
          ? await findVehicleById(db, String(req.query.vehicleId))
          : { structure: req.user!.structure };
      if (!vehicle || !canAssignVehicle(req.user!, vehicle))
        throw forbidden('Access denied');
      const users = await db
        .collection('users')
        .find(
          {},
          {
            projection: {
              username: 1,
              firstName: 1,
              lastName: 1,
              role: 1,
              structure: 1,
            },
          },
        )
        .sort({ lastName: 1, firstName: 1 })
        .toArray();
      res.json(users.map(publicActor));
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
    const db = req.app.locals.db;
    try {
      const vehicle = await findVehicleById(db, req.params.id);
      if (!vehicle) return next(notFound('Vehicle not found'));
      res.json({
        ...vehicle,
        permissions: await vehiclePermissions(db, req.user!, vehicle),
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  auth(),
  createVehicleValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const data = safeVehicleInput(req.body);
      if (
        ![ADMIN_ROLE, REGISSEUR_GENERAL_ROLE].includes(req.user!.role) ||
        !canAssignVehicle(req.user!, data)
      )
        throw forbidden('Access denied');
      if (
        !data.structure ||
        !ObjectId.isValid(data.structure) ||
        !(await db
          .collection('structures')
          .findOne({ _id: new ObjectId(data.structure) }))
      )
        throw badRequest('Structure not found');
      const vehicle = await transaction(db, async (session: any) => {
        data.managerIds = await validateVehicleManagers(
          db,
          data.managerIds ?? (await vehicleManagerIds(db, data, session)),
          session,
        );
        return createVehicle(db, data, session);
      });
      logger.info('Vehicle created by %s', req.user?.id ?? 'unknown');
      res.json({
        ...vehicle,
        permissions: await vehiclePermissions(db, req.user!, vehicle),
      });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/:id',
  auth(),
  checkId(),
  updateVehicleValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const current = await findVehicleById(db, req.params.id);
      if (!current) throw notFound('Vehicle not found');
      const data = safeVehicleInput(req.body);
      if (
        data.structure !== undefined &&
        idOf(data.structure) !== idOf(current.structure) &&
        req.user!.role !== ADMIN_ROLE
      )
        throw forbidden('Only the administrator can transfer ownership');
      if (data.managerIds !== undefined) {
        if (!canAssignVehicle(req.user!, current))
          throw forbidden('Access denied');
        // Manager accounts are validated and locked inside the write transaction below.
        data.managerAssignmentSource = 'manual';
        data.managerReviewRequired = false;
      }
      if (
        Object.keys(req.body).some((key) => key !== 'managerIds') &&
        !(await canManageVehicle(db, req.user!, current))
      )
        throw forbidden('Access denied');
      const vehicle = await transaction(db, async (session: any) => {
        if (data.managerIds !== undefined)
          data.managerIds = await validateVehicleManagers(
            db,
            req.body.managerIds,
            session,
          );
        return updateVehicle(db, req.params.id, data, session);
      });
      if (!vehicle) return next(notFound('Vehicle not found'));
      logger.info(
        'Vehicle %s updated by %s',
        req.params.id,
        req.user?.id ?? 'unknown',
      );
      res.json({
        ...vehicle,
        permissions: await vehiclePermissions(db, req.user!, vehicle),
      });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id',
  auth(),
  checkId(),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const removed = await transaction(db, async (session: any) => {
        const current = await db
          .collection('vehicles')
          .findOne({ _id: new ObjectId(req.params.id) }, { session });
        if (!current) throw notFound('Vehicle not found');
        if (!(await canManageVehicle(db, req.user!, current, session)))
          throw forbidden('Access denied');
        const active = await db.collection('loanrequests').findOne(
          {
            archived: { $ne: true },
            status: { $nin: ['refused', 'cancelled'] },
            endDate: { $gte: new Date() },
            items: {
              $elemMatch: {
                vehicle: new ObjectId(req.params.id),
                'decision.status': { $nin: ['refused', 'cancelled'] },
              },
            },
          },
          { session },
        );
        if (active)
          throw badRequest(
            'Vehicle has active requests; retire it instead of deleting it',
          );
        return deleteVehicle(db, req.params.id, session);
      });
      if (!removed) return next(notFound('Vehicle not found'));
      logger.info(
        'Vehicle %s removed by %s',
        req.params.id,
        req.user?.id ?? 'unknown',
      );
      res.json({ message: 'Vehicle deleted' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
