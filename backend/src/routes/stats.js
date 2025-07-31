const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/loans', auth(), async (req, res, next) => {
  const db = req.app.locals.db;
  try {
    const agg = await db.collection('loanrequests').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray();
    res.json(agg);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
