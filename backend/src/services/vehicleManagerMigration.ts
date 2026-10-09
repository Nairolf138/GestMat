import { Db, ObjectId } from 'mongodb';
import { vehicleManagerIds } from '../utils/vehicleAccess';
import { idOf } from '../utils/loanLines';

export async function migrateVehicleManagers(
  db: Db,
  apply = false,
): Promise<any> {
  const report: any = {
    mode: apply ? 'apply' : 'dry-run',
    planned: [],
    preserved: [],
    blocked: [],
  };
  const vehicles = await db.collection('vehicles').find({}).toArray();
  for (const vehicle of vehicles) {
    if (Array.isArray(vehicle.managerIds) && vehicle.managerIds.length) {
      const validIds = vehicle.managerIds
        .filter((id: any) => ObjectId.isValid(idOf(id)))
        .map((id: any) => new ObjectId(idOf(id)));
      const count = await db
        .collection('users')
        .countDocuments({ _id: { $in: validIds } });
      if (count !== vehicle.managerIds.length)
        report.blocked.push({
          vehicleId: idOf(vehicle),
          reason: 'invalid-existing-managers',
        });
      else report.preserved.push(idOf(vehicle));
      continue;
    }
    const structure = idOf(vehicle.structure);
    if (
      !ObjectId.isValid(structure) ||
      !(await db
        .collection('structures')
        .findOne({ _id: new ObjectId(structure) }))
    ) {
      report.blocked.push({
        vehicleId: idOf(vehicle),
        reason: 'missing-owner-structure',
      });
      continue;
    }
    const managerIds = await vehicleManagerIds(db, {
      ...vehicle,
      managerIds: undefined,
    });
    if (!managerIds.length) {
      report.blocked.push({
        vehicleId: idOf(vehicle),
        reason: 'no-general-manager',
      });
      continue;
    }
    report.planned.push({ vehicleId: idOf(vehicle), managerIds });
  }
  // Preflight first: no partial application if a vehicle has no responsible person.
  if (apply && report.blocked.length)
    throw Object.assign(new Error('Vehicle manager migration blocked'), {
      report,
    });
  if (apply) {
    const session = (db as any).client.startSession();
    try {
      await session.withTransaction(async () => {
        for (const entry of report.planned) {
          await db.collection('vehicles').updateOne(
            {
              _id: new ObjectId(entry.vehicleId),
              $or: [
                { managerIds: { $exists: false } },
                { managerIds: { $size: 0 } },
              ],
            },
            {
              $set: {
                managerIds: entry.managerIds.map(
                  (id: string) => new ObjectId(id),
                ),
                managerAssignmentSource: 'migration-general',
                managerAssignedAt: new Date(),
              },
            },
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }
  }
  return report;
}
