const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

// Route tests must create the real account and its current permissions in MongoDB.
// JWT claims by themselves no longer grant a role or a structure.
async function accountHeaders(db, id, role, structure) {
  let user;
  if (ObjectId.isValid(String(id)))
    user = await db
      .collection('users')
      .findOne({ _id: new ObjectId(String(id)) });
  else
    user =
      (await db.collection('users').findOne({ fixtureAlias: String(id) })) ||
      (await db.collection('users').findOne({}));
  const _id =
    user?._id ||
    (ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : new ObjectId());
  await db.collection('users').updateOne(
    { _id },
    {
      $set: {
        role,
        ...(structure ? { structure: new ObjectId(String(structure)) } : {}),
        fixtureAlias: String(id),
      },
    },
    { upsert: true },
  );
  return {
    Authorization: `Bearer ${jwt.sign({ id: _id.toString(), role }, process.env.JWT_SECRET || 'test', { expiresIn: '1h' })}`,
  };
}
module.exports = { accountHeaders };
