const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const cors = require('cors');

process.env.JWT_SECRET = 'test';
const structureRoutes = require('../src/routes/structures').default;
const { withApiPrefix } = require('./utils/apiPrefix');
const { normalizeCorsOrigins } = require('../src/config');

const SAMPLE_ALLOWED_ORIGIN = 'https://allowed.test';

test('normalizeCorsOrigins rejects invalid origins', () => {
  assert.throws(
    () => normalizeCorsOrigins('example.com'),
    /Invalid CORS origin entry "example.com"/,
  );

  assert.throws(
    () => normalizeCorsOrigins(`${SAMPLE_ALLOWED_ORIGIN},invalid`),
    /Invalid CORS origin entry "invalid"/,
  );

  assert.deepStrictEqual(normalizeCorsOrigins(`${SAMPLE_ALLOWED_ORIGIN}/`), [
    SAMPLE_ALLOWED_ORIGIN,
  ]);
});

async function createApp(corsOriginSetting = SAMPLE_ALLOWED_ORIGIN) {
  const mongod = await MongoMemoryReplSet.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const app = express();
  app.use(express.json());
  const allowedOrigins = normalizeCorsOrigins(corsOriginSetting);
  const corsOptions = allowedOrigins.length
    ? { origin: allowedOrigins, credentials: true }
    : { origin: true, credentials: true };
  app.use(cors(corsOptions));
  app.locals.db = db;
  app.use(withApiPrefix('/structures'), structureRoutes);
  return { app, client, mongod, allowedOrigins };
}

test('GET structures is public', async () => {
  const { app, client, mongod } = await createApp();
  await dbSetup(client.db());
  const res = await request(app).get(withApiPrefix('/structures')).expect(200);
  assert.ok(Array.isArray(res.body));
  assert.strictEqual(res.body.length, 2);
  await client.close();
  await mongod.stop();
});

test('GET structures echoes configured CORS origin', async () => {
  const { app, client, mongod, allowedOrigins } = await createApp(
    `${SAMPLE_ALLOWED_ORIGIN}/`,
  );
  await dbSetup(client.db());
  const res = await request(app)
    .get(withApiPrefix('/structures'))
    .set('Origin', SAMPLE_ALLOWED_ORIGIN)
    .expect(200);
  assert.deepStrictEqual(allowedOrigins, [SAMPLE_ALLOWED_ORIGIN]);
  assert.strictEqual(res.headers['access-control-allow-origin'], SAMPLE_ALLOWED_ORIGIN);
  await client.close();
  await mongod.stop();
});

test('GET structures allows any origin when CORS_ORIGIN is *', async () => {
  const { app, client, mongod, allowedOrigins } = await createApp('*');
  await dbSetup(client.db());
  const arbitraryOrigin = 'https://another.test';
  const res = await request(app)
    .get(withApiPrefix('/structures'))
    .set('Origin', arbitraryOrigin)
    .expect(200);
  assert.deepStrictEqual(allowedOrigins, []);
  assert.strictEqual(res.headers['access-control-allow-origin'], arbitraryOrigin);
  assert.strictEqual(res.headers['access-control-allow-credentials'], 'true');
  await client.close();
  await mongod.stop();
});

test('structures routes respond when API_PREFIX is empty', async () => {
  const originalPrefix = process.env.API_PREFIX;
  process.env.API_PREFIX = '';
  const { app, client, mongod } = await createApp();
  try {
    await dbSetup(client.db());
    const res = await request(app).get(withApiPrefix('/structures')).expect(200);
    assert.ok(Array.isArray(res.body));
  } finally {
    await client.close();
    await mongod.stop();
    if (originalPrefix === undefined) {
      delete process.env.API_PREFIX;
    } else {
      process.env.API_PREFIX = originalPrefix;
    }
  }
});

async function dbSetup(db) {
  await db
    .collection('structures')
    .insertMany([{ name: 'S1' }, { name: 'S2' }]);
}
