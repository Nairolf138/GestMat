const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const cors = require('cors');

process.env.JWT_SECRET = 'test';
const structureRoutes = require('../src/routes/structures').default;

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
  app.use('/api/structures', structureRoutes);
  return { app, client, mongod, allowedOrigin };
}

test('GET /api/structures is public', async () => {
  const { app, client, mongod } = await createApp();
  await dbSetup(client.db());
  const res = await request(app).get('/api/structures').expect(200);
  assert.ok(Array.isArray(res.body));
  assert.strictEqual(res.body.length, 2);
  await client.close();
  await mongod.stop();
});

test('GET /api/structures includes CORS header', async () => {
  const { app, client, mongod, allowedOrigin } = await createApp();
  await dbSetup(client.db());
  const res = await request(app)
    .get('/api/structures')
    .set('Origin', allowedOrigin)
    .expect(200);
  assert.strictEqual(res.headers['access-control-allow-origin'], allowedOrigin);
  await client.close();
  await mongod.stop();
});

async function dbSetup(db) {
  await db
    .collection('structures')
    .insertMany([{ name: 'S1' }, { name: 'S2' }]);
}
