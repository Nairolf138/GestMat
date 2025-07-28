const { ObjectId } = require('mongodb');

function getStructures(db) {
  return db.collection('structures').find().toArray();
}

async function createStructure(db, data) {
  const result = await db.collection('structures').insertOne(data);
  return { _id: result.insertedId, ...data };
}

async function updateStructure(db, id, data) {
  const res = await db.collection('structures').findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: data },
    { returnDocument: 'after' }
  );
  return res.value;
}

async function deleteStructure(db, id) {
  const res = await db.collection('structures').deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}

function findStructureById(db, id) {
  return db.collection('structures').findOne({ _id: new ObjectId(id) });
}

module.exports = {
  getStructures,
  createStructure,
  updateStructure,
  deleteStructure,
  findStructureById,
};
