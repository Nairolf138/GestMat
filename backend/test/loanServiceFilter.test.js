const test = require('node:test');
const assert = require('assert');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
process.env.JWT_SECRET = 'test';
const { listLoans } = require('../src/services/loanService');
const { ADMIN_ROLE, AUTRE_ROLE } = require('../src/config/roles');

async function createDb() {
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  return { db: client.db(), client, mongod };
}

test('listLoans filters documents by user structure', async () => {
  const { db, client, mongod } = await createDb();
  const struct1 = (await db.collection('structures').insertOne({ name: 'S1' }))
    .insertedId;
  const struct2 = (await db.collection('structures').insertOne({ name: 'S2' }))
    .insertedId;
  const userId = new ObjectId().toString();
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: struct1 });
  const eq1 = (
    await db
      .collection('equipments')
      .insertOne({ name: 'E1', structure: struct1, type: 'Son' })
  ).insertedId;
  const eq2 = (
    await db
      .collection('equipments')
      .insertOne({ name: 'E2', structure: struct2, type: 'Son' })
  ).insertedId;

  await db.collection('loanrequests').insertMany([
    { owner: struct1, borrower: struct2, items: [{ equipment: eq1 }] },
    {
      owner: struct2,
      borrower: struct1,
      items: [{ equipment: eq2 }],
      requestedBy: new ObjectId(userId),
    },
    {
      owner: struct1,
      borrower: struct1,
      items: [{ equipment: eq1 }],
      requestedBy: new ObjectId(userId),
    },
    { owner: struct2, borrower: struct2, items: [{ equipment: eq2 }] },
    { owner: struct2, borrower: struct2, items: [{ equipment: eq2 }] },
  ]);

  const total = await db.collection('loanrequests').countDocuments();
  const adminLoans = await listLoans(db, { role: ADMIN_ROLE });
  const userLoans = await listLoans(db, { id: userId, role: AUTRE_ROLE });

  assert.strictEqual(adminLoans.length, total);
  assert.strictEqual(userLoans.length, 3);
  assert(userLoans.length < adminLoans.length);

  await client.close();
  await mongod.stop();
});

test('listLoans returns filtered total when paginated for non-admin roles', async () => {
  const { db, client, mongod } = await createDb();
  const struct1 = (await db.collection('structures').insertOne({ name: 'S1' }))
    .insertedId;
  const struct2 = (await db.collection('structures').insertOne({ name: 'S2' }))
    .insertedId;
  const userId = new ObjectId().toString();
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: struct1 });

  const eq1 = (
    await db
      .collection('equipments')
      .insertOne({ name: 'E1', structure: struct1, type: 'Son' })
  ).insertedId;

  await db.collection('loanrequests').insertMany([
    { owner: struct1, borrower: struct2, items: [{ equipment: eq1 }] },
    { owner: struct1, borrower: struct2, items: [{ equipment: eq1 }] },
    { owner: struct1, borrower: struct2, items: [{ equipment: eq1 }] },
  ]);

  const result = await listLoans(db, { id: userId, role: AUTRE_ROLE }, 1, 2);

  assert.strictEqual(result.total, 3);
  assert.strictEqual(result.loans.length, 2);

  await client.close();
  await mongod.stop();
});
