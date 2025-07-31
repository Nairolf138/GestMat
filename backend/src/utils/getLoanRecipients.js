const { ObjectId } = require('mongodb');
const { canModify } = require('./roleAccess');

async function getLoanRecipients(db, ownerId, items) {
  const types = (
    await Promise.all(
      items.map(async (it) => {
        const eq = await db
          .collection('equipments')
          .findOne({ _id: new ObjectId(it.equipment) });
        return eq?.type;
      })
    )
  ).filter(Boolean);
  const users = await db
    .collection('users')
    .find({ structure: new ObjectId(ownerId) })
    .toArray();
  const emails = users
    .filter((u) => u.email && types.some((t) => canModify(u.role, t)))
    .map((u) => u.email);
  return [...new Set(emails)];
}

module.exports = { getLoanRecipients };
