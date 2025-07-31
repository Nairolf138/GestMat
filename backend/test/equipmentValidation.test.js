const test = require('node:test');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test';

const equipmentRoutes = require('../src/routes/equipments');

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
  const payload = { name: 'Mic', type: 'Son', totalQty: 2, availableQty: 3 };
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
    .send({ name: 'Mic', type: 'Son', totalQty: 2, availableQty: 1 })
    .expect(200);

  await request(app)
    .put(`/api/equipments/${valid.body._id}`)
    .set(auth())
    .send({ totalQty: 2, availableQty: 3 })
    .expect(400);

  await client.close();
  await mongod.stop();
});
