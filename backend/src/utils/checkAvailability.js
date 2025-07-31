const { ObjectId } = require('mongodb');

// Availability is computed dynamically from total quantity and overlapping loan requests.
async function checkEquipmentAvailability(db, equipmentId, start, end, quantity) {
  const eq = await db
    .collection('equipments')
    .findOne({ _id: new ObjectId(equipmentId) });
  if (!eq) {
    return null;
  }
  let reserved = 0;
  if (start && end) {
    const agg = await db
      .collection('loanrequests')
      .aggregate([
        {
          $match: {
            status: { $ne: 'refused' },
            startDate: { $lte: end },
            endDate: { $gte: start },
            items: { $elemMatch: { equipment: eq._id } },
          },
        },
        { $unwind: '$items' },
        { $match: { 'items.equipment': eq._id } },
        { $group: { _id: null, qty: { $sum: '$items.quantity' } } },
      ])
      .toArray();
    reserved = agg[0]?.qty || 0;
  }
  const availQty = (eq.totalQty || 0) - reserved;
  return { available: quantity <= availQty, availableQty: availQty };
}

module.exports = { checkEquipmentAvailability };
