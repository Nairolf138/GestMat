const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');

const rolesRoutes = require('../src/routes/roles').default;

async function createApp() {
  const mongod = await MongoMemoryReplSet.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  app.use('/api/roles', rolesRoutes);
  return { app, client, mongod, db };
}

test('GET /api/roles returns sorted role names', async () => {
  const { app, client, mongod, db } = await createApp();
  await db.collection('roles').insertMany([{ name: 'B' }, { name: 'A' }]);
  const res = await request(app).get('/api/roles').expect(200);
  assert.deepStrictEqual(res.body, ['A', 'B']);
  await client.close();
  await mongod.stop();
});

test('GET /api/roles handles database errors', async () => {
  const { app, client, mongod } = await createApp();
  await client.close();
  await request(app).get('/api/roles').expect(500);
  await mongod.stop();
});
