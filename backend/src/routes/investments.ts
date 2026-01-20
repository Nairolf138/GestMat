import express, { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import checkId from '../middleware/checkObjectId';
import permissions from '../config/permissions';
import { ADMIN_ROLE } from '../config/roles';
import {
  createInvestmentPlanEntry,
  deleteInvestmentPlanEntry,
  getInvestmentPlanById,
  listInvestmentPlans,
  updateInvestmentPlanEntry,
} from '../services/investmentPlanService';
import {
  createInvestmentValidator,
  updateInvestmentValidator,
} from '../validators/investmentValidator';
import { badRequest, forbidden } from '../utils/errors';

const { MANAGE_INVESTMENTS } = permissions;

const normalizeId = (value?: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'toString' in value) {
    return (value as { toString: () => string }).toString();
  }
  return undefined;
};

const extractInvestmentStructure = (req: Request): string | undefined => {
  if (typeof req.body?.structure === 'string') return req.body.structure;
  if (typeof req.query?.structure === 'string') return req.query.structure;
  return normalizeId(req.user?.structure);
};

const ensureStructureAccess = (req: Request, structure?: unknown): void => {
  if (req.user?.role === ADMIN_ROLE) return;
  const userStructure = normalizeId(req.user?.structure);
  const targetStructure = normalizeId(structure);
  if (!userStructure || !targetStructure || userStructure !== targetStructure) {
    throw forbidden('Access denied');
  }
};

const router = express.Router();

router.get(
  '/',
  auth({
    permissions: MANAGE_INVESTMENTS,
    action: 'investments:list',
    getStructureId: extractInvestmentStructure,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const filter: Record<string, unknown> = {};
      const structureQuery =
        typeof req.query.structure === 'string' ? req.query.structure : undefined;
      if (structureQuery) {
        if (!ObjectId.isValid(structureQuery)) {
          throw badRequest('Invalid structure id');
        }
        filter.structure = new ObjectId(structureQuery);
      } else if (req.user?.role !== ADMIN_ROLE && req.user?.structure) {
        if (!ObjectId.isValid(req.user.structure)) {
          throw badRequest('Invalid user structure');
        }
        filter.structure = new ObjectId(req.user.structure);
      }
      if (typeof req.query.targetYear === 'string') {
        filter.targetYear = req.query.targetYear;
      }
      const plans = await listInvestmentPlans(db, filter);
      res.json(plans);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id',
  auth({
    permissions: MANAGE_INVESTMENTS,
    action: 'investments:read',
    getStructureId: extractInvestmentStructure,
  }),
  checkId(),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const plan = await getInvestmentPlanById(db, req.params.id);
      ensureStructureAccess(req, plan.structure);
      res.json(plan);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  auth({
    permissions: MANAGE_INVESTMENTS,
    action: 'investments:create',
    getStructureId: extractInvestmentStructure,
  }),
  createInvestmentValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const structureId = req.body.structure ?? req.user?.structure;
      ensureStructureAccess(req, structureId);
      const payload = {
        ...req.body,
        structure: structureId,
        createdBy: req.user?.id,
      };
      const plan = await createInvestmentPlanEntry(db, payload);
      res.json(plan);
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/:id',
  auth({
    permissions: MANAGE_INVESTMENTS,
    action: 'investments:update',
    getStructureId: extractInvestmentStructure,
  }),
  checkId(),
  updateInvestmentValidator,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const existing = await getInvestmentPlanById(db, req.params.id);
      ensureStructureAccess(req, existing.structure);
      const structureId = req.body.structure ?? existing.structure;
      ensureStructureAccess(req, structureId);
      const payload = {
        ...req.body,
        structure: structureId,
      };
      const updated = await updateInvestmentPlanEntry(
        db,
        req.params.id,
        payload,
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id',
  auth({
    permissions: MANAGE_INVESTMENTS,
    action: 'investments:delete',
    getStructureId: extractInvestmentStructure,
  }),
  checkId(),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const existing = await getInvestmentPlanById(db, req.params.id);
      ensureStructureAccess(req, existing.structure);
      await deleteInvestmentPlanEntry(db, req.params.id);
      res.json({ message: 'Investment plan deleted' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
