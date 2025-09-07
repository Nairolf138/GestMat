import { Db, ObjectId, WithId } from 'mongodb';

export interface Structure {
  _id?: ObjectId;
  [key: string]: unknown;
}

export function getStructures(db: Db): Promise<Structure[]> {
  return db.collection<Structure>('structures').find().toArray();
}

export async function createStructure(
  db: Db,
  data: Structure,
): Promise<WithId<Structure>> {
  const result = await db.collection<Structure>('structures').insertOne(data);
  return { _id: result.insertedId, ...data };
}

export async function updateStructure(
  db: Db,
  id: string,
  data: Partial<Structure>,
): Promise<Structure | null> {
  const res = await db
    .collection<Structure>('structures')
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: 'after' },
    );
  return res.value;
}

export async function deleteStructure(db: Db, id: string): Promise<boolean> {
  const res = await db
    .collection('structures')
    .deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}

export function findStructureById(
  db: Db,
  id: string,
): Promise<Structure | null> {
  return db
    .collection<Structure>('structures')
    .findOne({ _id: new ObjectId(id) });
}
