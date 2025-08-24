const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');

process.env.JWT_SECRET = 'test';
const structureRoutes = require('../src/routes/structures').default;

async function createApp() {
  const mongod = await MongoMemoryReplSet.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  app.use('/api/structures', structureRoutes);
  return { app, client, mongod };
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

async function dbSetup(db) {
  await db.collection('structures').insertMany([{ name: 'S1' }, { name: 'S2' }]);
}
