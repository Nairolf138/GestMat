const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test';
const statsRoutes = require('../src/routes/stats').default;

async function createApp() {
  const mongod = await MongoMemoryReplSet.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  app.use('/api/stats', statsRoutes);
  return { app, client, mongod, db };
}

function auth(role = 'Administrateur') {
  const token = jwt.sign({ id: 'u1', role }, 'test', { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

test('GET /api/stats/loans returns aggregated counts', async () => {
  const { app, client, mongod, db } = await createApp();
  await db.collection('loanrequests').insertMany([
    { status: 'pending' },
    { status: 'accepted' },
    { status: 'accepted' },
  ]);
  const res = await request(app)
    .get('/api/stats/loans')
    .set(auth())
    .expect(200);
  const counts = Object.fromEntries(res.body.map(({ _id, count }) => [_id, count]));
  assert.strictEqual(counts.pending, 1);
  assert.strictEqual(counts.accepted, 2);
  await client.close();
  await mongod.stop();
});

test('GET /api/stats/loans requires auth', async () => {
  const { app, client, mongod } = await createApp();
  await request(app).get('/api/stats/loans').expect(401);
  await request(app)
    .get('/api/stats/loans')
    .set({ Authorization: 'Bearer badtoken' })
    .expect(401);
  await client.close();
  await mongod.stop();
});
