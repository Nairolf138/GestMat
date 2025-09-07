const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
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
  await db
    .collection('loanrequests')
    .insertMany([
      { status: 'pending' },
      { status: 'accepted' },
      { status: 'accepted' },
    ]);
  const res = await request(app)
    .get('/api/stats/loans')
    .set(auth())
    .expect(200);
  const counts = Object.fromEntries(
    res.body.map(({ _id, count }) => [_id, count]),
  );
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

test('GET /api/stats/loans/monthly aggregates by month', async () => {
  const { app, client, mongod, db } = await createApp();
  await db
    .collection('loanrequests')
    .insertMany([
      { startDate: new Date('2023-01-15') },
      { startDate: new Date('2023-01-20') },
      { startDate: new Date('2023-02-10') },
    ]);
  const res = await request(app)
    .get('/api/stats/loans/monthly')
    .set(auth())
    .expect(200);
  const counts = Object.fromEntries(
    res.body.map(({ _id, count }) => [_id, count]),
  );
  assert.strictEqual(counts['2023-01'], 2);
  assert.strictEqual(counts['2023-02'], 1);
  await client.close();
  await mongod.stop();
});

test('GET /api/stats/loans/monthly applies date range and fills empty months', async () => {
  const { app, client, mongod, db } = await createApp();
  await db
    .collection('loanrequests')
    .insertMany([
      { startDate: new Date('2022-12-15') },
      { startDate: new Date('2023-01-10') },
      { startDate: new Date('2023-03-05') },
      { startDate: new Date('2023-05-01') },
    ]);
  const res = await request(app)
    .get('/api/stats/loans/monthly?from=2023-01-01&to=2023-04-30')
    .set(auth())
    .expect(200);
  const labels = res.body.map((m) => m._id);
  assert.deepStrictEqual(labels, ['2023-01', '2023-02', '2023-03', '2023-04']);
  const counts = Object.fromEntries(
    res.body.map(({ _id, count }) => [_id, count]),
  );
  assert.strictEqual(counts['2023-01'], 1);
  assert.strictEqual(counts['2023-02'], 0);
  assert.strictEqual(counts['2023-03'], 1);
  assert.strictEqual(counts['2023-04'], 0);
  await client.close();
  await mongod.stop();
});

test('GET /api/stats/loans/duration computes average and median', async () => {
  const { app, client, mongod, db } = await createApp();
  await db.collection('loanrequests').insertMany([
    { startDate: new Date('2023-01-01'), endDate: new Date('2023-01-11') }, // 10 days
    { startDate: new Date('2023-01-01'), endDate: new Date('2023-01-21') }, // 20 days
    { startDate: new Date('2023-01-01'), endDate: new Date('2023-01-31') }, // 30 days
  ]);
  const res = await request(app)
    .get('/api/stats/loans/duration?median=true')
    .set(auth())
    .expect(200);
  assert.strictEqual(res.body.average, 20);
  assert.strictEqual(res.body.median, 20);
  await client.close();
  await mongod.stop();
});

test('GET /api/stats/equipments/top returns aggregated equipment counts', async () => {
  const { app, client, mongod, db } = await createApp();
  const e1 = new ObjectId();
  const e2 = new ObjectId();
  await db.collection('equipments').insertMany([
    { _id: e1, name: 'Eq1' },
    { _id: e2, name: 'Eq2' },
  ]);
  await db.collection('loanrequests').insertMany([
    { items: [{ equipment: e1, quantity: 2 }] },
    {
      items: [
        { equipment: e1, quantity: 1 },
        { equipment: e2, quantity: 1 },
      ],
    },
  ]);
  const res = await request(app)
    .get('/api/stats/equipments/top?limit=1')
    .set(auth())
    .expect(200);
  assert.strictEqual(res.body.length, 1);
  assert.strictEqual(res.body[0]._id.toString(), e1.toString());
  assert.strictEqual(res.body[0].count, 3);
  assert.strictEqual(res.body[0].name, 'Eq1');
  await client.close();
  await mongod.stop();
});

test('new stats routes require auth', async () => {
  const { app, client, mongod } = await createApp();
  await request(app).get('/api/stats/loans/monthly').expect(401);
  await request(app).get('/api/stats/equipments/top').expect(401);
  await request(app).get('/api/stats/loans/duration').expect(401);
  await client.close();
  await mongod.stop();
});
