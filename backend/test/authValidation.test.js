const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
process.env.JWT_SECRET = 'test';
const authRoutes = require('../src/routes/auth').default;
const { ADMIN_ROLE, AUTRE_ROLE } = require('../src/config/roles');
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
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  app.use(withApiPrefix('/auth'), authRoutes);
  app.use((err, req, res, next) => {
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Server error' });
  });
  return { app, client, mongod };
}

test('register validates fields, defaults role and prevents duplicates', async () => {
  const { app, client, mongod } = await createApp();
  await request(app)
    .post(withApiPrefix('/auth/register'))
    .send({ password: 'Invalid1' })
    .expect(400);
  await request(app)
    .post(withApiPrefix('/auth/register'))
    .send({ username: 'bob' })
    .expect(400);
  await request(app)
    .post(withApiPrefix('/auth/register'))
    .send({
      username: 'bob',
      password: 'ValidPassword123',
      email: 'not-an-email',
    })
    .expect(400);
  await request(app)
    .post(withApiPrefix('/auth/register'))
    .send({ username: 'bob', password: 'ValidPassword123', structure: '123' })
    .expect(400);
  const missingStruct = await request(app).post(withApiPrefix('/auth/register')).send({
    username: 'bob',
    password: 'ValidPassword123',
    structure: new ObjectId().toString(),
  });
  assert.strictEqual(missingStruct.status, 400);
  assert.strictEqual(missingStruct.body.message, 'Structure not found');

  const defaultRole = await request(app)
    .post(withApiPrefix('/auth/register'))
    .send({ username: 'bob', password: 'ValidPassword123' });
  assert.strictEqual(defaultRole.status, 200);
  assert.strictEqual(defaultRole.body.role, AUTRE_ROLE);

  const dup = await request(app)
    .post(withApiPrefix('/auth/register'))
    .send({ username: 'bob', password: 'ValidPassword123' });
  assert.strictEqual(dup.status, 409);
  assert.strictEqual(dup.body.message, 'Username already exists');

  const invalidRole = await request(app)
    .post(withApiPrefix('/auth/register'))
    .send({ username: 'alice', password: 'ValidPassword123', role: 'invalid' });
  assert.strictEqual(invalidRole.status, 200);
  assert.strictEqual(invalidRole.body.role, AUTRE_ROLE);

  const adminRole = await request(app)
    .post(withApiPrefix('/auth/register'))
    .send({ username: 'eve', password: 'ValidPassword123', role: ADMIN_ROLE });
  assert.strictEqual(adminRole.status, 200);
  assert.strictEqual(adminRole.body.role, AUTRE_ROLE);

  const weakPassword = await request(app)
    .post(withApiPrefix('/auth/register'))
    .send({ username: 'weak', password: 'short' });
  assert.strictEqual(weakPassword.status, 400);
  assert(
    weakPassword.body.errors.some((error) =>
      error.path === 'password' &&
      error.msg.includes('Password must be at least 12 characters long'),
    ),
  );

  await client.close();
  await mongod.stop();
});

test('login validates required fields', async () => {
  const { app, client, mongod } = await createApp();
  await request(app)
    .post(withApiPrefix('/auth/login'))
    .send({ password: 'ValidPassword123' })
    .expect(400);
  await request(app)
    .post(withApiPrefix('/auth/login'))
    .send({ username: 'bob' })
    .expect(400);

  const weakResetPassword = await request(app)
    .post(withApiPrefix('/auth/reset-password'))
    .send({ token: 'abc', password: 'shortpass' });
  assert.strictEqual(weakResetPassword.status, 400);
  assert(
    weakResetPassword.body.errors.some((error) =>
      error.path === 'password' &&
      error.msg.includes('Password must be at least 12 characters long'),
    ),
  );
  await client.close();
  await mongod.stop();
});
