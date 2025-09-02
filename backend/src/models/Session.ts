import { Db, ObjectId, InsertOneResult, DeleteResult } from 'mongodb';
import crypto from 'crypto';

export interface Session {
  _id?: ObjectId;
  token: string;
  userId: ObjectId;
  createdAt: Date;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createSession(
  db: Db,
  { token, userId }: { token: string; userId: string }
): Promise<InsertOneResult<Session>> {
  return db
    .collection<Session>('sessions')
    .insertOne({ token, userId: new ObjectId(userId), createdAt: new Date() });
}

export function findSessionByToken(db: Db, token: string): Promise<Session | null> {
  return db.collection<Session>('sessions').findOne({ token });
}

export function deleteSessionByToken(db: Db, token: string): Promise<DeleteResult> {
  return db.collection('sessions').deleteOne({ token });
}

export function deleteSessionsByUser(db: Db, userId: string): Promise<DeleteResult> {
  return db.collection('sessions').deleteMany({ userId: new ObjectId(userId) });
}

export async function ensureSessionIndexes(db: Db): Promise<string | undefined> {
  return db.collection('sessions').createIndex({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
}
