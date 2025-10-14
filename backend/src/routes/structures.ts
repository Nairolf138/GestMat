import express, { Request, Response, NextFunction } from 'express';
import {
  getStructures,
  createStructure,
  updateStructure,
  deleteStructure,
} from '../models/Structure';
import auth from '../middleware/auth';
import permissions from '../config/permissions';
import validate from '../middleware/validate';
import checkId from '../middleware/checkObjectId';
import { structureValidator } from '../validators/structureValidator';
import { badRequest, notFound } from '../utils/errors';

const { MANAGE_STRUCTURES } = permissions;

const router = express.Router();

router.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Expose structures list without authentication so new users can select a
// structure during registration. Other routes remain protected.
router.get('/', async (req: Request, res: Response) => {
  const db = req.app.locals.db;
  const structures = await getStructures(db);
  res.json(structures);
});

router.post(
  '/',
  auth(MANAGE_STRUCTURES),
  structureValidator,
  validate,
  async (req: Request, res: Response) => {
    const db = req.app.locals.db;
    const structure = await createStructure(db, { name: req.body.name });
    res.json(structure);
  },
);

router.put(
  '/:id',
  auth(MANAGE_STRUCTURES),
  checkId(),
  structureValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;
      const updated = await updateStructure(db, req.params.id, {
        name: req.body.name,
      });
      if (!updated) return next(notFound('Structure not found'));
      res.json(updated);
    } catch (err) {
      next(badRequest('Invalid request'));
    }
  },
);

router.delete(
  '/:id',
  auth(MANAGE_STRUCTURES),
  checkId(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;
      const removed = await deleteStructure(db, req.params.id);
      if (!removed) return next(notFound('Structure not found'));
      res.json({ message: 'Structure deleted' });
    } catch (err) {
      next(badRequest('Invalid request'));
    }
  },
);

export default router;
