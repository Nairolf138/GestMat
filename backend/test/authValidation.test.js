const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
process.env.JWT_SECRET = 'test';
const authRoutes = require('../src/routes/auth');

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
  return { app, client, mongod };
}

test('register validates required fields and duplicate usernames', async () => {
  const { app, client, mongod } = await createApp();
  await request(app).post('/api/auth/register').send({ password: 'pw' }).expect(400);
  await request(app).post('/api/auth/register').send({ username: 'bob' }).expect(400);
  await request(app).post('/api/auth/register').send({ username: 'bob', password: 'pw' }).expect(200);
  await request(app).post('/api/auth/register').send({ username: 'bob', password: 'pw' }).expect(400);
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
