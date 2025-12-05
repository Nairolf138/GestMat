const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'test';

const userRoutes = require('../src/routes/users').default;
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
  app.use(withApiPrefix('/users'), userRoutes);
  return { app, client, mongod, db };
}

function token(id, role = AUTRE_ROLE) {
  return jwt.sign({ id, role }, 'test', { expiresIn: '1h' });
}

function auth(id, role) {
  return { Authorization: `Bearer ${token(id, role)}` };
}

test('GET users requires admin role', async () => {
  const { app, client, mongod, db } = await createApp();
  await db.collection('users').insertOne({ username: 'bob', password: 'pw' });

  // no token
  await request(app).get(withApiPrefix('/users')).expect(401);

  // non admin
  await request(app)
    .get(withApiPrefix('/users'))
    .set(auth('u1', AUTRE_ROLE))
    .expect(403);

  // admin
  const res = await request(app)
    .get(withApiPrefix('/users'))
    .set(auth('a1', ADMIN_ROLE))
    .expect(200);
  assert.strictEqual(Array.isArray(res.body), true);
  await client.close();
  await mongod.stop();
});

test('GET users supports search and pagination', async () => {
  const { app, client, mongod, db } = await createApp();
  await db.collection('users').insertMany([
    { username: 'alice', password: 'pw', firstName: 'Alice' },
    { username: 'bob', password: 'pw', firstName: 'Bob' },
    { username: 'charlie', password: 'pw', firstName: 'Charlie' },
  ]);

  let res = await request(app)
    .get(withApiPrefix('/users'))
    .query({ search: 'ali' })
    .set(auth('a1', ADMIN_ROLE))
    .expect(200);
  assert.strictEqual(res.body.length, 1);
  assert.strictEqual(res.body[0].username, 'alice');

  res = await request(app)
    .get(withApiPrefix('/users'))
    .query({ page: 2, limit: 1 })
    .set(auth('a1', ADMIN_ROLE))
    .expect(200);
  assert.strictEqual(res.body.length, 1);
  assert.strictEqual(res.body[0].username, 'bob');

  await client.close();
  await mongod.stop();
});

test('POST /users allows admins to create accounts', async () => {
  const { app, client, mongod, db } = await createApp();
  const structureId = (
    await db.collection('structures').insertOne({ name: 'Structure' })
  ).insertedId;

  const res = await request(app)
    .post(withApiPrefix('/users'))
    .set(auth('admin', ADMIN_ROLE))
    .send({
      username: 'newuser',
      password: 'StrongSecret123',
      role: 'Regisseur Son',
      structure: structureId.toString(),
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
    })
    .expect(201);

  assert.strictEqual(res.body.username, 'newuser');
  assert.strictEqual(res.body.password, undefined);
  assert.strictEqual(res.body.role, 'Regisseur Son');

  const saved = await db.collection('users').findOne({ username: 'newuser' });
  assert(saved);
  assert.strictEqual(saved.structure.toString(), structureId.toString());
  assert.strictEqual(await bcrypt.compare('StrongSecret123', saved.password), true);

  const weakPassword = await request(app)
    .post(withApiPrefix('/users'))
    .set(auth('admin', ADMIN_ROLE))
    .send({ username: 'weak', password: 'shortpass1A' });
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

test('PUT users/me updates user and checks auth failures', async () => {
  const { app, client, mongod, db } = await createApp();
  const id = new ObjectId();
  await db
    .collection('users')
    .insertOne({ _id: id, username: 'bob', password: 'pw' });

  // success
  const up = await request(app)
    .put(withApiPrefix('/users/me'))
    .set(auth(id.toString(), AUTRE_ROLE))
    .send({ email: 'bob@example.com' })
    .expect(200);
  assert.strictEqual(up.body.email, 'bob@example.com');

  // not found
  await request(app)
    .put(withApiPrefix('/users/me'))
    .set(auth(new ObjectId().toString(), AUTRE_ROLE))
    .send({ email: 'x@x.com' })
    .expect(404);

  // missing token
  await request(app).put(withApiPrefix('/users/me')).send({}).expect(401);

  // invalid token
  await request(app)
    .put(withApiPrefix('/users/me'))
    .set({ Authorization: 'Bearer badtoken' })
    .send({})
    .expect(401);

  await client.close();
  await mongod.stop();
});

test('PUT users/me ignores role and structure', async () => {
  const { app, client, mongod, db } = await createApp();
  const structure1 = (
    await db.collection('structures').insertOne({ name: 'S1' })
  ).insertedId;
  const structure2 = (
    await db.collection('structures').insertOne({ name: 'S2' })
  ).insertedId;
  const id = (
    await db.collection('users').insertOne({
      username: 'bob',
      password: 'pw',
      role: AUTRE_ROLE,
      structure: structure1,
    })
  ).insertedId;

  await request(app)
    .put(withApiPrefix('/users/me'))
    .set(auth(id.toString(), AUTRE_ROLE))
    .send({
      role: ADMIN_ROLE,
      structure: structure2.toString(),
      email: 'new@example.com',
    })
    .expect(200);

  const user = await db.collection('users').findOne({ _id: id });
  assert.strictEqual(user.role, AUTRE_ROLE);
  assert.strictEqual(user.structure.toString(), structure1.toString());
  assert.strictEqual(user.email, 'new@example.com');
  await client.close();
  await mongod.stop();
});

test('DELETE users/:id respects authorization', async () => {
  const { app, client, mongod, db } = await createApp();
  const id = (
    await db.collection('users').insertOne({ username: 'bob', password: 'pw' })
  ).insertedId;

  // missing token
  await request(app).delete(withApiPrefix(`/users/${id}`)).expect(401);

  // invalid token
  await request(app)
    .delete(withApiPrefix(`/users/${id}`))
    .set({ Authorization: 'Bearer badtoken' })
    .expect(401);

  // non admin
  await request(app)
    .delete(withApiPrefix(`/users/${id}`))
    .set(auth('u1', AUTRE_ROLE))
    .expect(403);

  // admin success
  await request(app)
    .delete(withApiPrefix(`/users/${id}`))
    .set(auth('a1', ADMIN_ROLE))
    .expect(200);

  await client.close();
  await mongod.stop();
});

test('cannot change role via users/me', async () => {
  const { app, client, mongod, db } = await createApp();
  const id = (
    await db
      .collection('users')
      .insertOne({ username: 'alice', password: 'pw', role: AUTRE_ROLE })
  ).insertedId;

  const res = await request(app)
    .put(withApiPrefix('/users/me'))
    .set(auth(id.toString(), AUTRE_ROLE))
    .send({ role: ADMIN_ROLE })
    .expect(200);
  assert.strictEqual(res.body.role, AUTRE_ROLE);

  const user = await db.collection('users').findOne({ _id: id });
  assert.strictEqual(user.role, AUTRE_ROLE);

  await client.close();
  await mongod.stop();
});
