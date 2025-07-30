const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test';

const loanRoutes = require('../src/routes/loans');
const mailer = require('../src/utils/sendMail');

async function createApp() {
  const mongod = await MongoMemoryServer.create();
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
  mailer.sendMail = async () => {};
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const structId = (await db.collection('structures').insertOne({ name: 'S1' })).insertedId;
  const eqId = (await db.collection('equipments').insertOne({ name: 'E1' })).insertedId;
  await db.collection('users').insertOne({ _id: new ObjectId(userId), structure: structId });

  const payload = {
    owner: structId.toString(),
    borrower: structId.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2024-01-01',
    endDate: '2024-01-02'
  };

  const res = await request(app)
    .post('/api/loans')
    .set(auth())
    .send(payload)
    .expect(200);
  assert.ok(res.body._id);

  const list1 = await request(app).get('/api/loans').set(auth()).expect(200);
  assert.strictEqual(list1.body.length, 1);

  const id = res.body._id;
  const upd = await request(app)
    .put(`/api/loans/${id}`)
    .set(auth())
    .send({ status: 'accepted' })
    .expect(200);
  assert.strictEqual(upd.body.status, 'accepted');

  await request(app).delete(`/api/loans/${id}`).set(auth()).expect(200);
  const list2 = await request(app).get('/api/loans').set(auth()).expect(200);
  assert.strictEqual(list2.body.length, 0);

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
