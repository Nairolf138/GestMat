const express = require('express');
const {
  getStructures,
  createStructure,
  updateStructure,
  deleteStructure,
} = require('../models/Structure');
const auth = require('../middleware/auth');
const { MANAGE_STRUCTURES } = require('../config/permissions');
const validate = require('../middleware/validate');
const checkId = require('../middleware/checkObjectId');
const { structureValidator } = require('../validators/structureValidator');
const { ApiError, badRequest, notFound } = require('../utils/errors');

const router = express.Router();

// Expose structures list without authentication so new users can select a
// structure during registration. Other routes remain protected.
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const structures = await getStructures(db);
  res.json(structures);
});

router.post('/', auth(MANAGE_STRUCTURES), structureValidator, validate, async (req, res) => {
  const db = req.app.locals.db;
  const structure = await createStructure(db, { name: req.body.name });
  res.json(structure);
});

router.put('/:id', auth(MANAGE_STRUCTURES), checkId(), structureValidator, validate, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const updated = await updateStructure(db, req.params.id, { name: req.body.name });
    if (!updated) return next(notFound('Structure not found'));
    res.json(updated);
  } catch (err) {
    next(badRequest('Invalid request'));
  }
});

router.delete('/:id', auth(MANAGE_STRUCTURES), checkId(), async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const removed = await deleteStructure(db, req.params.id);
    if (!removed) return next(notFound('Structure not found'));
    res.json({ message: 'Structure deleted' });
  } catch (err) {
    next(badRequest('Invalid request'));
  }
});

module.exports = router;
