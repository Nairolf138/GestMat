const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(err.stack || err.toString());
  const status = err.status || err.statusCode || 500;
  const message = status >= 500 ? 'Server error' : err.message;
  res.status(status).json({ message });
}

module.exports = errorHandler;
