const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');

dotenv.config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const structureRoutes = require('./routes/structures');
const equipmentRoutes = require('./routes/equipments');
const loanRoutes = require('./routes/loans');
const statsRoutes = require('./routes/stats');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

const PORT = process.env.PORT || 5000;

async function start(connect = connectDB) {
  let db;
  try {
    db = await connect();
    app.locals.db = db;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
    return;
  }

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/structures', structureRoutes);
  app.use('/api/equipments', equipmentRoutes);
  app.use('/api/loans', loanRoutes);
  app.use('/api/stats', statsRoutes);

  app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
