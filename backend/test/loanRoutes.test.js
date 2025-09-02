const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test';

const loanRoutes = require('../src/routes/loans').default;
const mailer = require('../src/utils/sendMail');
mailer.sendMail = async () => {};
const { checkEquipmentAvailability } = require('../src/utils/checkAvailability');

async function createApp() {
  const mongod = await MongoMemoryReplSet.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  app.use('/api/loans', loanRoutes);
  return { app, client, mongod };
}

const userId = new ObjectId().toString();
function auth(role = 'Administrateur') {
  const token = jwt.sign({ id: userId, role }, 'test', { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

test('create, update and delete loan request', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const owner = (await db.collection('structures').insertOne({ name: 'S1' })).insertedId;
  const borrower = (await db.collection('structures').insertOne({ name: 'S2' })).insertedId;
  const eqId = (
    await db.collection('equipments').insertOne({ name: 'E1', totalQty: 1, structure: owner })
  ).insertedId;
  const ownerUser = new ObjectId();
  await db.collection('users').insertMany([
    { _id: ownerUser, structure: owner },
    { _id: new ObjectId(userId), structure: borrower },
  ]);
    const ownerToken = jwt.sign(
      { id: ownerUser.toString(), role: 'Administrateur' },
      'test',
      { expiresIn: '1h' }
    );

  const payload = {
    owner: owner.toString(),
    borrower: borrower.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2024-01-01',
    endDate: '2024-01-02',
  };

  const res = await request(app)
    .post('/api/loans')
    .set(auth())
    .send(payload)
    .expect(200);
  assert.ok(res.body._id);
  assert.strictEqual(res.body.requestedBy._id.toString(), userId);
  const start = new Date('2024-01-01');
  const end = new Date('2024-01-02');
  const availAfterCreate = await checkEquipmentAvailability(
    db,
    eqId.toString(),
    start,
    end,
    1
  );
  assert.strictEqual(availAfterCreate.availableQty, 0);

  const list1 = await request(app).get('/api/loans').set(auth()).expect(200);
  assert.strictEqual(list1.body.length, 1);

  const id = res.body._id;
  const upd = await request(app)
    .put(`/api/loans/${id}`)
    .set({ Authorization: `Bearer ${ownerToken}` })
    .send({ status: 'accepted' })
    .expect(200);
  assert.strictEqual(upd.body.status, 'accepted');
  assert.strictEqual(upd.body.processedBy._id.toString(), ownerUser.toString());

  await request(app).delete(`/api/loans/${id}`).set(auth()).expect(200);
  const availAfterDelete = await checkEquipmentAvailability(
    db,
    eqId.toString(),
    start,
    end,
    1
  );
  assert.strictEqual(availAfterDelete.availableQty, 1);
  const list2 = await request(app).get('/api/loans').set(auth()).expect(200);
  assert.strictEqual(list2.body.length, 0);

  // loan can be created again after deletion (return scenario)
  const res2 = await request(app)
    .post('/api/loans')
    .set(auth())
    .send(payload)
    .expect(200);
  assert.ok(res2.body._id);

  await client.close();
  await mongod.stop();
});

test('loan creation fails on quantity conflict', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const owner = (await db.collection('structures').insertOne({ name: 'S1' })).insertedId;
  const borrower = (await db.collection('structures').insertOne({ name: 'S2' })).insertedId;
  const eqId = (
    await db.collection('equipments').insertOne({ name: 'E1', totalQty: 1, structure: owner })
  ).insertedId;
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: borrower });

  const payload = {
    owner: owner.toString(),
    borrower: borrower.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2024-01-01',
    endDate: '2024-01-02',
  };

  await request(app)
    .post('/api/loans')
    .set(auth())
    .send(payload)
    .expect(200);

  await request(app)
    .post('/api/loans')
    .set(auth())
    .send(payload)
    .expect(400);

  await client.close();
  await mongod.stop();
});

test('reject loan request to own structure', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const struct = (await db.collection('structures').insertOne({ name: 'S' })).insertedId;
  const eqId = (
    await db.collection('equipments').insertOne({ name: 'E', totalQty: 1, structure: struct })
  ).insertedId;
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: struct });

  const payload = {
    owner: struct.toString(),
    borrower: struct.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2024-01-01',
    endDate: '2024-01-02',
  };

  await request(app)
    .post('/api/loans')
    .set(auth())
    .send(payload)
    .expect(403);

  await client.close();
  await mongod.stop();
});

test('delete loan request unauthorized returns 403', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const struct1 = (await db.collection('structures').insertOne({ name: 'S1' })).insertedId;
  const struct2 = (await db.collection('structures').insertOne({ name: 'S2' })).insertedId;
  await db.collection('users').insertOne({ _id: new ObjectId(userId), structure: struct1 });
  const loanId = (
    await db.collection('loanrequests').insertOne({ owner: struct2, borrower: struct2 })
  ).insertedId;
  await request(app).delete(`/api/loans/${loanId}`).set(auth('Autre')).expect(403);
  await client.close();
  await mongod.stop();
});

test('unauthorized delete does not remove loan', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const struct1 = (await db.collection('structures').insertOne({ name: 'S1' })).insertedId;
  const struct2 = (await db.collection('structures').insertOne({ name: 'S2' })).insertedId;
  await db.collection('users').insertOne({ _id: new ObjectId(userId), structure: struct1 });
  const loanId = (
    await db.collection('loanrequests').insertOne({ owner: struct2, borrower: struct2 })
  ).insertedId;

  await request(app).delete(`/api/loans/${loanId}`).set(auth('Autre')).expect(403);

  const loan = await db.collection('loanrequests').findOne({ _id: loanId });
  assert.ok(loan);

  await client.close();
  await mongod.stop();
});

test('non-admin cannot create, update or delete loan', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const struct = (await db.collection('structures').insertOne({ name: 'S1' })).insertedId;
  const eqId = (await db.collection('equipments').insertOne({ name: 'E1', totalQty: 1 })).insertedId;
  const payload = {
    owner: struct.toString(),
    borrower: struct.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2024-01-01',
    endDate: '2024-01-02',
  };
  await request(app)
    .post('/api/loans')
    .set(auth('Autre'))
    .send(payload)
    .expect(403);
  const created = await request(app)
    .post('/api/loans')
    .set(auth())
    .send(payload)
    .expect(200);
  await request(app)
    .put(`/api/loans/${created.body._id}`)
    .set(auth('Autre'))
    .send({ status: 'accepted' })
    .expect(403);
  await request(app)
    .delete(`/api/loans/${created.body._id}`)
    .set(auth('Autre'))
    .expect(403);
  await client.close();
  await mongod.stop();
});
