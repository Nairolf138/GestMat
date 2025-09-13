const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test';

const equipmentRoutes = require('../src/routes/equipments').default;
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
  app.use('/api/equipments', equipmentRoutes);
  return { app, client, mongod };
}

function auth(role = ADMIN_ROLE) {
  const token = jwt.sign({ id: 'u1', role }, 'test', {
    expiresIn: '1h',
  });
  return { Authorization: `Bearer ${token}` };
}

test('concurrent equipment creation enforces unique name', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  await db.collection('equipments').createIndex({ name: 1 }, { unique: true });

  const payload = { name: 'Mic', type: 'Son', condition: 'Neuf', totalQty: 1 };
  const results = await Promise.allSettled([
    request(app).post('/api/equipments').set(auth()).send(payload),
    request(app).post('/api/equipments').set(auth()).send(payload),
  ]);
  const statuses = results.map((r) => r.value?.statusCode || r.reason?.status);
  assert.ok(statuses.includes(200));
  assert.ok(statuses.some((s) => s >= 400));
  const count = await db.collection('equipments').countDocuments();
  assert.strictEqual(count, 1);
  await client.close();
  await mongod.stop();
});
