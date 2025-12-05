const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const request = require('supertest');

const CACHE_CONTROL_HEADER = 'private, no-store';

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

const withServer = async (t, configureApp) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';

  const client = require('prom-client');
  client.register.clear();

  const indexPath = require.resolve('../src/index');
  const configPath = require.resolve('../src/config');
  delete require.cache[indexPath];
  delete require.cache[configPath];

  const { start } = require('../src/index');

  const server = await start(async () => mockDb, configureApp);

  t.after(() =>
    new Promise((resolve) => {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
      if (originalJwtSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = originalJwtSecret;
      }

      server.close(() => {
        delete require.cache[require.resolve('../src/index')];
        delete require.cache[require.resolve('../src/config')];
        resolve();
      });
    }),
  );

  return server;
};

test('sets a default Cache-Control header', async (t) => {
  const server = await withServer(t, (app) => {
    app.get('/test-cache', (_req, res) => {
      res.json({ status: 'ok' });
    });
  });

  const response = await request(server).get('/test-cache');

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.headers['cache-control'], CACHE_CONTROL_HEADER);
});

test('does not override Cache-Control for static assets', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-static-'));
  const staticFilePath = path.join(tmpDir, 'asset.txt');
  fs.writeFileSync(staticFilePath, 'static asset');

  const server = await withServer(t, (app) => {
    app.use(
      '/static',
      express.static(tmpDir, {
        setHeaders(res) {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        },
      }),
    );
  });

  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  const response = await request(server).get('/static/asset.txt');

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.headers['cache-control'], 'public, max-age=3600');
});
