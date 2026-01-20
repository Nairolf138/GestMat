import express, { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import auth from '../middleware/auth';
import permissions from '../config/permissions';
import { ADMIN_ROLE } from '../config/roles';
import {
  findReportById,
  generateAnnualReports,
  listReports,
} from '../services/reportService';
import {
  getInvestmentSummary,
  renderInvestmentSummaryCsv,
  renderInvestmentSummaryPdf,
} from '../services/investmentReportService';
import { badRequest, forbidden } from '../utils/errors';

const { MANAGE_STATS, MANAGE_INVESTMENTS } = permissions;

const normalizeId = (value?: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'toString' in value) {
    return (value as { toString: () => string }).toString();
  }
  return undefined;
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

router.post(
  '/run',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const { force, structureIds, sendEmails } = req.body || {};
      const result = await generateAnnualReports(db, {
        force: Boolean(force),
        structureIds: Array.isArray(structureIds)
          ? structureIds.map(String)
          : undefined,
        sendEmails: sendEmails !== undefined ? Boolean(sendEmails) : true,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/', auth(MANAGE_STATS), async (req: Request, res: Response, next: NextFunction) => {
  const db = req.app.locals.db;
  try {
    const reports = await listReports(db, {
      structureId: req.query.structureId as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    });
    res.json(
      reports.map((r) => ({
        _id: r._id,
        structureId: r.structureId,
        structureName: r.structureName,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        createdAt: r.createdAt,
        sentAt: r.sentAt,
        recipients: r.recipients,
        stats: r.stats,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.get(
  '/investments/export',
  auth({
    permissions: MANAGE_INVESTMENTS,
    action: 'investments:export',
    getStructureId: (req) =>
      (typeof req.query?.structure === 'string' ? req.query.structure : undefined) ??
      normalizeId(req.user?.structure),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const structureId =
        typeof req.query.structure === 'string' ? req.query.structure : undefined;
      if (structureId) {
        if (!ObjectId.isValid(structureId)) {
          throw badRequest('Invalid structure id');
        }
        ensureStructureAccess(req, structureId);
      } else if (req.user?.role !== ADMIN_ROLE) {
        ensureStructureAccess(req, req.user?.structure);
      }
      const summary = await getInvestmentSummary(db, { structureId });
      const format = typeof req.query.format === 'string' ? req.query.format : 'csv';
      if (format === 'pdf') {
        const pdf = await renderInvestmentSummaryPdf(summary);
        res.contentType('application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=investissements.pdf');
        res.send(pdf);
        return;
      }
      const csv = renderInvestmentSummaryCsv(summary);
      res.contentType('text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=investissements.csv');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id/download',
  auth(MANAGE_STATS),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const report = await findReportById(db, req.params.id);
      if (!report) {
        res.status(404).json({ message: 'Not found' });
        return;
      }
      res.contentType('application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=rapport-${report.structureName || 'structure'}.pdf`,
      );
      res.send(report.pdf);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/:id', auth(MANAGE_STATS), async (req: Request, res: Response, next: NextFunction) => {
  const db = req.app.locals.db;
  try {
    const report = await findReportById(db, req.params.id);
    if (!report) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({
      _id: report._id,
      structureId: report.structureId,
      structureName: report.structureName,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      createdAt: report.createdAt,
      sentAt: report.sentAt,
      recipients: report.recipients,
      stats: report.stats,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
