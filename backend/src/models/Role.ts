import { Db } from 'mongodb';
import { normalizeRole } from '../utils/roleAccess';

export interface Role {
  name: string;
}

export function getRoles(db: Db): Promise<Role[]> {
  return db.collection<Role>('roles').find().sort({ name: 1 }).toArray();
}

export async function seedRoles(db: Db, roles: string[]): Promise<void> {
  const col = db.collection<Role>('roles');
  await col.createIndex({ name: 1 }, { unique: true });
  for (const name of roles.map(normalizeRole)) {
    await col.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  }
}
