const test = require('node:test');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test';

const loanRoutes = require('../src/routes/loans');

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

function auth() {
  const token = jwt.sign({ id: 'u1' }, 'test', { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

test('post validates ids and status', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const structId = (await db.collection('structures').insertOne({ name: 'S1' })).insertedId;
  const eqId = (
    await db
      .collection('equipments')
      .insertOne({ name: 'E1', totalQty: 1, availableQty: 1 })
  ).insertedId;

  const base = {
    owner: structId.toString(),
    borrower: structId.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2024-01-01',
    endDate: '2024-01-02'
  };

  await request(app)
    .post('/api/loans')
    .set(auth())
    .send({ ...base, owner: 'badid' })
    .expect(400);

  await request(app)
    .post('/api/loans')
    .set(auth())
    .send({ ...base, items: [{ equipment: 'bad', quantity: 1 }] })
    .expect(400);

  await request(app)
    .post('/api/loans')
    .set(auth())
    .send({ ...base, status: 'wrong' })
    .expect(400);

  await client.close();
  await mongod.stop();
});

test('put validates status', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const structId = (await db.collection('structures').insertOne({ name: 'S1' })).insertedId;
  const eqId = (
    await db
      .collection('equipments')
      .insertOne({ name: 'E1', totalQty: 1, availableQty: 1 })
  ).insertedId;

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

  await request(app)
    .put(`/api/loans/${res.body._id}`)
    .set(auth())
    .send({ status: 'bad' })
    .expect(400);

  await client.close();
  await mongod.stop();
});
