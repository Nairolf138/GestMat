const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test';

const equipmentRoutes = require('../src/routes/equipments');

async function createApp() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  app.use('/api/equipments', equipmentRoutes);
  return { app, client, mongod };
}

function auth() {
  const token = jwt.sign({ id: 'u1', role: 'Administrateur' }, 'test');
  return { Authorization: `Bearer ${token}` };
}

test('create, list, update and delete equipments', async () => {
  const { app, client, mongod } = await createApp();
  const newEq = { name: 'Mic', type: 'Son', totalQty: 2, availableQty: 1 };
  const res = await request(app)
    .post('/api/equipments')
    .set(auth())
    .send(newEq)
    .expect(200);
  assert.ok(res.body._id);

  const list1 = await request(app).get('/api/equipments').set(auth()).expect(200);
  assert.strictEqual(list1.body.length, 1);

  const id = res.body._id;
  const upd = await request(app)
    .put(`/api/equipments/${id}`)
    .set(auth())
    .send({ location: 'store' })
    .expect(200);
  assert.strictEqual(upd.body.location, 'store');

  await request(app).delete(`/api/equipments/${id}`).set(auth()).expect(200);
  const list2 = await request(app).get('/api/equipments').set(auth()).expect(200);
  assert.strictEqual(list2.body.length, 0);

  await client.close();
  await mongod.stop();
});

test('check availability endpoint', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const eqId = (await db.collection('equipments').insertOne({ name: 'Mic', type: 'Son', totalQty: 5 })).insertedId;
  await db.collection('loanrequests').insertOne({
    items: [{ equipment: eqId, quantity: 3 }],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-10'),
    status: 'accepted',
  });

  const res = await request(app)
    .get(`/api/equipments/${eqId}/availability?start=2024-01-05&end=2024-01-06&quantity=3`)
    .set(auth())
    .expect(200);
  assert.strictEqual(res.body.available, false);

  const res2 = await request(app)
    .get(`/api/equipments/${eqId}/availability?start=2024-02-01&end=2024-02-02&quantity=3`)
    .set(auth())
    .expect(200);
  assert.strictEqual(res2.body.available, true);

  await client.close();
  await mongod.stop();
});
