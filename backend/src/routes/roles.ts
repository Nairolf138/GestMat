import express, { Request, Response, NextFunction } from 'express';
import { getRoles } from '../models/Role';

const router = express.Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const db = req.app.locals.db;
  try {
    const roles = await getRoles(db);
    res.json(roles.map((r) => r.name));
  } catch (err) {
    next(err);
  }
});

export default router;
