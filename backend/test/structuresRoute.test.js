const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const cors = require('cors');

process.env.JWT_SECRET = 'test';
const structureRoutes = require('../src/routes/structures').default;
const { withApiPrefix } = require('./utils/apiPrefix');

async function createApp(allowedOrigin = 'http://allowed.test') {
  const mongod = await MongoMemoryReplSet.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const app = express();
  app.use(express.json());
  app.use(cors({ origin: allowedOrigin }));
  app.locals.db = db;
  app.use(withApiPrefix('/structures'), structureRoutes);
  return { app, client, mongod, allowedOrigin };
}

test('GET structures is public', async () => {
  const { app, client, mongod } = await createApp();
  await dbSetup(client.db());
  const res = await request(app).get(withApiPrefix('/structures')).expect(200);
  assert.ok(Array.isArray(res.body));
  assert.strictEqual(res.body.length, 2);
  await client.close();
  await mongod.stop();
});

test('GET structures includes CORS header', async () => {
  const { app, client, mongod, allowedOrigin } = await createApp();
  await dbSetup(client.db());
  const res = await request(app)
    .get(withApiPrefix('/structures'))
    .set('Origin', allowedOrigin)
    .expect(200);
  assert.strictEqual(res.headers['access-control-allow-origin'], allowedOrigin);
  await client.close();
  await mongod.stop();
});

test('structures routes respond when API_PREFIX is empty', async () => {
  const originalPrefix = process.env.API_PREFIX;
  process.env.API_PREFIX = '';
  const { app, client, mongod } = await createApp();
  try {
    await dbSetup(client.db());
    const res = await request(app).get(withApiPrefix('/structures')).expect(200);
    assert.ok(Array.isArray(res.body));
  } finally {
    await client.close();
    await mongod.stop();
    if (originalPrefix === undefined) {
      delete process.env.API_PREFIX;
    } else {
      process.env.API_PREFIX = originalPrefix;
    }
  }
});

async function dbSetup(db) {
  await db
    .collection('structures')
    .insertMany([{ name: 'S1' }, { name: 'S2' }]);
}
