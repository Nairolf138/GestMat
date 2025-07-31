const { ObjectId } = require('mongodb');

function createSession(db, { token, userId }) {
  return db.collection('sessions').insertOne({ token, userId: new ObjectId(userId) });
}

function findSessionByToken(db, token) {
  return db.collection('sessions').findOne({ token });
}

function deleteSessionByToken(db, token) {
  return db.collection('sessions').deleteOne({ token });
}

function deleteSessionsByUser(db, userId) {
  return db.collection('sessions').deleteMany({ userId: new ObjectId(userId) });
}

module.exports = {
  createSession,
  findSessionByToken,
  deleteSessionByToken,
  deleteSessionsByUser,
};

