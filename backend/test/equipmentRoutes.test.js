const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test';

const equipmentRoutes = require('../src/routes/equipments');
const { roleMap } = require('../src/utils/roleAccess');

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

function auth() {
  const token = jwt.sign({ id: 'u1', role: 'Administrateur' }, 'test', {
    expiresIn: '1h'
  });
  return { Authorization: `Bearer ${token}` };
}

test('create, list, update and delete equipments', async () => {
  const { app, client, mongod } = await createApp();
  const newEq = { name: 'Mic', type: 'Son', condition: 'Neuf', totalQty: 2, availableQty: 1 };
  const res = await request(app)
    .post('/api/equipments')
    .set(auth())
    .send(newEq)
    .expect(200);
  assert.ok(res.body._id);

  const list1 = await request(app).get('/api/equipments').set(auth()).expect(200);
  assert.strictEqual(list1.body.length, 1);

  const id = res.body._id;
  const upd = await request(app)
    .put(`/api/equipments/${id}`)
    .set(auth())
    .send({ location: 'store' })
    .expect(200);
  assert.strictEqual(upd.body.location, 'store');

  await request(app).delete(`/api/equipments/${id}`).set(auth()).expect(200);
  const list2 = await request(app).get('/api/equipments').set(auth()).expect(200);
  assert.strictEqual(list2.body.length, 0);

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

  const token1 = jwt.sign({ id: u1.toString(), role: 'Regisseur Son' }, 'test', {
    expiresIn: '1h',
  });
  const token2 = jwt.sign({ id: u2.toString(), role: 'Regisseur Son' }, 'test', {
    expiresIn: '1h',
  });

  const newEq = { name: 'Mic', type: 'Son', condition: 'Neuf', totalQty: 1, availableQty: 1 };
  const created = await request(app)
    .post('/api/equipments')
    .set({ Authorization: `Bearer ${token1}` })
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
  const eqId = (await db.collection('equipments').insertOne({ name: 'Mic', type: 'Son', totalQty: 5 })).insertedId;
  await db.collection('loanrequests').insertOne({
    items: [{ equipment: eqId, quantity: 3 }],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-10'),
    status: 'accepted',
  });

  const res = await request(app)
    .get(`/api/equipments/${eqId}/availability?start=2024-01-05&end=2024-01-06&quantity=3`)
    .set(auth())
    .expect(200);
  assert.strictEqual(res.body.available, false);

  const res2 = await request(app)
    .get(`/api/equipments/${eqId}/availability?start=2024-02-01&end=2024-02-02&quantity=3`)
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
    { _id: struct2, name: 'S2' }
  ]);

  const u1 = new ObjectId();
  const u2 = new ObjectId();
  await db.collection('users').insertMany([
    { _id: u1, username: 'u1', role: 'Regisseur Son', structure: struct1 },
    { _id: u2, username: 'u2', role: 'Regisseur Son', structure: struct2 }
  ]);

  const token1 = jwt.sign({ id: u1.toString(), role: 'Regisseur Son' }, 'test', { expiresIn: '1h' });
  const token2 = jwt.sign({ id: u2.toString(), role: 'Regisseur Son' }, 'test', { expiresIn: '1h' });

  const created = await request(app)
    .post('/api/equipments')
    .set({ Authorization: `Bearer ${token1}` })
    .send({ name: 'Mic', type: 'Son', condition: 'Neuf', totalQty: 1, availableQty: 1 })
    .expect(200);
  const eqId = created.body._id;

  await request(app)
    .put(`/api/equipments/${eqId}`)
    .set({ Authorization: `Bearer ${token2}` })
    .send({ location: 'elsewhere' })
    .expect(403);

  const eq = await db.collection('equipments').findOne({ _id: new ObjectId(eqId) });
  assert.strictEqual(eq.location, 'S1');

  await client.close();
  await mongod.stop();
});

test('each role can create allowed equipment types', async () => {
  const { app, client, mongod } = await createApp();
  for (const [role, types] of Object.entries(roleMap)) {
    for (const type of types) {
      const token = jwt.sign({ id: 'u', role }, 'test', { expiresIn: '1h' });
      const newEq = { name: `${role}-${type}`, type, condition: 'Neuf', totalQty: 1, availableQty: 1 };
      await request(app)
        .post('/api/equipments')
        .set({ Authorization: `Bearer ${token}` })
        .send(newEq)
        .expect(200);
    }
  }
  await client.close();
  await mongod.stop();
});
