import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import client from 'prom-client';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { connectDB, closeDB } from './config/db';
import { ApiError } from './utils/errors';
import logger from './utils/logger';
import { PORT, CORS_ORIGIN, NODE_ENV, RATE_LIMIT_MAX, API_PREFIX } from './config';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import structureRoutes from './routes/structures';
import equipmentRoutes from './routes/equipments';
import loanRoutes from './routes/loans';
import statsRoutes from './routes/stats';
import rolesRoutes from './routes/roles';
import { Db } from 'mongodb';
import { Server } from 'http';
import { ensureSessionIndexes } from './models/Session';

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
const corsOptions = CORS_ORIGIN.length
  ? { origin: CORS_ORIGIN, credentials: true }
  : { origin: true, credentials: true };
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
): Promise<Server> {
  let db: Db;
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
  } catch (err) {
    logger.error('Failed to start server: %o', err as Error);
    process.exit(1);
  }

  app.use(withApiPrefix('/auth'), authRoutes);
  app.use(withApiPrefix('/users'), userRoutes);
  app.use(withApiPrefix('/structures'), structureRoutes);
  app.use(withApiPrefix('/equipments'), equipmentRoutes);
  app.use(withApiPrefix('/loans'), loanRoutes);
  app.use(withApiPrefix('/stats'), statsRoutes);
  app.use(withApiPrefix('/roles'), rolesRoutes);

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
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  server.on('close', closeDB);

  return server;
}

if (require.main === module) {
  start();
}

export { app };
