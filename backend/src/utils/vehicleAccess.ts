import { ClientSession, Db, ObjectId } from 'mongodb';
import { ADMIN_ROLE, REGISSEUR_GENERAL_ROLE } from '../config/roles';
import { idOf } from './loanLines';
import { normalizeRole } from './roleAccess';

export async function vehicleManagerIds(
  db: Db,
  vehicle: any,
  session?: ClientSession,
): Promise<string[]> {
  if (Array.isArray(vehicle.managerIds)) return vehicle.managerIds.map(idOf);
  // Transitional fallback for records not yet migrated. An explicit assignment always wins.
  if (!idOf(vehicle.structure)) return [];
  const users = await db
    .collection('users')
    .find({ structure: new ObjectId(idOf(vehicle.structure)) }, { session })
    .toArray();
  return users
    .filter((u) => normalizeRole(u.role || '') === REGISSEUR_GENERAL_ROLE)
    .map(idOf);
}

export function canAssignVehicle(user: any, vehicle: any): boolean {
  return (
    normalizeRole(user.role || '') === ADMIN_ROLE ||
    (normalizeRole(user.role || '') === REGISSEUR_GENERAL_ROLE &&
      Boolean(idOf(user.structure)) &&
      idOf(user.structure) === idOf(vehicle.structure))
  );
}

export async function canManageVehicle(
  db: Db,
  user: any,
  vehicle: any,
  session?: ClientSession,
): Promise<boolean> {
  return (
    normalizeRole(user.role || '') === ADMIN_ROLE ||
    (await vehicleManagerIds(db, vehicle, session)).includes(
      user.id || idOf(user),
    )
  );
}

export async function vehiclePermissions(
  db: Db,
  user: any,
  vehicle: any,
): Promise<any> {
  const canEdit = await canManageVehicle(db, user, vehicle);
  return {
    canEdit,
    canDelete: canEdit,
    canAssign: canAssignVehicle(user, vehicle),
  };
}

export async function validateVehicleManagers(
  db: Db,
  values: unknown,
  session?: ClientSession,
): Promise<ObjectId[]> {
  if (
    !Array.isArray(values) ||
    !values.length ||
    values.some((v) => typeof v !== 'string' || !ObjectId.isValid(v))
  ) {
    throw Object.assign(
      new Error('At least one valid vehicle manager is required'),
      { status: 400 },
    );
  }
  const ids = [...new Set(values)].map((id) => new ObjectId(id));
  if (
    (await db
      .collection('users')
      .countDocuments({ _id: { $in: ids } }, { session })) !== ids.length
  ) {
    throw Object.assign(new Error('Vehicle manager not found'), {
      status: 400,
    });
  }
  if (session) {
    // Serialize manager assignments with account deletion in the same transaction.
    await db
      .collection('users')
      .updateMany(
        { _id: { $in: ids } },
        { $inc: { vehicleManagerRevision: 1 } },
        { session },
      );
  }
  return ids;
}
