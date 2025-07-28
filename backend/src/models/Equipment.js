const { ObjectId } = require('mongodb');

function findEquipments(db, filter) {
  return db.collection('equipments').find(filter).sort({ name: 1 }).toArray();
}

async function createEquipment(db, data) {
  if (data.structure) data.structure = new ObjectId(data.structure);
  const result = await db.collection('equipments').insertOne(data);
  return { _id: result.insertedId, ...data };
}

async function updateEquipment(db, id, data) {
  if (data.structure) data.structure = new ObjectId(data.structure);
  const res = await db.collection('equipments').findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: data },
    { returnDocument: 'after' }
  );
  return res.value;
}

async function deleteEquipment(db, id) {
  const res = await db.collection('equipments').deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}

function findEquipmentById(db, id) {
  return db.collection('equipments').findOne({ _id: new ObjectId(id) });
}

module.exports = {
  findEquipments,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  findEquipmentById,
};
