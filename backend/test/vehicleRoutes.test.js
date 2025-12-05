const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test';

const vehicleRoutes = require('../src/routes/vehicles').default;
const {
  ADMIN_ROLE,
  REGISSEUR_PLATEAU_ROLE,
  AUTRE_ROLE,
} = require('../src/config/roles');
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
  app.use(withApiPrefix('/vehicles'), vehicleRoutes);
  return { app, client, mongod };
}

function auth(role = ADMIN_ROLE) {
  const token = jwt.sign({ id: 'u1', role }, 'test', {
    expiresIn: '1h',
  });
  return { Authorization: `Bearer ${token}` };
}

test('create, list, update and delete vehicles', async () => {
  const { app, client, mongod } = await createApp();
  const newVehicle = {
    name: 'Van 1',
    brand: 'Ford',
    model: 'Transit',
    registrationNumber: 'AB-123-CD',
    characteristics: { seats: 3, fuelType: 'Diesel' },
  };
  const res = await request(app)
    .post(withApiPrefix('/vehicles'))
    .set(auth(REGISSEUR_PLATEAU_ROLE))
    .send(newVehicle)
    .expect(200);
  assert.ok(res.body._id);
  assert.strictEqual(res.body.status, 'available');

  const list = await request(app)
    .get(withApiPrefix('/vehicles'))
    .set(auth())
    .expect(200);
  assert.strictEqual(list.body.length, 1);

  const id = res.body._id;
  const updated = await request(app)
    .put(withApiPrefix(`/vehicles/${id}`))
    .set(auth(REGISSEUR_PLATEAU_ROLE))
    .send({
      status: 'maintenance',
      location: 'Depot',
      maintenance: { nextServiceDate: '2025-01-01' },
    })
    .expect(200);
  assert.strictEqual(updated.body.status, 'maintenance');
  assert.strictEqual(updated.body.location, 'Depot');

  await request(app)
    .delete(withApiPrefix(`/vehicles/${id}`))
    .set(auth(REGISSEUR_PLATEAU_ROLE))
    .expect(200);
  const listAfterDelete = await request(app)
    .get(withApiPrefix('/vehicles'))
    .set(auth())
    .expect(200);
  assert.strictEqual(listAfterDelete.body.length, 0);

  await client.close();
  await mongod.stop();
});

test('filters by availability and location', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const availableId = new ObjectId();
  await db.collection('vehicles').insertMany([
    {
      _id: availableId,
      name: 'Truck',
      location: 'North',
      status: 'available',
    },
    {
      name: 'Van busy',
      location: 'North',
      status: 'available',
      reservations: [
        {
          start: new Date('2024-01-01'),
          end: new Date('2024-02-01'),
          status: 'unavailable',
        },
      ],
    },
    { name: 'Car maintenance', status: 'maintenance', location: 'South' },
  ]);

  const res = await request(app)
    .get(
      withApiPrefix(
        '/vehicles?availableStart=2024-01-10&availableEnd=2024-01-15&location=North',
      ),
    )
    .set(auth())
    .expect(200);
  assert.strictEqual(res.body.length, 1);
  assert.strictEqual(res.body[0]._id.toString(), availableId.toString());

  await client.close();
  await mongod.stop();
});

test('supports search filters', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  await db.collection('vehicles').insertMany([
    { name: 'Logistics Van', brand: 'Renault', location: 'Hub', status: 'available' },
    { name: 'City Car', brand: 'Toyota', location: 'Hub', status: 'unavailable' },
  ]);

  const res = await request(app)
    .get(withApiPrefix('/vehicles?search=van&status=available'))
    .set(auth())
    .expect(200);
  assert.strictEqual(res.body.length, 1);
  assert.strictEqual(res.body[0].name, 'Logistics Van');

  await client.close();
  await mongod.stop();
});

test('rejects creation without permissions', async () => {
  const { app, client, mongod } = await createApp();
  const newVehicle = { name: 'Unauthorized', location: 'Nowhere' };
  await request(app)
    .post(withApiPrefix('/vehicles'))
    .set(auth(AUTRE_ROLE))
    .send(newVehicle)
    .expect(403);

  await client.close();
  await mongod.stop();
});
