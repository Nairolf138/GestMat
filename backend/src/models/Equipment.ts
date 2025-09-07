import { Db, ObjectId, WithId } from 'mongodb';
import type { Structure } from './Structure';

export interface Equipment {
  _id?: ObjectId;
  structure?: ObjectId | Structure;
  type?: string;
  totalQty?: number;
  availableQty?: number;
  [key: string]: unknown;
}

export function findEquipments(
  db: Db,
  filter: any,
  page = 1,
  limit = 0,
): Promise<Equipment[]> {
  const cursor = db
    .collection<Equipment>('equipments')
    .find(filter)
    .sort({ name: 1 });
  if (limit > 0) {
    const skip = (page - 1) * limit;
    cursor.skip(skip).limit(limit);
  }
  return cursor.toArray();
}

export async function createEquipment(
  db: Db,
  data: Equipment,
): Promise<WithId<Equipment>> {
  if (data.structure) data.structure = new ObjectId(data.structure as any);
  const result = await db.collection<Equipment>('equipments').insertOne(data);
  return { _id: result.insertedId, ...data };
}

export async function updateEquipment(
  db: Db,
  id: string,
  data: Partial<Equipment>,
): Promise<Equipment | null> {
  if (data.structure) data.structure = new ObjectId(data.structure as any);
  const res = await db
    .collection<Equipment>('equipments')
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: 'after' },
    );
  return res.value;
}

export async function deleteEquipment(db: Db, id: string): Promise<boolean> {
  const res = await db
    .collection('equipments')
    .deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}

export function findEquipmentById(
  db: Db,
  id: string,
): Promise<Equipment | null> {
  return db
    .collection<Equipment>('equipments')
    .findOne({ _id: new ObjectId(id) });
}
