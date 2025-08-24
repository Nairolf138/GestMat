import { Db, ObjectId, InsertOneResult, DeleteResult } from 'mongodb';

export interface Session {
  _id?: ObjectId;
  token: string;
  userId: ObjectId;
}

export function createSession(
  db: Db,
  { token, userId }: { token: string; userId: string }
): Promise<InsertOneResult<Session>> {
  return db.collection<Session>('sessions').insertOne({ token, userId: new ObjectId(userId) });
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
