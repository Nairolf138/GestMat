const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const express = require('express');

process.env.JWT_SECRET = 'test';

const authRoutes = require('../src/routes/auth').default;
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
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  });
  return { app, client, mongod, db };
}

function extractCookieValue(cookies, name) {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`));
  assert.ok(cookie, `Cookie ${name} not found`);
  return cookie.split(';')[0].split('=')[1];
}

test('login keeps persistent session when stayLoggedIn is true', async () => {
  const { app, client, mongod, db } = await createApp();

  await request(app)
    .post(withApiPrefix('/auth/register'))
    .send({ username: 'alice', password: 'pw12345' })
    .expect(200);

  const response = await request(app)
    .post(withApiPrefix('/auth/login'))
    .send({ username: 'alice', password: 'pw12345', stayLoggedIn: true })
    .expect(200);

  const cookies = response.headers['set-cookie'];
  const refreshCookie = cookies.find((value) => value.startsWith('refreshToken='));
  assert.ok(refreshCookie?.includes('Max-Age=604800'));
  assert.ok(refreshCookie?.includes('HttpOnly'));

  const refreshToken = extractCookieValue(cookies, 'refreshToken');
  const payload = jwt.decode(refreshToken);
  assert.strictEqual(payload.stayLoggedIn, true);

  const sessionCount = await db.collection('sessions').countDocuments();
  assert.strictEqual(sessionCount, 1);

  await client.close();
  await mongod.stop();
});

test('login without stayLoggedIn uses session refresh cookie and keeps other sessions', async () => {
  const { app, client, mongod, db } = await createApp();

  await request(app)
    .post(withApiPrefix('/auth/register'))
    .send({ username: 'bob', password: 'pw12345' })
    .expect(200);

  await request(app)
    .post(withApiPrefix('/auth/login'))
    .send({ username: 'bob', password: 'pw12345', stayLoggedIn: true })
    .expect(200);

  const response = await request(app)
    .post(withApiPrefix('/auth/login'))
    .send({ username: 'bob', password: 'pw12345', stayLoggedIn: false })
    .expect(200);

  const cookies = response.headers['set-cookie'];
  const refreshCookie = cookies.find((value) => value.startsWith('refreshToken='));
  assert.ok(refreshCookie);
  assert.ok(!refreshCookie.includes('Max-Age'));
  assert.ok(!refreshCookie.includes('Expires'));

  const refreshToken = extractCookieValue(cookies, 'refreshToken');
  const payload = jwt.decode(refreshToken);
  assert.strictEqual(payload.stayLoggedIn, false);
  const expiresInMs = payload.exp * 1000 - Date.now();
  assert.ok(expiresInMs < 2 * 24 * 60 * 60 * 1000);

  const sessionCount = await db.collection('sessions').countDocuments();
  assert.strictEqual(sessionCount, 2);

  await client.close();
  await mongod.stop();
});

test('multiple persistent logins retain independent refresh tokens', async () => {
  const { app, client, mongod, db } = await createApp();

  const agentA = request.agent(app);
  const agentB = request.agent(app);

  await agentA
    .post(withApiPrefix('/auth/register'))
    .send({ username: 'carol', password: 'pw12345' })
    .expect(200);

  await agentA
    .post(withApiPrefix('/auth/login'))
    .send({ username: 'carol', password: 'pw12345', stayLoggedIn: true })
    .expect(200);

  await agentB
    .post(withApiPrefix('/auth/login'))
    .send({ username: 'carol', password: 'pw12345', stayLoggedIn: true })
    .expect(200);

  const sessionCountAfterLogin = await db.collection('sessions').countDocuments();
  assert.strictEqual(sessionCountAfterLogin, 2);

  const refreshResponseA = await agentA
    .post(withApiPrefix('/auth/refresh'))
    .expect(200);
  assert.deepStrictEqual(refreshResponseA.body, {});

  const refreshResponseB = await agentB
    .post(withApiPrefix('/auth/refresh'))
    .expect(200);
  assert.deepStrictEqual(refreshResponseB.body, {});

  const sessionCountAfterRefresh = await db.collection('sessions').countDocuments();
  assert.strictEqual(sessionCountAfterRefresh, 2);

  await client.close();
  await mongod.stop();
});
