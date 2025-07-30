const express = require('express');
const {
  findEquipments,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} = require('../models/Equipment');
const { findStructureById } = require('../models/Structure');
const { findUserById } = require('../models/User');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');
const createEquipmentFilter = require('../utils/createEquipmentFilter');
const validate = require('../middleware/validate');
const {
  createEquipmentValidator,
  updateEquipmentValidator,
} = require('../validators/equipmentValidator');

const router = express.Router();

router.get('/', auth(), async (req, res) => {
  const db = req.app.locals.db;
  const filter = createEquipmentFilter(req.query);
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
  if (ObjectId.isValid(req.user.id)) {
    const user = await findUserById(db, req.user.id);
    if (user && user.structure) {
      const struct = await findStructureById(db, user.structure);
      location = struct?.name || '';
    }
  }
  const equipment = await createEquipment(db, { ...req.body, location });
  res.json(equipment);
});

router.put('/:id', auth(), updateEquipmentValidator, validate, async (req, res) => {
  try {
    const db = req.app.locals.db;
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
    const removed = await deleteEquipment(db, req.params.id);
    if (!removed) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Equipment deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
