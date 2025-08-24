import { Db, ObjectId, WithId } from 'mongodb';

export interface Equipment {
  _id?: ObjectId;
  structure?: ObjectId;
  [key: string]: unknown;
}

export function findEquipments(db: Db, filter: Partial<Equipment>): Promise<Equipment[]> {
  return db.collection<Equipment>('equipments').find(filter).sort({ name: 1 }).toArray();
}

export async function createEquipment(db: Db, data: Equipment): Promise<WithId<Equipment>> {
  if (data.structure) data.structure = new ObjectId(data.structure);
  const result = await db.collection<Equipment>('equipments').insertOne(data);
  return { _id: result.insertedId, ...data };
}

export async function updateEquipment(
  db: Db,
  id: string,
  data: Partial<Equipment>
): Promise<Equipment | null> {
  if (data.structure) data.structure = new ObjectId(data.structure);
  const res = await db.collection<Equipment>('equipments').findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: data },
    { returnDocument: 'after' }
  );
  return res.value;
}

export async function deleteEquipment(db: Db, id: string): Promise<boolean> {
  const res = await db.collection('equipments').deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}

export function findEquipmentById(db: Db, id: string): Promise<Equipment | null> {
  return db.collection<Equipment>('equipments').findOne({ _id: new ObjectId(id) });
}
