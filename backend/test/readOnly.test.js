process.env.JWT_SECRET = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const express = require('express');
const guard = require('../src/middleware/readOnly').default;
test('recovery mode allows consultation and sessions but rejects all business mutations', async () => {
  const app = express();
  app.use('/api', guard(true));
  app.use((req, res) => res.sendStatus(200));
  for (const path of [
    '/loans',
    '/equipments',
    '/vehicles',
    '/users',
    '/auth/runtime',
  ])
    await request(app).get(`/api${path}`).expect(200);
  for (const path of ['/auth/login', '/auth/refresh', '/auth/logout'])
    await request(app).post(`/api${path}`).expect(200);
  for (const verb of ['post', 'put', 'patch', 'delete'])
    for (const path of [
      '/loans/1',
      '/vehicles/1',
      '/equipments/1',
      '/users/me',
    ]) {
      const result = await request(app)[verb](`/api${path}`).expect(503);
      assert.equal(result.body.readOnly, true);
    }
  await request(app).post('/api/auth/register').expect(503);
});
test('normal mode does not restrict existing routes', async () => {
  const app = express();
  app.use(guard(false));
  app.use((req, res) => res.sendStatus(200));
  await request(app).put('/loans/1').expect(200);
});
