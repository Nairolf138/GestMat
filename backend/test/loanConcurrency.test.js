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
const { ADMIN_ROLE } = require('../src/config/roles');

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
function auth(role = ADMIN_ROLE) {
  const token = jwt.sign({ id: userId, role }, 'test', { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

test('concurrent loan creation only allows one reservation', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const structId = (await db.collection('structures').insertOne({ name: 'S1' }))
    .insertedId;
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

  const results = await Promise.allSettled([
    request(app).post('/api/loans').set(auth()).send(payload),
    request(app).post('/api/loans').set(auth()).send(payload),
  ]);
  const statuses = results.map((r) => r.value?.statusCode || r.reason?.status);
  assert.ok(statuses.includes(400));
  const count = await db.collection('loanrequests').countDocuments();
  assert.ok(count <= 1);
  await client.close();
  await mongod.stop();
});
