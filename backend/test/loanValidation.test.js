const { accountHeaders } = require('./utils/accountFixture');
let fixtureDb;
const test = require('node:test');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
const assert = require('assert');
process.env.JWT_SECRET = 'test';

const loanRoutes = require('../src/routes/loans').default;
const { ADMIN_ROLE } = require('../src/config/roles');
const { withApiPrefix } = require('./utils/apiPrefix');

async function createApp() {
  const mongod = await MongoMemoryReplSet.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  fixtureDb = db;
  app.use(withApiPrefix('/loans'), loanRoutes);
  return { app, client, mongod };
}

const userId = new ObjectId().toString();

async function auth(role = ADMIN_ROLE) {
  return accountHeaders(fixtureDb, userId, role, undefined);
}

test('post validates ids, status and dates', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const [ownerStruct, borrowerStruct] = await Promise.all([
    db.collection('structures').insertOne({ name: 'S1' }),
    db.collection('structures').insertOne({ name: 'S2' }),
  ]);
  const structId = ownerStruct.insertedId;
  const borrowerId = borrowerStruct.insertedId;
  const eqId = (
    await db.collection('equipments').insertOne({
      name: 'E1',
      type: 'Autre',
      structure: structId,
      totalQty: 1,
    })
  ).insertedId;

  const base = {
    owner: structId.toString(),
    borrower: borrowerId.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2099-01-01',
    endDate: '2099-01-02',
  };

  await request(app)
    .post(withApiPrefix('/loans'))
    .set(await auth())
    .send({ ...base, owner: 'badid' })
    .expect(400);

  await request(app)
    .post(withApiPrefix('/loans'))
    .set(await auth())
    .send({ ...base, items: [{ equipment: 'bad', quantity: 1 }] })
    .expect(400);

  await request(app)
    .post(withApiPrefix('/loans'))
    .set(await auth())
    .send({ ...base, status: 'wrong' })
    .expect(400);

  await request(app)
    .post(withApiPrefix('/loans'))
    .set(await auth())
    .send({ ...base, startDate: 'bad-date' })
    .expect(400);

  await request(app)
    .post(withApiPrefix('/loans'))
    .set(await auth())
    .send({ ...base, endDate: 'bad-date' })
    .expect(400);

  await request(app)
    .post(withApiPrefix('/loans'))
    .set(await auth())
    .send({ ...base, startDate: '2099-01-03', endDate: '2099-01-02' })
    .expect(400);

  await request(app)
    .post(withApiPrefix('/loans'))
    .set(await auth())
    .send({ ...base, note: 123 })
    .expect(400);

  const longNote = 'a'.repeat(501);
  await request(app)
    .post(withApiPrefix('/loans'))
    .set(await auth())
    .send({ ...base, note: longNote })
    .expect(400);

  const note = 'Handle with care';
  const ok = await request(app)
    .post(withApiPrefix('/loans'))
    .set(await auth())
    .send({ ...base, note })
    .expect(200);
  assert.strictEqual(ok.body.note, note);

  await client.close();
  await mongod.stop();
});

test('put validates status and dates', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const [ownerStruct, borrowerStruct] = await Promise.all([
    db.collection('structures').insertOne({ name: 'S1' }),
    db.collection('structures').insertOne({ name: 'S2' }),
  ]);
  const structId = ownerStruct.insertedId;
  const borrowerId = borrowerStruct.insertedId;
  const eqId = (
    await db.collection('equipments').insertOne({
      name: 'E1',
      type: 'Autre',
      structure: structId,
      totalQty: 1,
    })
  ).insertedId;

  const payload = {
    owner: structId.toString(),
    borrower: borrowerId.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2099-01-01',
    endDate: '2099-01-02',
  };

  const res = await request(app)
    .post(withApiPrefix('/loans'))
    .set(await auth())
    .send(payload)
    .expect(200);

  await request(app)
    .put(withApiPrefix(`/loans/${res.body._id}`))
    .set(await auth())
    .send({ startDate: 'bad-date' })
    .expect(400);

  await request(app)
    .put(withApiPrefix(`/loans/${res.body._id}`))
    .set(await auth())
    .send({ endDate: 'bad-date' })
    .expect(400);

  await request(app)
    .put(withApiPrefix(`/loans/${res.body._id}`))
    .set(await auth())
    .send({ startDate: '2099-02-03', endDate: '2099-02-01' })
    .expect(400);

  await request(app)
    .put(withApiPrefix(`/loans/${res.body._id}`))
    .set(await auth())
    .send({ status: 'bad' })
    .expect(400);

  const tooLong = 'b'.repeat(501);
  await request(app)
    .put(withApiPrefix(`/loans/${res.body._id}`))
    .set(await auth())
    .send({ note: tooLong })
    .expect(400);

  const updated = await request(app)
    .put(withApiPrefix(`/loans/${res.body._id}`))
    .set(await auth())
    .send({ note: 'Updated note' })
    .expect(200);
  assert.strictEqual(updated.body.note, 'Updated note');

  await client.close();
  await mongod.stop();
});
