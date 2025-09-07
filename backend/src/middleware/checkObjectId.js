const { ObjectId } = require('mongodb');

function checkObjectId(param = 'id') {
  return function (req, res, next) {
    const value = req.params[param];
    if (!ObjectId.isValid(value)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    next();
  };
}

module.exports = checkObjectId;
