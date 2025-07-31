const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
process.env.JWT_SECRET = 'test';
const authRoutes = require('../src/routes/auth');
const ROLES = require('../src/config/roles');

async function createApp() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  app.use('/api/auth', authRoutes);
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  });
  return { app, client, mongod };
}

test('register validates fields and duplicate usernames', async () => {
  const { app, client, mongod } = await createApp();
  await request(app)
    .post('/api/auth/register')
    .send({ password: 'pw', role: ROLES[0] })
    .expect(400);
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', role: ROLES[0] })
    .expect(400);
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', password: 'pw' })
    .expect(400);
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', password: 'pw', role: 'invalid' })
    .expect(400);
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', password: 'pw', role: ROLES[0], email: 'not-an-email' })
    .expect(400);
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', password: 'pw', role: ROLES[0], structure: '123' })
    .expect(400);
  const missingStruct = await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', password: 'pw', role: ROLES[0], structure: new ObjectId().toString() });
  assert.strictEqual(missingStruct.status, 400);
  assert.strictEqual(missingStruct.body.message, 'Structure not found');
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', password: 'pw', role: ROLES[0] })
    .expect(200);
  const dup = await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', password: 'pw', role: ROLES[0] });
  assert.strictEqual(dup.status, 409);
  assert.strictEqual(dup.body.message, 'Username already exists');
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
