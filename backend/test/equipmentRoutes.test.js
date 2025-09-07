const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test';

const equipmentRoutes = require('../src/routes/equipments').default;

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

function auth(role = 'Administrateur') {
  const token = jwt.sign({ id: 'u1', role }, 'test', {
    expiresIn: '1h',
  });
  return { Authorization: `Bearer ${token}` };
}

test('create, list, update and delete equipments', async () => {
  const { app, client, mongod } = await createApp();
  const newEq = {
    name: 'Mic',
    type: 'Son',
    condition: 'Neuf',
    totalQty: 2,
    availableQty: 1,
  };
  const res = await request(app)
    .post('/api/equipments')
    .set(auth())
    .send(newEq)
    .expect(200);
  assert.ok(res.body._id);

  const list1 = await request(app)
    .get('/api/equipments')
    .set(auth())
    .expect(200);
  assert.strictEqual(list1.body.length, 1);

  const id = res.body._id;
  const upd = await request(app)
    .put(`/api/equipments/${id}`)
    .set(auth())
    .send({ location: 'store' })
    .expect(200);
  assert.strictEqual(upd.body.location, 'store');

  await request(app).delete(`/api/equipments/${id}`).set(auth()).expect(200);
  const list2 = await request(app)
    .get('/api/equipments')
    .set(auth())
    .expect(200);
  assert.strictEqual(list2.body.length, 0);

  await client.close();
  await mongod.stop();
});

test('default availableQty to totalQty when missing', async () => {
  const { app, client, mongod } = await createApp();
  const newEq = {
    name: 'Cam',
    type: 'Lumière',
    condition: 'Neuf',
    totalQty: 3,
  };
  const res = await request(app)
    .post('/api/equipments')
    .set(auth())
    .send(newEq)
    .expect(200);
  assert.strictEqual(res.body.availableQty, 3);
  const db = client.db();
  const fromDb = await db
    .collection('equipments')
    .findOne({ _id: new ObjectId(res.body._id) });
  assert.strictEqual(fromDb.availableQty, 3);
  await client.close();
  await mongod.stop();
});

test('supports filtering and pagination', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  await db.collection('equipments').insertMany([
    {
      name: 'Cam',
      type: 'Video',
      location: 'Studio',
      totalQty: 1,
      availableQty: 1,
    },
    {
      name: 'Light',
      type: 'Light',
      location: 'Stage',
      totalQty: 1,
      availableQty: 1,
    },
    {
      name: 'Mic',
      type: 'Sound',
      location: 'Studio',
      totalQty: 1,
      availableQty: 1,
    },
  ]);
  const filterRes = await request(app)
    .get('/api/equipments?search=Mic&type=Sound&location=Studio')
    .set(auth())
    .expect(200);
  assert.strictEqual(filterRes.body.length, 1);
  assert.strictEqual(filterRes.body[0].name, 'Mic');
  const page1 = await request(app)
    .get('/api/equipments?page=1&limit=2')
    .set(auth())
    .expect(200);
  assert.strictEqual(page1.body.length, 2);
  assert.strictEqual(page1.body[0].name, 'Cam');
  const page2 = await request(app)
    .get('/api/equipments?page=2&limit=2')
    .set(auth())
    .expect(200);
  assert.strictEqual(page2.body.length, 1);
  assert.strictEqual(page2.body[0].name, 'Mic');
  await client.close();
  await mongod.stop();
});

test('list excludes equipments from user structure', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const struct1 = new ObjectId();
  const struct2 = new ObjectId();
  await db.collection('structures').insertMany([
    { _id: struct1, name: 'S1' },
    { _id: struct2, name: 'S2' },
  ]);
  await db.collection('equipments').insertMany([
    {
      name: 'Eq1',
      type: 'Son',
      condition: 'Neuf',
      totalQty: 1,
      availableQty: 1,
      structure: struct1,
    },
    {
      name: 'Eq2',
      type: 'Son',
      condition: 'Neuf',
      totalQty: 1,
      availableQty: 1,
      structure: struct2,
    },
  ]);
  const u1 = new ObjectId();
  await db.collection('users').insertOne({
    _id: u1,
    username: 'u1',
    role: 'Regisseur Son',
    structure: struct1,
  });
  const token1 = jwt.sign(
    { id: u1.toString(), role: 'Regisseur Son' },
    'test',
    { expiresIn: '1h' },
  );
  const res = await request(app)
    .get('/api/equipments')
    .set({ Authorization: `Bearer ${token1}` })
    .expect(200);
  assert.strictEqual(res.body.length, 1);
  assert.strictEqual(res.body[0].name, 'Eq2');
  await client.close();
  await mongod.stop();
});

test('deny updates and deletes when structures differ', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();

  const struct1 = new ObjectId();
  const struct2 = new ObjectId();
  await db.collection('structures').insertMany([
    { _id: struct1, name: 'Struct1' },
    { _id: struct2, name: 'Struct2' },
  ]);

  const u1 = new ObjectId();
  const u2 = new ObjectId();
  await db.collection('users').insertMany([
    { _id: u1, username: 'user1', role: 'Regisseur Son', structure: struct1 },
    { _id: u2, username: 'user2', role: 'Regisseur Son', structure: struct2 },
  ]);

  const token2 = jwt.sign(
    { id: u2.toString(), role: 'Regisseur Son' },
    'test',
    {
      expiresIn: '1h',
    },
  );

  const newEq = {
    name: 'Mic',
    type: 'Son',
    condition: 'Neuf',
    totalQty: 1,
    availableQty: 1,
  };
  const created = await request(app)
    .post('/api/equipments')
    .set(auth())
    .send(newEq)
    .expect(200);
  const id = created.body._id;

  await request(app)
    .put(`/api/equipments/${id}`)
    .set({ Authorization: `Bearer ${token2}` })
    .send({ location: 'elsewhere' })
    .expect(403);

  await request(app)
    .delete(`/api/equipments/${id}`)
    .set({ Authorization: `Bearer ${token2}` })
    .expect(403);

  await client.close();
  await mongod.stop();
});

test('check availability endpoint', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const eqId = (
    await db
      .collection('equipments')
      .insertOne({ name: 'Mic', type: 'Son', totalQty: 5 })
  ).insertedId;
  await db.collection('loanrequests').insertOne({
    items: [{ equipment: eqId, quantity: 3 }],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-10'),
    status: 'accepted',
  });

  const res = await request(app)
    .get(
      `/api/equipments/${eqId}/availability?start=2024-01-05&end=2024-01-06&quantity=3`,
    )
    .set(auth())
    .expect(200);
  assert.strictEqual(res.body.available, false);

  const res2 = await request(app)
    .get(
      `/api/equipments/${eqId}/availability?start=2024-02-01&end=2024-02-02&quantity=3`,
    )
    .set(auth())
    .expect(200);
  assert.strictEqual(res2.body.available, true);

  await client.close();
  await mongod.stop();
});

test('reject update on equipment from another structure', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();

  const struct1 = new ObjectId();
  const struct2 = new ObjectId();
  await db.collection('structures').insertMany([
    { _id: struct1, name: 'S1' },
    { _id: struct2, name: 'S2' },
  ]);

  const u1 = new ObjectId();
  const u2 = new ObjectId();
  await db.collection('users').insertMany([
    { _id: u1, username: 'u1', role: 'Regisseur Son', structure: struct1 },
    { _id: u2, username: 'u2', role: 'Regisseur Son', structure: struct2 },
  ]);

  const token2 = jwt.sign(
    { id: u2.toString(), role: 'Regisseur Son' },
    'test',
    { expiresIn: '1h' },
  );

  const created = await request(app)
    .post('/api/equipments')
    .set(auth())
    .send({
      name: 'Mic',
      type: 'Son',
      condition: 'Neuf',
      totalQty: 1,
      availableQty: 1,
    })
    .expect(200);
  const eqId = created.body._id;

  await request(app)
    .put(`/api/equipments/${eqId}`)
    .set({ Authorization: `Bearer ${token2}` })
    .send({ location: 'elsewhere' })
    .expect(403);

  const eq = await db
    .collection('equipments')
    .findOne({ _id: new ObjectId(eqId) });
  assert.strictEqual(eq.location, '');

  await client.close();
  await mongod.stop();
});

test('non-admin cannot create equipment', async () => {
  const { app, client, mongod } = await createApp();
  const newEq = {
    name: 'Mic',
    type: 'Son',
    condition: 'Neuf',
    totalQty: 1,
    availableQty: 1,
  };
  await request(app)
    .post('/api/equipments')
    .set(auth('Regisseur Son'))
    .send(newEq)
    .expect(403);
  await client.close();
  await mongod.stop();
});
