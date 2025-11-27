import cors, { CorsOptions } from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import client from 'prom-client';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { connectDB, closeDB } from './config/db';
import { ApiError } from './utils/errors';
import logger from './utils/logger';
import {
  PORT,
  CORS_ORIGIN,
  NODE_ENV,
  RATE_LIMIT_MAX,
  API_PREFIX,
  normalizeCorsOrigins,
} from './config';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import structureRoutes from './routes/structures';
import equipmentRoutes from './routes/equipments';
import loanRoutes from './routes/loans';
import statsRoutes from './routes/stats';
import rolesRoutes from './routes/roles';
import reportRoutes from './routes/reports';
import { Db } from 'mongodb';
import { Server } from 'http';
import { ensureSessionIndexes } from './models/Session';
import { ensurePasswordResetIndexes } from './models/PasswordReset';
import { scheduleLoanReminders } from './services/reminderService';
import { scheduleOverdueLoanNotifications } from './services/overdueService';
import { scheduleLoanArchiving } from './services/archiveService';
import { scheduleAnnualReports } from './services/reportService';

const normalizeAllowOriginHeader = (
  value: string | string[] | number | undefined,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const values = Array.isArray(value)
    ? value
    : String(value)
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

  if (values.length === 0) {
    return undefined;
  }

  return values[0];
};

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'"],
      },
    },
  }),
);
app.use((_, res: Response, next: NextFunction) => {
  res.removeHeader('Access-Control-Allow-Origin');
  next();
});
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalEnd = res.end.bind(res);

  res.end = ((chunk?: unknown, encoding?: unknown, cb?: unknown) => {
    const normalizedOrigin = normalizeAllowOriginHeader(
      res.getHeader('Access-Control-Allow-Origin'),
    );

    if (normalizedOrigin === undefined) {
      res.removeHeader('Access-Control-Allow-Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', normalizedOrigin);
    }

    return originalEnd(chunk as never, encoding as never, cb as never);
  }) as typeof res.end;

  next();
});
const corsOptions: CorsOptions = CORS_ORIGIN.length
  ? { origin: CORS_ORIGIN, credentials: true }
  : {
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        try {
          const normalizedOrigins = normalizeCorsOrigins(origin);
          if (normalizedOrigins.length !== 1) {
            callback(null, false);
            return;
          }

          callback(null, normalizedOrigins[0]);
        } catch {
          callback(null, false);
        }
      },
      credentials: true,
    };
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use((req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    const { method, originalUrl } = req;
    const { statusCode } = res;
    const message = `${method} ${originalUrl} ${statusCode}`;
    if (statusCode >= 500) {
      logger.error(message);
    } else if (statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  });
  next();
});
if (NODE_ENV !== 'test') {
  const csrfProtection = csrf({ cookie: true }) as express.RequestHandler;
  app.use(csrfProtection);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const token = req.csrfToken();
    res.cookie('XSRF-TOKEN', token);
    next();
  });
}
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: RATE_LIMIT_MAX });
app.use(limiter);

client.collectDefaultMetrics();

const withApiPrefix = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_PREFIX) {
    return normalizedPath;
  }
  return `${API_PREFIX}${normalizedPath === '/' ? '' : normalizedPath}`;
};

const csrfRouteHandler: express.RequestHandler =
  NODE_ENV !== 'test'
    ? (req: Request, res: Response) => {
        res.json({ csrfToken: req.csrfToken() });
      }
    : (_req: Request, res: Response) => {
        res.json({ csrfToken: '' });
      };

app.get(withApiPrefix('/auth/csrf'), csrfRouteHandler);

export async function start(
  connect: () => Promise<Db> = connectDB,
  configureApp?: (app: express.Express) => void,
): Promise<Server> {
  let db: Db;
  let reminderSchedule: { cancel: () => void } | undefined;
  let overdueInterval: NodeJS.Timeout | undefined;
  let archiveInterval: NodeJS.Timeout | undefined;
  let reportInterval: NodeJS.Timeout | undefined;
  try {
    db = await connect();
    app.locals.db = db;
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('equipments').createIndex({
      name: 1,
      type: 1,
      location: 1,
      structure: 1,
    });
    await ensureSessionIndexes(db);
    await ensurePasswordResetIndexes(db);
    if (NODE_ENV !== 'test') {
      reminderSchedule = scheduleLoanReminders(db);
      overdueInterval = scheduleOverdueLoanNotifications(db);
      archiveInterval = scheduleLoanArchiving(db);
      reportInterval = scheduleAnnualReports(db);
    }
  } catch (err) {
    logger.error('Failed to start server: %o', err as Error);
    process.exit(1);
  }

  configureApp?.(app);

  app.use(withApiPrefix('/auth'), authRoutes);
  app.use(withApiPrefix('/users'), userRoutes);
  app.use(withApiPrefix('/structures'), structureRoutes);
  app.use(withApiPrefix('/equipments'), equipmentRoutes);
  app.use(withApiPrefix('/loans'), loanRoutes);
  app.use(withApiPrefix('/stats'), statsRoutes);
  app.use(withApiPrefix('/roles'), rolesRoutes);
  app.use(withApiPrefix('/reports'), reportRoutes);

  app.get('/metrics', async (req: Request, res: Response) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });

  app.get('/health', async (req: Request, res: Response) => {
    try {
      const db: Db = req.app.locals.db;
      await db.command({ ping: 1 });
      res.status(200).json({ status: 'ok' });
    } catch (err) {
      logger.error('Health check failed: %o', err as Error);
      res.status(500).json({ status: 'error' });
    }
  });

  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: 'Not found' });
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    logger.error(err as Error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = err as any;
    if (anyErr.code === 'EBADCSRFTOKEN') {
      res.status(403).json({ message: 'Invalid CSRF token' });
    } else if (err instanceof ApiError) {
      res.status(err.status).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  });

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  const shutdown = () => {
    reminderSchedule?.cancel();
    if (overdueInterval) {
      clearInterval(overdueInterval);
    }
    if (archiveInterval) {
      clearInterval(archiveInterval);
    }
    if (reportInterval) {
      clearInterval(reportInterval);
    }
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  server.on('close', () => {
    reminderSchedule?.cancel();
    if (overdueInterval) {
      clearInterval(overdueInterval);
    }
    if (archiveInterval) {
      clearInterval(archiveInterval);
    }
    if (reportInterval) {
      clearInterval(reportInterval);
    }
    closeDB();
  });

  return server;
}

if (require.main === module) {
  start();
}

export { app };
