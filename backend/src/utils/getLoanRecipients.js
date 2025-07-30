const { ObjectId } = require('mongodb');
const { canModify } = require('./roleAccess');

async function getLoanRecipients(db, ownerId, items) {
  const types = [];
  for (const it of items) {
    const eq = await db.collection('equipments').findOne({ _id: new ObjectId(it.equipment) });
    if (eq && eq.type) types.push(eq.type);
  }
  const users = await db.collection('users').find({ structure: new ObjectId(ownerId) }).toArray();
  const emails = users
    .filter((u) => u.email && types.some((t) => canModify(u.role, t)))
    .map((u) => u.email);
  return [...new Set(emails)];
}

module.exports = { getLoanRecipients };
