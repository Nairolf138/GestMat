import express, { Request, Response, NextFunction } from 'express';
import {
  findEquipments,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  findEquipmentById,
} from '../models/Equipment';
import { findStructureById } from '../models/Structure';
import { findUserById } from '../models/User';
import { ObjectId } from 'mongodb';
import auth from '../middleware/auth';
import createEquipmentFilter from '../utils/createEquipmentFilter';
import { canModify, normalizeType } from '../utils/roleAccess';
import { ADMIN_ROLE } from '../config/roles';
import permissions from '../config/permissions';
import validate from '../middleware/validate';
import checkId from '../middleware/checkObjectId';
import {
  createEquipmentValidator,
  updateEquipmentValidator,
  defaultStatus,
} from '../validators/equipmentValidator';
import { forbidden, notFound, badRequest } from '../utils/errors';
import { checkEquipmentAvailability } from '../utils/checkAvailability';
import {
  EquipmentTypeFilter,
  generateEquipmentExport,
} from '../services/exportService';

const { MANAGE_EQUIPMENTS } = permissions;

const router = express.Router();

router.get('/', auth(), async (req: Request, res: Response) => {
  const db = req.app.locals.db;
  const query = req.query as any;
  let excludeStructure = '';
  if (!query.all && ObjectId.isValid(req.user!.id)) {
    const user = await findUserById(db, req.user!.id);
    if (user?.structure) excludeStructure = user.structure.toString();
  }
  const { search, type, location, structure } = query;
  const hideUnavailableStatuses =
    query.catalog === 'true' || query.catalog === true || query.catalog === '1';
  const filter = createEquipmentFilter({
    search,
    type,
    location,
    structure,
    excludeStructure,
    excludeStatuses: hideUnavailableStatuses
      ? ['HS', 'En maintenance']
      : undefined,
  });
  const page = query.page ? parseInt(query.page as string, 10) : 1;
  const limit = query.limit ? parseInt(query.limit as string, 10) : 0;
  const start = query.startDate ? new Date(query.startDate) : new Date();
  const end = query.endDate ? new Date(query.endDate) : start;
  const equipments = await findEquipments(db, filter as any, page, limit);
  await Promise.all(
    equipments.map(async (eq) => {
      if (eq.structure) {
        const struct = await findStructureById(db, eq.structure.toString());
        if (struct) eq.structure = struct;
      }
      const avail = await checkEquipmentAvailability(
        db,
        eq._id!.toString(),
        start,
        end,
        1,
      );
      if (!eq.status) eq.status = defaultStatus;
      eq.availability = `${avail?.availableQty ?? 0}/${eq.totalQty || 0}`;
      delete eq.availableQty;
    }),
  );
  res.json(equipments);
});

router.post(
  '/',
  auth({ permissions: MANAGE_EQUIPMENTS, action: 'equipments:create' }),
  createEquipmentValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    let location = '';
    let structureId: ObjectId | null = null;
    if (ObjectId.isValid(req.user!.id)) {
      const user = await findUserById(db, req.user!.id);
      if (user && user.structure) {
        const struct = await findStructureById(db, user.structure.toString());
        location = (struct?.name as string) || '';
        structureId =
          user.structure instanceof ObjectId ? user.structure : null;
      }
    }
    const type = normalizeType(req.body.type);
    if (!type || !canModify(req.user!.role, type)) {
      return next(forbidden('Access denied'));
    }
    const availableQty = req.body.availableQty ?? req.body.totalQty;
    const equipment = await createEquipment(db, {
      ...req.body,
      type,
      location,
      structure: structureId,
      availableQty,
      status: req.body.status || defaultStatus,
    });
    res.json(equipment);
  },
);

router.post(
  '/export',
  auth({ permissions: MANAGE_EQUIPMENTS, action: 'equipments:export' }),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const { type, format, email } = req.body || {};
      const allowedFormats = ['pdf', 'xlsx'];
      if (!allowedFormats.includes(format)) {
        return next(badRequest('Invalid format'));
      }
      const userId = req.user!.id;
      const user = await findUserById(db, userId);
      if (!user?.structure) {
        return next(forbidden('Access denied'));
      }
      const normalizedType =
        type && type !== 'Tous'
          ? normalizeType(type as string) ||
            ((type as string) === 'Autres' ? ('Autre' as EquipmentTypeFilter) : (type as EquipmentTypeFilter))
          : undefined;
      if (!canModify(req.user!.role, normalizedType)) {
        return next(forbidden('Access denied'));
      }
      if (email && !user.email) {
        return next(badRequest('Email address missing'));
      }
      const result = await generateEquipmentExport({
        db,
        userId,
        structureId: user.structure.toString(),
        type: (normalizedType as EquipmentTypeFilter) || type,
        format,
        email: Boolean(email),
      });
      res.contentType(result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      res.send(result.buffer);
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/:id',
  auth({ permissions: MANAGE_EQUIPMENTS, action: 'equipments:update' }),
  checkId(),
  updateEquipmentValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;
      const current = await findEquipmentById(db, req.params.id);
      if (!current) return next(notFound('Equipment not found'));
      let user;
      if (ObjectId.isValid(req.user!.id)) {
        user = await findUserById(db, req.user!.id);
      }
      if (
        req.user!.role !== ADMIN_ROLE &&
        current.structure?.toString() !== user?.structure?.toString()
      ) {
        return next(forbidden('Access denied'));
      }
      const newType = req.body.type
        ? normalizeType(req.body.type)
        : normalizeType(current.type as string);
      if (!newType || !canModify(req.user!.role, newType)) {
        return next(forbidden('Access denied'));
      }
      const updateData = req.body.type
        ? { ...req.body, type: newType }
        : req.body;
      const updated = await updateEquipment(db, req.params.id, updateData);
      if (!updated) return next(notFound('Equipment not found'));
      res.json(updated);
    } catch (err) {
      next(badRequest('Invalid request'));
    }
  },
);

router.delete(
  '/:id',
  auth({ permissions: MANAGE_EQUIPMENTS, action: 'equipments:delete' }),
  checkId(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;
      const current = await findEquipmentById(db, req.params.id);
      if (!current) return next(notFound('Equipment not found'));
      let user;
      if (ObjectId.isValid(req.user!.id)) {
        user = await findUserById(db, req.user!.id);
      }
      if (
        req.user!.role !== ADMIN_ROLE &&
        current.structure?.toString() !== user?.structure?.toString()
      ) {
        return next(forbidden('Access denied'));
      }
      const type = normalizeType(current.type as string);
      if (!canModify(req.user!.role, type)) {
        return next(forbidden('Access denied'));
      }
      const removed = await deleteEquipment(db, req.params.id);
      if (!removed) return next(notFound('Equipment not found'));
      res.json({ message: 'Equipment deleted' });
    } catch (err) {
      next(badRequest('Invalid request'));
    }
  },
);

router.get(
  '/:id/availability',
  auth(),
  checkId(),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    const start = req.query.start ? new Date(req.query.start as string) : null;
    const end = req.query.end ? new Date(req.query.end as string) : null;
    const quantity = Number(req.query.quantity) || 1;
    const avail = await checkEquipmentAvailability(
      db,
      req.params.id,
      start,
      end,
      quantity,
    );
    if (!avail) return next(notFound('Equipment not found'));
    res.json(avail);
  },
);

export default router;
