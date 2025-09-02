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
function auth() {
  const token = jwt.sign({ id: userId }, 'test', { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

test('create, update and delete loan request', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const structId = (await db.collection('structures').insertOne({ name: 'S1' })).insertedId;
  const eqId = (
    await db.collection('equipments').insertOne({ name: 'E1', totalQty: 1 })
  ).insertedId;
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: structId });

  const payload = {
    owner: structId.toString(),
    borrower: structId.toString(),
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
    .set(auth())
    .send({ status: 'accepted' })
    .expect(200);
  assert.strictEqual(upd.body.status, 'accepted');
  assert.strictEqual(upd.body.processedBy._id.toString(), userId);

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
  const structId = (await db.collection('structures').insertOne({ name: 'S1' })).insertedId;
  const eqId = (
    await db.collection('equipments').insertOne({ name: 'E1', totalQty: 1 })
  ).insertedId;
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: structId });

  const payload = {
    owner: structId.toString(),
    borrower: structId.toString(),
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

test('delete loan request unauthorized returns 403', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const struct1 = (await db.collection('structures').insertOne({ name: 'S1' })).insertedId;
  const struct2 = (await db.collection('structures').insertOne({ name: 'S2' })).insertedId;
  await db.collection('users').insertOne({ _id: new ObjectId(userId), structure: struct1 });
  const loanId = (
    await db.collection('loanrequests').insertOne({ owner: struct2, borrower: struct2 })
  ).insertedId;
  await request(app).delete(`/api/loans/${loanId}`).set(auth()).expect(403);
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

  await request(app).delete(`/api/loans/${loanId}`).set(auth()).expect(403);

  const loan = await db.collection('loanrequests').findOne({ _id: loanId });
  assert.ok(loan);

  await client.close();
  await mongod.stop();
});

test('borrower can update and delete future loan', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const owner = (await db.collection('structures').insertOne({ name: 'O' })).insertedId;
  const borrower = (await db.collection('structures').insertOne({ name: 'B' })).insertedId;
  const eqId = (
    await db.collection('equipments').insertOne({ name: 'E', totalQty: 1 })
  ).insertedId;
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: borrower });

  const payload = {
    owner: owner.toString(),
    borrower: borrower.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2099-01-01',
    endDate: '2099-01-02',
  };

  const res = await request(app)
    .post('/api/loans')
    .set(auth())
    .send(payload)
    .expect(200);
  const id = res.body._id;

  await request(app)
    .put(`/api/loans/${id}`)
    .set(auth())
    .send({ startDate: '2099-01-05' })
    .expect(200);

  await request(app)
    .put(`/api/loans/${id}`)
    .set(auth())
    .send({ status: 'accepted' })
    .expect(403);

  await request(app)
    .put(`/api/loans/${id}`)
    .set(auth())
    .send({ status: 'cancelled' })
    .expect(200);

  await request(app).delete(`/api/loans/${id}`).set(auth()).expect(200);

  await client.close();
  await mongod.stop();
});

test('borrower cannot update or delete past accepted loan', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const owner = (await db.collection('structures').insertOne({ name: 'O' })).insertedId;
  const borrower = (await db.collection('structures').insertOne({ name: 'B' })).insertedId;
  const eqId = (
    await db.collection('equipments').insertOne({ name: 'E', totalQty: 1 })
  ).insertedId;
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: borrower });

  const pastPayload = {
    owner: owner.toString(),
    borrower: borrower.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2000-01-01',
    endDate: '2000-01-02',
  };

  const past = await request(app)
    .post('/api/loans')
    .set(auth())
    .send(pastPayload)
    .expect(200);
  const pastId = past.body._id;

  await request(app)
    .put(`/api/loans/${pastId}`)
    .set(auth())
    .send({ status: 'accepted' })
    .expect(403);

  const delId = (
    await db.collection('loanrequests').insertOne({
      owner,
      borrower,
      startDate: new Date('2000-01-01'),
      endDate: new Date('2000-01-02'),
      status: 'accepted',
    })
  ).insertedId;

  await request(app).delete(`/api/loans/${delId}`).set(auth()).expect(403);
  const loan = await db.collection('loanrequests').findOne({ _id: delId });
  assert.ok(loan);

  await client.close();
  await mongod.stop();
});

test('owner can only update status and cannot delete', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const owner = (await db.collection('structures').insertOne({ name: 'O' })).insertedId;
  const borrower = (await db.collection('structures').insertOne({ name: 'B' })).insertedId;
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: owner });

  const loanId = (
    await db.collection('loanrequests').insertOne({
      owner,
      borrower,
      startDate: new Date('2099-01-01'),
      endDate: new Date('2099-01-02'),
    })
  ).insertedId;

  await request(app)
    .put(`/api/loans/${loanId}`)
    .set(auth())
    .send({ startDate: '2099-01-05' })
    .expect(403);

  await request(app)
    .put(`/api/loans/${loanId}`)
    .set(auth())
    .send({ status: 'cancelled' })
    .expect(403);

  await request(app)
    .put(`/api/loans/${loanId}`)
    .set(auth())
    .send({ status: 'accepted' })
    .expect(200);

  await request(app)
    .delete(`/api/loans/${loanId}`)
    .set(auth())
    .expect(403);

  await client.close();
  await mongod.stop();
});
