const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

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
  app.use(cookieParser());
  const csrfProtection = csrf({ cookie: true });
  app.use(csrfProtection);
  app.use((req, res, next) => {
    res.cookie('XSRF-TOKEN', req.csrfToken());
    next();
  });
  app.get(withApiPrefix('/auth/csrf'), (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });
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

test('register and login succeed when CSRF token is provided', async () => {
  const { app, client, mongod } = await createApp();
  const agent = request.agent(app);

  const csrfResponse = await agent.get(withApiPrefix('/auth/csrf')).expect(200);
  const csrfToken = csrfResponse.body.csrfToken;
  assert.ok(csrfToken);

  await agent
    .post(withApiPrefix('/auth/register'))
    .set('CSRF-Token', csrfToken)
    .send({ username: 'alice', password: 'pw12345' })
    .expect(200);

  const refreshedTokenResponse = await agent
    .get(withApiPrefix('/auth/csrf'))
    .expect(200);
  const refreshedToken = refreshedTokenResponse.body.csrfToken;
  assert.ok(refreshedToken);

  const loginResponse = await agent
    .post(withApiPrefix('/auth/login'))
    .set('CSRF-Token', refreshedToken)
    .send({ username: 'alice', password: 'pw12345' })
    .expect(200);

  assert.strictEqual(loginResponse.body.user.username, 'alice');

  await client.close();
  await mongod.stop();
});
