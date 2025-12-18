const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test';
const statsRoutes = require('../src/routes/stats').default;
const { ADMIN_ROLE, REGISSEUR_GENERAL_ROLE } = require('../src/config/roles');
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
  app.use(withApiPrefix('/stats'), statsRoutes);
  return { app, client, mongod, db };
}

function auth(role = ADMIN_ROLE) {
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
    .get(withApiPrefix('/stats/loans'))
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

test('GET /api/stats/loans requires admin role', async () => {
  const { app, client, mongod } = await createApp();
  await request(app).get(withApiPrefix('/stats/loans')).expect(401);
  await request(app)
    .get(withApiPrefix('/stats/loans'))
    .set({ Authorization: 'Bearer badtoken' })
    .expect(401);
  await request(app)
    .get(withApiPrefix('/stats/loans'))
    .set(auth(REGISSEUR_GENERAL_ROLE))
    .expect(403);
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
    .get(withApiPrefix('/stats/loans/monthly'))
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
    .get(withApiPrefix('/stats/loans/monthly?from=2023-01-01&to=2023-04-30'))
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
    .get(withApiPrefix('/stats/loans/duration?median=true'))
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
    .get(withApiPrefix('/stats/equipments/top?limit=1'))
    .set(auth())
    .expect(200);
  assert.strictEqual(res.body.length, 1);
  assert.strictEqual(res.body[0]._id.toString(), e1.toString());
  assert.strictEqual(res.body[0].count, 3);
  assert.strictEqual(res.body[0].name, 'Eq1');
  await client.close();
  await mongod.stop();
});

test('GET /api/stats/equipments/top-refused aggregates refused equipment quantities', async () => {
  const { app, client, mongod, db } = await createApp();
  const e1 = new ObjectId();
  const e2 = new ObjectId();

  await db.collection('equipments').insertMany([
    { _id: e1, name: 'Refused 1' },
    { _id: e2, name: 'Refused 2' },
  ]);

  await db.collection('loanrequests').insertMany([
    {
      status: 'refused',
      items: [
        { equipment: e1, quantity: 2 },
        { equipment: e2, quantity: 1 },
      ],
    },
    { status: 'accepted', items: [{ equipment: e1, quantity: 10 }] },
    { status: 'refused', items: [{ equipment: e1, quantity: 1 }] },
  ]);

  const res = await request(app)
    .get(withApiPrefix('/stats/equipments/top-refused?limit=2'))
    .set(auth())
    .expect(200);

  assert.strictEqual(res.body.length, 2);
  const ranking = Object.fromEntries(res.body.map(({ name, count }) => [name, count]));
  assert.strictEqual(ranking['Refused 1'], 3);
  assert.strictEqual(ranking['Refused 2'], 1);

  await client.close();
  await mongod.stop();
});

test('stats routes are restricted to admins', async () => {
  const { app, client, mongod } = await createApp();
  await request(app).get(withApiPrefix('/stats/loans/monthly')).expect(401);
  await request(app).get(withApiPrefix('/stats/equipments/top')).expect(401);
  await request(app).get(withApiPrefix('/stats/equipments/top-refused')).expect(401);
  await request(app).get(withApiPrefix('/stats/loans/duration')).expect(401);
  await request(app).get(withApiPrefix('/stats/vehicles/status')).expect(401);
  await request(app).get(withApiPrefix('/stats/vehicles/usage')).expect(401);
  await request(app).get(withApiPrefix('/stats/vehicles/occupancy')).expect(401);
  await request(app).get(withApiPrefix('/stats/vehicles/mileage')).expect(401);

  const nonAdmin = auth(REGISSEUR_GENERAL_ROLE);
  await request(app)
    .get(withApiPrefix('/stats/loans/monthly'))
    .set(nonAdmin)
    .expect(403);
  await request(app)
    .get(withApiPrefix('/stats/equipments/top'))
    .set(nonAdmin)
    .expect(403);
  await request(app)
    .get(withApiPrefix('/stats/equipments/top-refused'))
    .set(nonAdmin)
    .expect(403);
  await request(app)
    .get(withApiPrefix('/stats/loans/duration'))
    .set(nonAdmin)
    .expect(403);
  await request(app)
    .get(withApiPrefix('/stats/vehicles/status'))
    .set(nonAdmin)
    .expect(403);
  await request(app)
    .get(withApiPrefix('/stats/vehicles/usage'))
    .set(nonAdmin)
    .expect(403);
  await request(app)
    .get(withApiPrefix('/stats/vehicles/occupancy'))
    .set(nonAdmin)
    .expect(403);
  await request(app)
    .get(withApiPrefix('/stats/vehicles/mileage'))
    .set(nonAdmin)
    .expect(403);

  await client.close();
  await mongod.stop();
});

test('GET /api/stats/vehicles/status filters by reservation overlap', async () => {
  const { app, client, mongod, db } = await createApp();
  await db.collection('vehicles').insertMany([
    {
      status: 'Available',
      reservations: [{ start: new Date('2024-01-05'), end: new Date('2024-01-10') }],
    },
    {
      status: 'maintenance',
      reservations: [{ start: new Date('2024-02-01'), end: new Date('2024-02-05') }],
    },
    {
      status: 'retired',
      reservations: [],
    },
  ]);

  const res = await request(app)
    .get(withApiPrefix('/stats/vehicles/status?from=2024-01-01&to=2024-01-31'))
    .set(auth())
    .expect(200);

  const counts = Object.fromEntries(res.body.map(({ _id, count }) => [_id, count]));
  assert.strictEqual(counts.available, 1);
  assert.strictEqual(counts.maintenance, undefined);
  assert.strictEqual(counts.retired, undefined);

  await client.close();
  await mongod.stop();
});

test('GET /api/stats/vehicles/usage aggregates usages', async () => {
  const { app, client, mongod, db } = await createApp();
  await db.collection('vehicles').insertMany([
    { usage: 'Technique' },
    { usage: 'technique' },
    { usage: 'Logistique' },
    {},
  ]);

  const res = await request(app)
    .get(withApiPrefix('/stats/vehicles/usage'))
    .set(auth())
    .expect(200);

  const counts = Object.fromEntries(res.body.map(({ _id, count }) => [_id, count]));
  assert.strictEqual(counts.technique, 2);
  assert.strictEqual(counts.logistique, 1);
  assert.strictEqual(counts.unknown, 1);

  await client.close();
  await mongod.stop();
});

test('GET /api/stats/vehicles/occupancy validates parameters and computes ratio', async () => {
  const { app, client, mongod, db } = await createApp();

  await db.collection('vehicles').insertMany([
    {
      reservations: [{ start: new Date('2024-03-01'), end: new Date('2024-03-05') }],
    },
    {
      reservations: [{ start: new Date('2024-04-10'), end: new Date('2024-04-12') }],
    },
    { reservations: [] },
  ]);

  await request(app)
    .get(withApiPrefix('/stats/vehicles/occupancy'))
    .set(auth())
    .expect(400);

  const res = await request(app)
    .get(withApiPrefix('/stats/vehicles/occupancy?from=2024-03-01&to=2024-03-31'))
    .set(auth())
    .expect(200);

  assert.strictEqual(res.body.reserved, 1);
  assert.strictEqual(res.body.total, 3);
  assert.strictEqual(res.body.ratio, 1 / 3);

  await client.close();
  await mongod.stop();
});

test('GET /api/stats/vehicles/mileage sums kilometers and downtime days', async () => {
  const { app, client, mongod, db } = await createApp();

  await db.collection('vehicles').insertMany([
    { kilometersTraveled: 1000, downtimeDays: 3 },
    { kilometersTraveled: 500 },
    {},
  ]);

  const res = await request(app)
    .get(withApiPrefix('/stats/vehicles/mileage'))
    .set(auth())
    .expect(200);

  assert.deepStrictEqual(res.body, {
    totalKilometers: 1500,
    totalDowntimeDays: 3,
  });

  await client.close();
  await mongod.stop();
});
