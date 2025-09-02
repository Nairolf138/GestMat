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
import validate from '../middleware/validate';
import checkId from '../middleware/checkObjectId';
import {
  createEquipmentValidator,
  updateEquipmentValidator,
} from '../validators/equipmentValidator';
import { forbidden, notFound, badRequest } from '../utils/errors';
import { checkEquipmentAvailability } from '../utils/checkAvailability';

const router = express.Router();

router.get('/', auth(), async (req: Request, res: Response) => {
  const db = req.app.locals.db;
  const query = req.query as any;
  let excludeStructure = '';
  if (!query.all && ObjectId.isValid(req.user!.id)) {
    const user = await findUserById(db, req.user!.id);
    if (user?.structure) excludeStructure = user.structure.toString();
  }
  const filter = createEquipmentFilter({ ...query, excludeStructure });
  const start = query.startDate ? new Date(query.startDate) : new Date();
  const end = query.endDate ? new Date(query.endDate) : start;
  const equipments = await findEquipments(db, filter as any);
  await Promise.all(
    equipments.map(async (eq) => {
      if (eq.structure) {
        const struct = await findStructureById(db, eq.structure.toString());
        if (struct) eq.structure = struct;
      }
      const avail = await checkEquipmentAvailability(
        db,
        eq._id,
        start,
        end,
        1
      );
      eq.availability = `${avail?.availableQty ?? 0}/${eq.totalQty || 0}`;
      delete eq.availableQty;
    })
  );
  res.json(equipments);
});

router.post('/', auth(), createEquipmentValidator, validate, async (req: Request, res: Response, next: NextFunction) => {
  const db = req.app.locals.db;
  let location = '';
  let structureId: ObjectId | null = null;
  if (ObjectId.isValid(req.user!.id)) {
    const user = await findUserById(db, req.user!.id);
    if (user && user.structure) {
      const struct = await findStructureById(db, user.structure.toString());
      location = (struct?.name as string) || '';
      structureId = user.structure instanceof ObjectId ? user.structure : null;
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
  });
  res.json(equipment);
});

router.put('/:id', auth(), checkId(), updateEquipmentValidator, validate, async (req: Request, res: Response, next: NextFunction) => {
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
    const updateData = req.body.type ? { ...req.body, type: newType } : req.body;
    const updated = await updateEquipment(db, req.params.id, updateData);
    if (!updated) return next(notFound('Equipment not found'));
    res.json(updated);
  } catch (err) {
    next(badRequest('Invalid request'));
  }
});

router.delete('/:id', auth(), checkId(), async (req: Request, res: Response, next: NextFunction) => {
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
});

router.get('/:id/availability', auth(), checkId(), async (req: Request, res: Response, next: NextFunction) => {
  const db = req.app.locals.db;
  const start = req.query.start ? new Date(req.query.start as string) : null;
  const end = req.query.end ? new Date(req.query.end as string) : null;
  const quantity = Number(req.query.quantity) || 1;
  const avail = await checkEquipmentAvailability(
    db,
    req.params.id,
    start,
    end,
    quantity
  );
  if (!avail) return next(notFound('Equipment not found'));
  res.json(avail);
});

export default router;
