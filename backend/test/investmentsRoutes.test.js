const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test';
const investmentsRoutes = require('../src/routes/investments').default;
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
  app.use(withApiPrefix('/investments'), investmentsRoutes);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ message: err.message });
  });
  return { app, client, mongod, db };
}

function auth({ role = REGISSEUR_GENERAL_ROLE, structure } = {}) {
  const token = jwt.sign(
    { id: new ObjectId().toString(), role, structure },
    'test',
    { expiresIn: '1h' },
  );
  return { Authorization: `Bearer ${token}` };
}

test('GET /api/investments forces non-admin listing on own structure even with another structure query', async () => {
  const { app, client, mongod, db } = await createApp();
  const ownStructure = new ObjectId();
  const otherStructure = new ObjectId();

  await db.collection('investmentplans').insertMany([
    {
      structure: ownStructure,
      targetYear: 'year1',
      status: 'draft',
      lines: [],
      totalCost: 0,
      createdBy: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      structure: otherStructure,
      targetYear: 'year1',
      status: 'draft',
      lines: [],
      totalCost: 0,
      createdBy: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const res = await request(app)
    .get(
      withApiPrefix(
        `/investments?structure=${otherStructure.toString()}`,
      ),
    )
    .set(auth({ structure: ownStructure.toString() }))
    .expect(200);

  assert.strictEqual(res.body.length, 1);
  assert.strictEqual(
    res.body[0].structure.toString(),
    ownStructure.toString(),
  );

  await client.close();
  await mongod.stop();
});

test('GET /api/investments allows admin to query a specific structure', async () => {
  const { app, client, mongod, db } = await createApp();
  const firstStructure = new ObjectId();
  const secondStructure = new ObjectId();

  await db.collection('investmentplans').insertMany([
    {
      structure: firstStructure,
      targetYear: 'year1',
      status: 'draft',
      lines: [],
      totalCost: 0,
      createdBy: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      structure: secondStructure,
      targetYear: 'year2',
      status: 'draft',
      lines: [],
      totalCost: 0,
      createdBy: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const res = await request(app)
    .get(withApiPrefix(`/investments?structure=${secondStructure.toString()}`))
    .set(auth({ role: ADMIN_ROLE, structure: firstStructure.toString() }))
    .expect(200);

  assert.strictEqual(res.body.length, 1);
  assert.strictEqual(
    res.body[0].structure.toString(),
    secondStructure.toString(),
  );

  await client.close();
  await mongod.stop();
});
