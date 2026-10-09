const { accountHeaders } = require('./utils/accountFixture');
let fixtureDb;
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
  app.use(withApiPrefix('/equipments'), equipmentRoutes);
  return { app, client, mongod };
}

async function auth(role = ADMIN_ROLE) {
  return accountHeaders(fixtureDb, 'u1', role, undefined);
}

test('concurrent equipment creation enforces unique name', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  await db.collection('equipments').createIndex({ name: 1 }, { unique: true });

  const payload = { name: 'Mic', type: 'Son', condition: 'Neuf', totalQty: 1 };
  const results = await Promise.allSettled([
    request(app)
      .post(withApiPrefix('/equipments'))
      .set(await auth())
      .send(payload),
    request(app)
      .post(withApiPrefix('/equipments'))
      .set(await auth())
      .send(payload),
  ]);
  const statuses = results.map((r) => r.value?.statusCode || r.reason?.status);
  assert.ok(statuses.includes(200));
  assert.ok(statuses.some((s) => s >= 400));
  const count = await db.collection('equipments').countDocuments();
  assert.strictEqual(count, 1);
  await client.close();
  await mongod.stop();
});
