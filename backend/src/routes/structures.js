const express = require('express');
const {
  getStructures,
  createStructure,
  updateStructure,
  deleteStructure,
} = require('../models/Structure');
const auth = require('../middleware/auth');
const { ADMIN_ROLE } = require('../config/roles');
const validate = require('../middleware/validate');
const { structureValidator } = require('../validators/structureValidator');

const router = express.Router();

// Expose structures list without authentication so new users can select a
// structure during registration. Other routes remain protected.
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const structures = await getStructures(db);
  res.json(structures);
});

router.post('/', auth(ADMIN_ROLE), structureValidator, validate, async (req, res) => {
  const db = req.app.locals.db;
  const structure = await createStructure(db, { name: req.body.name });
  res.json(structure);
});

router.put('/:id', auth(ADMIN_ROLE), structureValidator, validate, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const updated = await updateStructure(db, req.params.id, { name: req.body.name });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth(ADMIN_ROLE), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const removed = await deleteStructure(db, req.params.id);
    if (!removed) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Structure deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
