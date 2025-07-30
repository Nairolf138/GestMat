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
const validate = require('../middleware/validate');
const {
  createEquipmentValidator,
  updateEquipmentValidator,
} = require('../validators/equipmentValidator');

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

router.post('/', auth(), createEquipmentValidator, validate, async (req, res) => {
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
    return res.status(403).json({ message: 'Access denied' });
  }
  const equipment = await createEquipment(db, { ...req.body, location, structure: structureId });
  res.json(equipment);
});

router.put('/:id', auth(), updateEquipmentValidator, validate, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const current = await findEquipmentById(db, req.params.id);
    if (!current) return res.status(404).json({ message: 'Not found' });
    const newType = req.body.type || current.type;
    if (!canModify(req.user.role, newType)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const updated = await updateEquipment(db, req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth(), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const current = await findEquipmentById(db, req.params.id);
    if (!current) return res.status(404).json({ message: 'Not found' });
    if (!canModify(req.user.role, current.type)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const removed = await deleteEquipment(db, req.params.id);
    if (!removed) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Equipment deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/:id/availability', auth(), async (req, res) => {
  const db = req.app.locals.db;
  const eq = await findEquipmentById(db, req.params.id);
  if (!eq) return res.status(404).json({ message: 'Not found' });
  const start = req.query.start ? new Date(req.query.start) : null;
  const end = req.query.end ? new Date(req.query.end) : null;
  const quantity = Number(req.query.quantity) || 1;

  let reserved = 0;
  if (start && end && !Number.isNaN(start) && !Number.isNaN(end)) {
    const agg = await db.collection('loanrequests').aggregate([
      {
        $match: {
          status: { $ne: 'refused' },
          startDate: { $lte: end },
          endDate: { $gte: start },
          items: { $elemMatch: { equipment: eq._id } },
        },
      },
      { $unwind: '$items' },
      { $match: { 'items.equipment': eq._id } },
      { $group: { _id: null, qty: { $sum: '$items.quantity' } } },
    ]).toArray();
    reserved = agg[0]?.qty || 0;
  }
  const availQty = eq.totalQty - reserved;
  res.json({ available: quantity <= availQty, availableQty: availQty });
});

module.exports = router;
