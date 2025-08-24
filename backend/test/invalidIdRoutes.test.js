const test = require('node:test');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test';

const equipmentRoutes = require('../src/routes/equipments').default;
const loanRoutes = require('../src/routes/loans').default;
const structureRoutes = require('../src/routes/structures').default;
const userRoutes = require('../src/routes/users').default;

function auth(role = 'Administrateur') {
  const token = jwt.sign({ id: 'u1', role }, 'test', { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

async function createApp(route, path) {
  const mongod = await MongoMemoryReplSet.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  app.use(path, route);
  return { app, client, mongod };
}

// Equipment
test('equipment routes return 400 for invalid id', async () => {
  const { app, client, mongod } = await createApp(equipmentRoutes, '/api/equipments');
  await request(app).put('/api/equipments/badid').set(auth()).send({}).expect(400);
  await request(app).delete('/api/equipments/badid').set(auth()).expect(400);
  await request(app).get('/api/equipments/badid/availability').set(auth()).expect(400);
  await client.close();
  await mongod.stop();
});

// Loans
test('loan routes return 400 for invalid id', async () => {
  const { app, client, mongod } = await createApp(loanRoutes, '/api/loans');
  await request(app).put('/api/loans/badid').set(auth()).send({}).expect(400);
  await request(app).delete('/api/loans/badid').set(auth()).expect(400);
  await client.close();
  await mongod.stop();
});

// Structures
test('structure routes return 400 for invalid id', async () => {
  const { app, client, mongod } = await createApp(structureRoutes, '/api/structures');
  await request(app).put('/api/structures/badid').set(auth()).send({ name: 's' }).expect(400);
  await request(app).delete('/api/structures/badid').set(auth()).expect(400);
  await client.close();
  await mongod.stop();
});

// Users
test('user routes return 400 for invalid id', async () => {
  const { app, client, mongod } = await createApp(userRoutes, '/api/users');
  await request(app).delete('/api/users/badid').set(auth()).expect(400);
  await client.close();
  await mongod.stop();
});
