const { ObjectId } = require('mongodb');

async function createUser(db, data) {
  if (data.structure) data.structure = new ObjectId(data.structure);
  const users = db.collection('users');
  await users.createIndex({ username: 1 }, { unique: true });
  try {
    const result = await users.insertOne(data);
    return { _id: result.insertedId, ...data };
  } catch (err) {
    if (err.code === 11000) {
      throw new Error('Username already exists');
    }
    throw err;
  }
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

async function updateUser(db, id, data) {
  if (data.structure) data.structure = new ObjectId(data.structure);
  const res = await db.collection('users').findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: data },
    { returnDocument: 'after' }
  );
  return res.value;
}

module.exports = {
  createUser,
  findUserByUsername,
  findUsers,
  deleteUserById,
  findUserById,
  updateUser,
};
