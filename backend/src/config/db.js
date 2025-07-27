const mongoose = require('mongoose');

const clientOptions = {
  serverApi: { version: '1', strict: true, deprecationErrors: true },
};

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost/gestmat',
      clientOptions
    );
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err; // rethrow so callers can handle failure
  }
};

module.exports = connectDB;
