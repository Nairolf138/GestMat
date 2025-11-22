const test = require('node:test');
const assert = require('assert');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');

const { checkEquipmentAvailability } = require('../src/utils/checkAvailability');

async function createDb() {
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  return { db: client.db(), client, mongod };
}

test('loans that end when another begins do not overlap', async () => {
  const { db, client, mongod } = await createDb();
  const eqId = (
    await db
      .collection('equipments')
      .insertOne({ name: 'Projector', totalQty: 1, structure: new ObjectId() })
  ).insertedId;

  await db.collection('loanrequests').insertOne({
    owner: new ObjectId(),
    borrower: new ObjectId(),
    status: 'accepted',
    startDate: new Date('2024-01-01T00:00:00.000Z'),
    endDate: new Date('2024-01-02T00:00:00.000Z'),
    items: [{ equipment: eqId, quantity: 1 }],
  });

  const availability = await checkEquipmentAvailability(
    db,
    eqId.toString(),
    new Date('2024-01-02T00:00:00.000Z'),
    new Date('2024-01-03T00:00:00.000Z'),
    1,
  );

  assert.ok(availability?.available);
  assert.strictEqual(availability?.availableQty, 1);

  await client.close();
  await mongod.stop();
});

test('loans that start when another ends do not overlap', async () => {
  const { db, client, mongod } = await createDb();
  const eqId = (
    await db
      .collection('equipments')
      .insertOne({ name: 'Mixer', totalQty: 1, structure: new ObjectId() })
  ).insertedId;

  await db.collection('loanrequests').insertOne({
    owner: new ObjectId(),
    borrower: new ObjectId(),
    status: 'accepted',
    startDate: new Date('2024-02-02T00:00:00.000Z'),
    endDate: new Date('2024-02-03T00:00:00.000Z'),
    items: [{ equipment: eqId, quantity: 1 }],
  });

  const availability = await checkEquipmentAvailability(
    db,
    eqId.toString(),
    new Date('2024-02-01T00:00:00.000Z'),
    new Date('2024-02-02T00:00:00.000Z'),
    1,
  );

  assert.ok(availability?.available);
  assert.strictEqual(availability?.availableQty, 1);

  await client.close();
  await mongod.stop();
});
