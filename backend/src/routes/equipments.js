const express = require('express');
const {
  findEquipments,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  findEquipmentById,
} = require('../models/Equipment');
const { findStructureById } = require('../models/Structure');
const { findUserById } = require('../models/User');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');
const createEquipmentFilter = require('../utils/createEquipmentFilter');
const { canModify } = require('../utils/roleAccess');
const { ADMIN_ROLE } = require('../config/roles');
const validate = require('../middleware/validate');
const checkId = require('../middleware/checkObjectId');
const {
  createEquipmentValidator,
  updateEquipmentValidator,
} = require('../validators/equipmentValidator');
const { ApiError, forbidden, notFound, badRequest } = require('../utils/errors');
const { checkEquipmentAvailability } = require('../utils/checkAvailability');

const router = express.Router();

router.get('/', auth(), async (req, res) => {
  const db = req.app.locals.db;
  let structure = req.query.structure;
  if (!req.query.all && !structure && ObjectId.isValid(req.user.id)) {
    const user = await findUserById(db, req.user.id);
    if (user && user.structure) structure = user.structure.toString();
  }
  const filter = createEquipmentFilter({ ...req.query, structure });
  const equipments = await findEquipments(db, filter);
  for (const eq of equipments) {
    if (eq.structure) {
      eq.structure = await findStructureById(db, eq.structure);
    }
  }
  res.json(equipments);
});

router.post('/', auth(), createEquipmentValidator, validate, async (req, res, next) => {
  const db = req.app.locals.db;
  let location = '';
  let structureId = null;
  if (ObjectId.isValid(req.user.id)) {
    const user = await findUserById(db, req.user.id);
    if (user && user.structure) {
      const struct = await findStructureById(db, user.structure);
      location = struct?.name || '';
      structureId = user.structure;
    }
  }
  if (!canModify(req.user.role, req.body.type)) {
    return next(forbidden('Access denied'));
  }
  const equipment = await createEquipment(db, { ...req.body, location, structure: structureId });
  res.json(equipment);
});

router.put('/:id', auth(), checkId(), updateEquipmentValidator, validate, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const current = await findEquipmentById(db, req.params.id);
    if (!current) return next(notFound('Equipment not found'));
    let user;
    if (ObjectId.isValid(req.user.id)) {
      user = await findUserById(db, req.user.id);
    }
    if (
      req.user.role !== ADMIN_ROLE &&
      current.structure?.toString() !== user?.structure?.toString()
    ) {
      return next(forbidden('Access denied'));
    }
    const newType = req.body.type || current.type;
    if (!canModify(req.user.role, newType)) {
      return next(forbidden('Access denied'));
    }
    const updated = await updateEquipment(db, req.params.id, req.body);
    if (!updated) return next(notFound('Equipment not found'));
    res.json(updated);
  } catch (err) {
    next(badRequest('Invalid request'));
  }
});

router.delete('/:id', auth(), checkId(), async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const current = await findEquipmentById(db, req.params.id);
    if (!current) return next(notFound('Equipment not found'));
    let user;
    if (ObjectId.isValid(req.user.id)) {
      user = await findUserById(db, req.user.id);
    }
    if (
      req.user.role !== ADMIN_ROLE &&
      current.structure?.toString() !== user?.structure?.toString()
    ) {
      return next(forbidden('Access denied'));
    }
    if (!canModify(req.user.role, current.type)) {
      return next(forbidden('Access denied'));
    }
    const removed = await deleteEquipment(db, req.params.id);
    if (!removed) return next(notFound('Equipment not found'));
    res.json({ message: 'Equipment deleted' });
  } catch (err) {
    next(badRequest('Invalid request'));
  }
});

router.get('/:id/availability', auth(), checkId(), async (req, res, next) => {
  const db = req.app.locals.db;
  const start = req.query.start ? new Date(req.query.start) : null;
  const end = req.query.end ? new Date(req.query.end) : null;
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

module.exports = router;
