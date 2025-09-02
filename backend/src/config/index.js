const dotenv = require('dotenv');

// Load environment variables from .env file if present
dotenv.config();

function required(name, defaultValue) {
  const value = process.env[name] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

function parsePort(value) {
  const port = parseInt(value, 10);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }
  return port;
}

function parseRateLimit(value) {
  const max = parseInt(value, 10);
  if (Number.isNaN(max) || max <= 0) {
    throw new Error('RATE_LIMIT_MAX must be a positive integer');
  }
  return max;
}

const PORT = process.env.PORT ? parsePort(process.env.PORT) : 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : [];
const MONGODB_URI = required('MONGODB_URI', 'mongodb://localhost/gestmat');
const JWT_SECRET = required('JWT_SECRET');
const SMTP_URL = process.env.SMTP_URL;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_URL = process.env.API_URL || `http://localhost:${PORT}/api`;
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX
  ? parseRateLimit(process.env.RATE_LIMIT_MAX)
  : 100;

module.exports = {
  PORT,
  CORS_ORIGIN,
  MONGODB_URI,
  JWT_SECRET,
  SMTP_URL,
  NOTIFY_EMAIL,
  NODE_ENV,
  API_URL,
  RATE_LIMIT_MAX,
};
