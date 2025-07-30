const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(err.stack || err.toString());
  res.status(500).json({ message: 'Server error' });
}

module.exports = errorHandler;
