const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
process.env.JWT_SECRET = 'test';
const authRoutes = require('../src/routes/auth');

async function createApp() {
  const mongod = await MongoMemoryReplSet.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  app.use('/api/auth', authRoutes);
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  });
  return { app, client, mongod };
}

test('register validates fields, defaults role and prevents duplicates', async () => {
  const { app, client, mongod } = await createApp();
  await request(app).post('/api/auth/register').send({ password: 'pw' }).expect(400);
  await request(app).post('/api/auth/register').send({ username: 'bob' }).expect(400);
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', password: 'pw', email: 'not-an-email' })
    .expect(400);
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', password: 'pw', structure: '123' })
    .expect(400);
  const missingStruct = await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', password: 'pw', structure: new ObjectId().toString() });
  assert.strictEqual(missingStruct.status, 400);
  assert.strictEqual(missingStruct.body.message, 'Structure not found');

  const defaultRole = await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', password: 'pw' });
  assert.strictEqual(defaultRole.status, 200);
  assert.strictEqual(defaultRole.body.role, 'Autre');

  const dup = await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', password: 'pw' });
  assert.strictEqual(dup.status, 409);
  assert.strictEqual(dup.body.message, 'Username already exists');

  const invalidRole = await request(app)
    .post('/api/auth/register')
    .send({ username: 'alice', password: 'pw', role: 'invalid' });
  assert.strictEqual(invalidRole.status, 200);
  assert.strictEqual(invalidRole.body.role, 'Autre');

  const adminRole = await request(app)
    .post('/api/auth/register')
    .send({ username: 'eve', password: 'pw', role: 'Administrateur' });
  assert.strictEqual(adminRole.status, 200);
  assert.strictEqual(adminRole.body.role, 'Autre');

  await client.close();
  await mongod.stop();
});

test('login validates required fields', async () => {
  const { app, client, mongod } = await createApp();
  await request(app).post('/api/auth/login').send({ password: 'pw' }).expect(400);
  await request(app).post('/api/auth/login').send({ username: 'bob' }).expect(400);
  await client.close();
  await mongod.stop();
});
