const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test';

const equipmentRoutes = require('../src/routes/equipments').default;

async function createApp() {
  const mongod = await MongoMemoryReplSet.create();
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
  const token = jwt.sign({ id: 'u1', role: 'Administrateur' }, 'test', {
    expiresIn: '1h'
  });
  return { Authorization: `Bearer ${token}` };
}

test('availableQty cannot exceed totalQty on create and update', async () => {
  const { app, client, mongod } = await createApp();
  const payload = { name: 'Mic', type: 'Son', condition: 'Neuf', totalQty: 2, availableQty: 3 };
  const res1 = await request(app)
    .post('/api/equipments')
    .set(auth())
    .send(payload)
    .expect(400);
  if (!res1.body.errors?.some(e => e.msg.includes('cannot exceed'))) {
    throw new Error('Expected validation error for availableQty');
  }

  const valid = await request(app)
    .post('/api/equipments')
    .set(auth())
    .send({ name: 'Mic', type: 'Son', condition: 'Neuf', totalQty: 2, availableQty: 1 })
    .expect(200);

  await request(app)
    .put(`/api/equipments/${valid.body._id}`)
    .set(auth())
    .send({ totalQty: 2, availableQty: 3 })
    .expect(400);

  await client.close();
  await mongod.stop();
});

test('reject invalid type values and normalize case/accents', async () => {
  const { app, client, mongod } = await createApp();

  // invalid type on create
  const res1 = await request(app)
    .post('/api/equipments')
    .set(auth())
    .send({ name: 'Mic', type: 'Unknown', condition: 'Neuf', totalQty: 1 })
    .expect(400);
  if (!res1.body.errors?.some((e) => e.msg.includes('Type'))) {
    throw new Error('Expected validation error for type');
  }

  // valid type variation on create
  const res2 = await request(app)
    .post('/api/equipments')
    .set(auth())
    .send({ name: 'Light', type: 'lumiere', condition: 'Neuf', totalQty: 1, availableQty: 1 })
    .expect(200);
  assert.strictEqual(res2.body.type, 'Lumière');

  const id = res2.body._id;

  // invalid type on update
  await request(app)
    .put(`/api/equipments/${id}`)
    .set(auth())
    .send({ type: 'bad' })
    .expect(400);

  // valid type variation on update
  const res3 = await request(app)
    .put(`/api/equipments/${id}`)
    .set(auth())
    .send({ type: 'son' })
    .expect(200);
  assert.strictEqual(res3.body.type, 'Son');

  await client.close();
  await mongod.stop();
});
