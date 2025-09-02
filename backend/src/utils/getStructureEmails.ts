import { Db, ObjectId } from 'mongodb';

export async function getStructureEmails(
  db: Db,
  structureId: string,
): Promise<string[]> {
  if (!ObjectId.isValid(structureId)) {
    return [];
  }
  const users = await db
    .collection('users')
    .find({ structure: new ObjectId(structureId) })
    .toArray();
  return users.map((u: any) => u.email).filter(Boolean);
}
