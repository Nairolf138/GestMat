import { Db, ObjectId, ClientSession } from 'mongodb';

// Availability is computed dynamically from total quantity and overlapping loan requests.
export async function checkEquipmentAvailability(
  db: Db,
  equipmentId: string,
  start: Date | null,
  end: Date | null,
  quantity: number,
  session?: ClientSession,
): Promise<{ available: boolean; availableQty: number } | null> {
  const eq = await db
    .collection('equipments')
    .findOne({ _id: new ObjectId(equipmentId) }, { session });
  if (!eq) {
    return null;
  }
  let reserved = 0;
  if (start && end) {
    const agg = await db
      .collection('loanrequests')
      .aggregate(
        [
          {
            $match: {
              status: { $nin: ['refused', 'cancelled'] },
              // Overlap check treats loan end dates as exclusive to allow
              // back-to-back reservations without double counting the
              // midnight boundary.
              startDate: { $lt: end },
              endDate: { $gt: start },
              items: { $elemMatch: { equipment: eq._id } },
            },
          },
          { $unwind: '$items' },
          { $match: { 'items.equipment': eq._id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } },
        ],
        { session },
      )
      .toArray();
    reserved = agg[0]?.qty || 0;
  }
  const availQty = (eq.totalQty || 0) - reserved;
  return { available: quantity <= availQty, availableQty: availQty };
}
