const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const client = require('prom-client');
const { connectDB, closeDB } = require('./config/db');
const { ApiError } = require('./utils/errors');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const logger = require('./utils/logger');

const { PORT, CORS_ORIGIN, NODE_ENV } = require('./config');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const structureRoutes = require('./routes/structures');
const equipmentRoutes = require('./routes/equipments');
const loanRoutes = require('./routes/loans');
const statsRoutes = require('./routes/stats');
const rolesRoutes = require('./routes/roles');

const app = express();
app.use(helmet());
const corsOptions = CORS_ORIGIN.length
  ? { origin: CORS_ORIGIN }
  : { origin: false };
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
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
  const csrfProtection = csrf({ cookie: true });
  app.use(csrfProtection);
  app.use((req, res, next) => {
    res.cookie('XSRF-TOKEN', req.csrfToken());
    next();
  });
}
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

client.collectDefaultMetrics();

async function start(connect = connectDB) {
  let db;
  try {
    db = await connect();
    app.locals.db = db;
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
  } catch (err) {
    logger.error('Failed to start server: %o', err);
    process.exit(1);
    return;
  }

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/structures', structureRoutes);
  app.use('/api/equipments', equipmentRoutes);
  app.use('/api/loans', loanRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/roles', rolesRoutes);

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });

  app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  app.use((err, req, res, next) => {
    logger.error(err);
    if (err.code === 'EBADCSRFTOKEN') {
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

module.exports = { app, start };
