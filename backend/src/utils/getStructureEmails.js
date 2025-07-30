const { ObjectId } = require('mongodb');

async function getStructureEmails(db, structureId) {
  const users = await db.collection('users').find({ structure: new ObjectId(structureId) }).toArray();
  return users.map((u) => u.email).filter(Boolean);
}

module.exports = { getStructureEmails };
