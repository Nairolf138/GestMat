const test = require('node:test');
const assert = require('assert');
const request = require('supertest');

test('CORS normalizes configured frontend origins with default ports', async (t) => {
  const configuredOrigins = [
    'http://app.example.test:80',
    'http://app.example.test',
    'https://secure.example.test:443/',
    'http://custom.example.test:3000',
  ];
  const originWithoutPort = 'http://app.example.test';
  const secureOrigin = 'https://secure.example.test';
  const customOrigin = 'http://custom.example.test:3000';
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsOrigin = process.env.CORS_ORIGIN;
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.CORS_ORIGIN = configuredOrigins.join(', ');

  const client = require('prom-client');
  client.register.clear();

  const indexPath = require.resolve('../src/index');
  const configPath = require.resolve('../src/config');
  delete require.cache[indexPath];
  delete require.cache[configPath];

  const { start } = require('../src/index');
  const { CORS_ORIGIN: normalizedOrigins } = require('../src/config');

  assert.deepStrictEqual(normalizedOrigins, [
    'https://gestmat.nairolfconcept.fr',
    originWithoutPort,
    secureOrigin,
    customOrigin,
  ]);

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
      if (originalCorsOrigin === undefined) {
        delete process.env.CORS_ORIGIN;
      } else {
        process.env.CORS_ORIGIN = originalCorsOrigin;
      }
      if (originalJwtSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = originalJwtSecret;
      }
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
      server.close(() => {
        delete require.cache[require.resolve('../src/index')];
        delete require.cache[require.resolve('../src/config')];
        resolve();
      });
    }),
  );

  const responseDefaultPort = await request(server)
    .get('/health')
    .set('Origin', originWithoutPort);

  assert.strictEqual(responseDefaultPort.statusCode, 200);
  assert.strictEqual(
    responseDefaultPort.headers['access-control-allow-origin'],
    originWithoutPort,
  );

  const responseSecure = await request(server)
    .get('/health')
    .set('Origin', secureOrigin);

  assert.strictEqual(responseSecure.statusCode, 200);
  assert.strictEqual(responseSecure.headers['access-control-allow-origin'], secureOrigin);

  const responseCustomPort = await request(server)
    .get('/health')
    .set('Origin', customOrigin);

  assert.strictEqual(responseCustomPort.statusCode, 200);
  assert.strictEqual(
    responseCustomPort.headers['access-control-allow-origin'],
    customOrigin,
  );
});

test('CORS allows the required frontend when no whitelist is configured', async (t) => {
  const origin = 'https://gestmat.nairolfconcept.fr';
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsOrigin = process.env.CORS_ORIGIN;
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  delete process.env.CORS_ORIGIN;

  const client = require('prom-client');
  client.register.clear();

  const indexPath = require.resolve('../src/index');
  const configPath = require.resolve('../src/config');
  delete require.cache[indexPath];
  delete require.cache[configPath];

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
      if (originalCorsOrigin === undefined) {
        delete process.env.CORS_ORIGIN;
      } else {
        process.env.CORS_ORIGIN = originalCorsOrigin;
      }
      if (originalJwtSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = originalJwtSecret;
      }
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
      server.close(() => {
        delete require.cache[require.resolve('../src/index')];
        delete require.cache[require.resolve('../src/config')];
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

test('CORS omits header when invalid origin is provided without whitelist', async (t) => {
  const origin = 'https://example.test::invalid';
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsOrigin = process.env.CORS_ORIGIN;
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  delete process.env.CORS_ORIGIN;

  const client = require('prom-client');
  client.register.clear();

  const indexPath = require.resolve('../src/index');
  const configPath = require.resolve('../src/config');
  delete require.cache[indexPath];
  delete require.cache[configPath];

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
      if (originalCorsOrigin === undefined) {
        delete process.env.CORS_ORIGIN;
      } else {
        process.env.CORS_ORIGIN = originalCorsOrigin;
      }
      if (originalJwtSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = originalJwtSecret;
      }
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
      server.close(() => {
        delete require.cache[require.resolve('../src/index')];
        delete require.cache[require.resolve('../src/config')];
        resolve();
      });
    }),
  );

  const response = await request(server)
    .get('/health')
    .set('Origin', origin);

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.headers['access-control-allow-origin'], undefined);
});
