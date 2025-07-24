const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const structureRoutes = require('./routes/structures');
const equipmentRoutes = require('./routes/equipments');
const loanRoutes = require('./routes/loans');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/structures', structureRoutes);
  app.use('/api/equipments', equipmentRoutes);
  app.use('/api/loans', loanRoutes);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
