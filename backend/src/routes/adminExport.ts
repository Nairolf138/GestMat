import express, { Request, Response, NextFunction } from 'express';
import auth from '../middleware/auth';
import permissions from '../config/permissions';
import { ADMIN_ROLE } from '../config/roles';
import { badRequest, forbidden } from '../utils/errors';
import { generateAdminExport } from '../services/exportService';
import { findUserById } from '../models/User';

const router = express.Router();

router.post(
  '/export',
  auth({ permissions: permissions.MANAGE_STATS, action: 'admin:export' }),
  async (req: Request, res: Response, next: NextFunction) => {
    const db = req.app.locals.db;
    try {
      const { sections, format, email } = req.body || {};
      if (!Array.isArray(sections) || !sections.length) {
        return next(badRequest('Sections required'));
      }
      const allowedFormats = ['pdf', 'xlsx'];
      if (!allowedFormats.includes(format)) {
        return next(badRequest('Invalid format'));
      }
      const user = await findUserById(db, req.user!.id);
      if (!user || user.role !== ADMIN_ROLE) {
        return next(forbidden('Access denied'));
      }
      if (email && !user.email) {
        return next(badRequest('Email address missing'));
      }
      const result = await generateAdminExport({
        db,
        userId: req.user!.id,
        sections: sections.map((section: unknown) => String(section)),
        format,
        email: Boolean(email),
      });
      res.contentType(result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      res.send(result.buffer);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
