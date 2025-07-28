const { ObjectId } = require('mongodb');

async function createUser(db, data) {
  if (data.structure) data.structure = new ObjectId(data.structure);
  const result = await db.collection('users').insertOne(data);
  return { _id: result.insertedId, ...data };
}

function findUserByUsername(db, username) {
  return db.collection('users').findOne({ username });
}

function findUsers(db) {
  return db.collection('users').find().toArray();
}

function deleteUserById(db, id) {
  return db.collection('users').deleteOne({ _id: new ObjectId(id) });
}

function findUserById(db, id) {
  return db.collection('users').findOne({ _id: new ObjectId(id) });
}

module.exports = {
  createUser,
  findUserByUsername,
  findUsers,
  deleteUserById,
  findUserById,
};
