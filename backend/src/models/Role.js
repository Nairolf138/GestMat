const { normalizeRole } = require('../utils/roleAccess');

function getRoles(db) {
  return db.collection('roles').find().sort({ name: 1 }).toArray();
}

async function seedRoles(db, roles) {
  const col = db.collection('roles');
  await col.createIndex({ name: 1 }, { unique: true });
  for (const name of roles.map(normalizeRole)) {
    await col.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  }
}

module.exports = { getRoles, seedRoles };
