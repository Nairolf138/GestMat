import express, { Request, Response, NextFunction } from 'express';
import auth from '../middleware/auth';
import permissions from '../config/permissions';
import {
  findReportById,
  generateAnnualReports,
  listReports,
} from '../services/reportService';

const { MANAGE_STATS } = permissions;

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
