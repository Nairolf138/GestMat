import { Db, ObjectId, WithId, DeleteResult } from 'mongodb';
import { normalizeRole } from '../utils/roleAccess';
import type { Structure } from './Structure';

export interface EmailNotificationPreferences {
  accountUpdates: boolean;
  structureUpdates: boolean;
  systemAlerts: boolean;
}

export interface UserPreferences {
  emailNotifications: EmailNotificationPreferences;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  emailNotifications: {
    accountUpdates: true,
    structureUpdates: true,
    systemAlerts: true,
  },
};

export interface User {
  _id?: ObjectId;
  username: string;
  password?: string;
  structure?: ObjectId | Structure;
  role?: string;
  email?: string;
  preferences?: UserPreferences;
  [key: string]: unknown;
}

export const mergePreferences = (
  overrides?: Partial<UserPreferences>,
  base?: UserPreferences,
): UserPreferences => ({
  emailNotifications: {
    ...DEFAULT_USER_PREFERENCES.emailNotifications,
    ...(base?.emailNotifications ?? {}),
    ...(overrides?.emailNotifications ?? {}),
  },
});

export async function createUser(db: Db, data: User): Promise<WithId<User>> {
  if (data.structure) data.structure = new ObjectId(data.structure as any);
  if (data.role) data.role = normalizeRole(data.role);
  data.preferences = mergePreferences(data.preferences);
  const users = db.collection<User>('users');
  try {
    const result = await users.insertOne(data);
    return { _id: result.insertedId, ...data };
  } catch (err: any) {
    if (err.code === 11000) {
      throw new Error('Username already exists');
    }
    throw err;
  }
}

export function findUserByUsername(
  db: Db,
  username: string,
): Promise<User | null> {
  return db.collection<User>('users').findOne({ username });
}

export function findUsers(
  db: Db,
  search?: string,
  page = 1,
  limit = 10,
): Promise<User[]> {
  const filter: Record<string, unknown> = {};
  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { username: regex },
      { firstName: regex },
      { lastName: regex },
    ];
  }
  return db
    .collection<User>('users')
    .find(filter)
    .sort({ username: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
}

export function deleteUserById(db: Db, id: string): Promise<DeleteResult> {
  return db.collection('users').deleteOne({ _id: new ObjectId(id) });
}

export function findUserById(db: Db, id: string): Promise<User | null> {
  return db.collection<User>('users').findOne({ _id: new ObjectId(id) });
}

export async function updateUser(
  db: Db,
  id: string,
  data: Partial<User>,
): Promise<User | null> {
  if (data.structure) data.structure = new ObjectId(data.structure as any);
  if (data.role) data.role = normalizeRole(data.role);
  const res = await db
    .collection<User>('users')
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: 'after' },
    );
  return res.value;
}
