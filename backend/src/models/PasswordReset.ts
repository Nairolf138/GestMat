import { Db, InsertOneResult, ObjectId, DeleteResult } from 'mongodb';
import { hashToken } from './Session';

export interface PasswordReset {
  _id?: ObjectId;
  token: string;
  userId: ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

export function createPasswordReset(
  db: Db,
  { token, userId, expiresAt }: { token: string; userId: string; expiresAt: Date },
): Promise<InsertOneResult<PasswordReset>> {
  return db.collection<PasswordReset>('password_resets').insertOne({
    token: hashToken(token),
    userId: new ObjectId(userId),
    expiresAt,
    createdAt: new Date(),
  });
}

export function findValidPasswordReset(
  db: Db,
  token: string,
): Promise<PasswordReset | null> {
  return db.collection<PasswordReset>('password_resets').findOne({
    token: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
}

export function deletePasswordResetsByUser(
  db: Db,
  userId: string,
): Promise<DeleteResult> {
  return db
    .collection('password_resets')
    .deleteMany({ userId: new ObjectId(userId) });
}

export function deletePasswordResetById(
  db: Db,
  id: ObjectId | string,
): Promise<DeleteResult> {
  return db.collection('password_resets').deleteOne({
    _id: typeof id === 'string' ? new ObjectId(id) : id,
  });
}

export async function ensurePasswordResetIndexes(
  db: Db,
): Promise<string | undefined> {
  return db
    .collection('password_resets')
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
