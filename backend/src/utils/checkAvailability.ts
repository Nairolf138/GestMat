import { Db, ObjectId, ClientSession } from 'mongodb';
import { storedReservationPeriod } from './reservationPeriod';

// Inventory availableQty is the usable stock before reservations.
export async function checkEquipmentAvailability(
  db: Db,
  equipmentId: string,
  start: Date | null,
  end: Date | null,
  quantity: number,
  session?: ClientSession,
  excludedLoanRequestId?: ObjectId,
): Promise<{ available: boolean; availableQty: number } | null> {
  const eq = await db
    .collection('equipments')
    .findOne({ _id: new ObjectId(equipmentId) }, { session });
  if (!eq) {
    return null;
  }
  let reserved = 0;
  if (start && end) {
    const loans = await db
      .collection('loanrequests')
      .find(
        {
          ...(excludedLoanRequestId
            ? { _id: { $ne: excludedLoanRequestId } }
            : {}),
          status: { $nin: ['refused', 'cancelled'] },
          startDate: { $lt: end },
          endDate: { $gte: new Date(start.getTime() - 86400000) },
          items: { $elemMatch: { equipment: eq._id } },
        },
        {
          session,
          projection: {
            startDate: 1,
            endDate: 1,
            reservationMode: 1,
            items: 1,
          },
        },
      )
      .toArray();
    for (const loan of loans) {
      const period = storedReservationPeriod(loan as any);
      if (period.start >= end || period.endExclusive <= start) continue;
      for (const item of loan.items || []) {
        if (item.equipment?.toString() !== eq._id.toString()) continue;
        if (['refused', 'cancelled'].includes(item.decision?.status)) continue;
        reserved += Number(item.quantity) || 0;
      }
    }
  }
  const enteredStock = Number(eq.availableQty);
  const stock =
    eq.availableQty == null || !Number.isFinite(enteredStock)
      ? Number(eq.totalQty) || 0
      : enteredStock;
  const usable = ['HS', 'En maintenance'].includes(eq.status)
    ? 0
    : Math.max(0, Math.min(Number(eq.totalQty) || 0, stock));
  const availQty = Math.max(0, usable - reserved);
  return { available: quantity <= availQty, availableQty: availQty };
}
