import { Db, ObjectId } from 'mongodb';
import { isNotificationEnabled } from './notificationPreferences';

export async function getStructureEmails(
  db: Db,
  structureId: string,
  { requireSystemAlerts = false }: { requireSystemAlerts?: boolean } = {},
): Promise<string[]> {
  if (!ObjectId.isValid(structureId)) {
    return [];
  }
  const users = await db
    .collection('users')
    .find({ structure: new ObjectId(structureId) })
    .toArray();
  return users
    .filter(
      (u: any) =>
        u.email &&
        (!requireSystemAlerts || isNotificationEnabled(u, 'systemAlerts')),
    )
    .map((u: any) => u.email)
    .filter(Boolean);
}
