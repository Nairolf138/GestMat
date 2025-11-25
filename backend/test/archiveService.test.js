const test = require('node:test');
const assert = require('assert');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
process.env.JWT_SECRET = 'test';

const { archiveOldLoans } = require('../src/services/archiveService');
const { findLoans } = require('../src/models/LoanRequest');

async function createDb() {
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  return { db: client.db(), client, mongod };
}

test('archiveOldLoans moves only expired loans into the archive collection', async () => {
  const { db, client, mongod } = await createDb();
  const now = new Date('2025-01-01T00:00:00Z');

  const keepLoan = await db.collection('loanrequests').insertOne({
    _id: new ObjectId(),
    endDate: new Date('2024-12-20T00:00:00Z'),
  });

  const oldLoan1 = await db.collection('loanrequests').insertOne({
    _id: new ObjectId(),
    endDate: new Date('2023-10-10T00:00:00Z'),
  });

  const oldLoan2 = await db.collection('loanrequests').insertOne({
    _id: new ObjectId(),
    endDate: new Date('2023-05-01T00:00:00Z'),
  });

  const result = await archiveOldLoans(db, { now, minAgeDays: 365, batchSize: 10 });

  assert.strictEqual(result.archivedCount, 2);
  assert.strictEqual(result.considered, 2);

  const archived = await db.collection('loanrequests_archive').find().toArray();
  assert.strictEqual(archived.length, 2);
  assert(archived.every((loan) => loan.archived === true));
  assert(archived.every((loan) => loan.archivedAt.getTime() === now.getTime()));
  assert.deepStrictEqual(
    archived
      .map((loan) => loan.originalId.toString())
      .sort(),
    [oldLoan1.insertedId.toString(), oldLoan2.insertedId.toString()].sort(),
  );

  const remaining = await db.collection('loanrequests').find().toArray();
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0]._id.toString(), keepLoan.insertedId.toString());

  await client.close();
  await mongod.stop();
});

test('findLoans excludes archived loans unless explicitly requested', async () => {
  const { db, client, mongod } = await createDb();

  await db.collection('loanrequests').insertOne({ _id: new ObjectId(), endDate: new Date() });
  await db.collection('loanrequests_archive').insertOne({
    _id: new ObjectId(),
    endDate: new Date('2020-01-01T00:00:00Z'),
    archived: true,
    archivedAt: new Date('2021-01-01T00:00:00Z'),
  });

  const activeOnly = await findLoans(db);
  assert.strictEqual(activeOnly.length, 1);

  const archivedOnly = await findLoans(db, {}, undefined, undefined, { includeArchived: true });
  assert.strictEqual(archivedOnly.length, 1);
  assert.strictEqual(archivedOnly[0].archived, true);

  await client.close();
  await mongod.stop();
});
