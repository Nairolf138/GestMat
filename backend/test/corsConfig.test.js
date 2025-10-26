const test = require('node:test');
const assert = require('assert');
const request = require('supertest');

test('CORS allows configured frontend origin', async (t) => {
  const origin = 'https://gestmat.nairolfconcept.fr';
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.CORS_ORIGIN = origin;

  const { start } = require('../src/index');

  const mockDb = {
    collection: () => ({
      createIndex: async () => undefined,
      insertOne: async () => undefined,
      findOne: async () => null,
      deleteOne: async () => ({ deletedCount: 0 }),
      deleteMany: async () => ({ deletedCount: 0 }),
    }),
    command: async () => ({ ok: 1 }),
  };

  const server = await start(async () => mockDb);

  t.after(() =>
    new Promise((resolve) => {
      delete process.env.CORS_ORIGIN;
      delete process.env.JWT_SECRET;
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
      server.close(() => {
        delete require.cache[require.resolve('../src/index')];
        resolve();
      });
    }),
  );

  const response = await request(server)
    .get('/health')
    .set('Origin', origin);

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.headers['access-control-allow-origin'], origin);
});
