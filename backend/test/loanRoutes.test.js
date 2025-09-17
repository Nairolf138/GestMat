const test = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test';

const loanRoutes = require('../src/routes/loans').default;
const {
  ADMIN_ROLE,
  AUTRE_ROLE,
  REGISSEUR_SON_ROLE,
  REGISSEUR_GENERAL_ROLE,
} = require('../src/config/roles');
const mailer = require('../src/utils/sendMail');
mailer.sendMail = async () => {};
const {
  checkEquipmentAvailability,
} = require('../src/utils/checkAvailability');

async function createApp() {
  const mongod = await MongoMemoryReplSet.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  app.use('/api/loans', loanRoutes);
  return { app, client, mongod };
}

const userId = new ObjectId().toString();
function auth(role = ADMIN_ROLE) {
  const token = jwt.sign({ id: userId, role }, 'test', { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

test('create, update and delete loan request', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const owner = (await db.collection('structures').insertOne({ name: 'S1' }))
    .insertedId;
  const borrower = (await db.collection('structures').insertOne({ name: 'S2' }))
    .insertedId;
  const eqId = (
    await db
      .collection('equipments')
      .insertOne({ name: 'E1', totalQty: 1, structure: owner })
  ).insertedId;
  const ownerUser = new ObjectId();
  await db.collection('users').insertMany([
    { _id: ownerUser, structure: owner },
    { _id: new ObjectId(userId), structure: borrower },
  ]);
  const ownerToken = jwt.sign(
    { id: ownerUser.toString(), role: ADMIN_ROLE },
    'test',
    { expiresIn: '1h' },
  );

  const payload = {
    owner: owner.toString(),
    borrower: borrower.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2024-01-01',
    endDate: '2024-01-02',
  };

  const res = await request(app)
    .post('/api/loans')
    .set(auth())
    .send(payload)
    .expect(200);
  assert.ok(res.body._id);
  assert.strictEqual(res.body.requestedBy._id.toString(), userId);
  const start = new Date('2024-01-01');
  const end = new Date('2024-01-02');
  const availAfterCreate = await checkEquipmentAvailability(
    db,
    eqId.toString(),
    start,
    end,
    1,
  );
  assert.strictEqual(availAfterCreate.availableQty, 0);

  const list1 = await request(app).get('/api/loans').set(auth()).expect(200);
  assert.strictEqual(list1.body.length, 1);

  const id = res.body._id;
  const single = await request(app)
    .get(`/api/loans/${id}`)
    .set(auth())
    .expect(200);
  assert.strictEqual(single.body._id.toString(), id.toString());
  assert.strictEqual(single.body.owner._id.toString(), owner.toString());
  assert.strictEqual(
    single.body.borrower._id.toString(),
    borrower.toString(),
  );
  assert.strictEqual(
    single.body.requestedBy._id.toString(),
    userId.toString(),
  );
  assert.strictEqual(
    single.body.items[0].equipment._id.toString(),
    eqId.toString(),
  );

  const upd = await request(app)
    .put(`/api/loans/${id}`)
    .set({ Authorization: `Bearer ${ownerToken}` })
    .send({ status: 'accepted' })
    .expect(200);
  assert.strictEqual(upd.body.status, 'accepted');
  assert.strictEqual(upd.body.processedBy._id.toString(), ownerUser.toString());

  await request(app).delete(`/api/loans/${id}`).set(auth()).expect(200);
  const availAfterDelete = await checkEquipmentAvailability(
    db,
    eqId.toString(),
    start,
    end,
    1,
  );
  assert.strictEqual(availAfterDelete.availableQty, 1);
  const list2 = await request(app).get('/api/loans').set(auth()).expect(200);
  assert.strictEqual(list2.body.length, 0);

  // loan can be created again after deletion (return scenario)
  const res2 = await request(app)
    .post('/api/loans')
    .set(auth())
    .send(payload)
    .expect(200);
  assert.ok(res2.body._id);

  await client.close();
  await mongod.stop();
});

test('get loan request returns 404 when not found', async () => {
  const { app, client, mongod } = await createApp();

  await request(app)
    .get(`/api/loans/${new ObjectId().toString()}`)
    .set(auth())
    .expect(404);

  await client.close();
  await mongod.stop();
});

test('loan creation fails on quantity conflict', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const owner = (await db.collection('structures').insertOne({ name: 'S1' }))
    .insertedId;
  const borrower = (await db.collection('structures').insertOne({ name: 'S2' }))
    .insertedId;
  const eqId = (
    await db
      .collection('equipments')
      .insertOne({ name: 'E1', totalQty: 1, structure: owner })
  ).insertedId;
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: borrower });

  const payload = {
    owner: owner.toString(),
    borrower: borrower.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2024-01-01',
    endDate: '2024-01-02',
  };

  await request(app).post('/api/loans').set(auth()).send(payload).expect(200);

  await request(app).post('/api/loans').set(auth()).send(payload).expect(400);

  await client.close();
  await mongod.stop();
});

test('reject loan request to own structure', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const struct = (await db.collection('structures').insertOne({ name: 'S' }))
    .insertedId;
  const eqId = (
    await db
      .collection('equipments')
      .insertOne({ name: 'E', totalQty: 1, structure: struct })
  ).insertedId;
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: struct });

  const payload = {
    owner: struct.toString(),
    borrower: struct.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2024-01-01',
    endDate: '2024-01-02',
  };

  await request(app).post('/api/loans').set(auth()).send(payload).expect(403);

  await client.close();
  await mongod.stop();
});

test('delete loan request unauthorized returns 403', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const struct1 = (await db.collection('structures').insertOne({ name: 'S1' }))
    .insertedId;
  const struct2 = (await db.collection('structures').insertOne({ name: 'S2' }))
    .insertedId;
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: struct1 });
  const loanId = (
    await db
      .collection('loanrequests')
      .insertOne({ owner: struct2, borrower: struct2 })
  ).insertedId;
  await request(app)
    .delete(`/api/loans/${loanId}`)
    .set(auth(AUTRE_ROLE))
    .expect(403);
  await client.close();
  await mongod.stop();
});

test('unauthorized delete does not remove loan', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const struct1 = (await db.collection('structures').insertOne({ name: 'S1' }))
    .insertedId;
  const struct2 = (await db.collection('structures').insertOne({ name: 'S2' }))
    .insertedId;
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: struct1 });
  const loanId = (
    await db
      .collection('loanrequests')
      .insertOne({ owner: struct2, borrower: struct2 })
  ).insertedId;

  await request(app)
    .delete(`/api/loans/${loanId}`)
    .set(auth(AUTRE_ROLE))
    .expect(403);

  const loan = await db.collection('loanrequests').findOne({ _id: loanId });
  assert.ok(loan);

  await client.close();
  await mongod.stop();
});

test('non-admin can create but cannot update or delete loan', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const struct = (await db.collection('structures').insertOne({ name: 'S1' }))
    .insertedId;
  const eqId = (
    await db.collection('equipments').insertOne({ name: 'E1', totalQty: 1 })
  ).insertedId;
  const payload = {
    owner: struct.toString(),
    borrower: struct.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2024-01-01',
    endDate: '2024-01-02',
  };
  const created = await request(app)
    .post('/api/loans')
    .set(auth(AUTRE_ROLE))
    .send(payload)
    .expect(200);
  await request(app)
    .put(`/api/loans/${created.body._id}`)
    .set(auth(AUTRE_ROLE))
    .send({ status: 'accepted' })
    .expect(403);
  await request(app)
    .delete(`/api/loans/${created.body._id}`)
    .set(auth(AUTRE_ROLE))
    .expect(403);
  await client.close();
  await mongod.stop();
});

test('Autre role can cancel and delete its own loan', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const owner = (await db.collection('structures').insertOne({ name: 'S1' }))
    .insertedId;
  const borrower = (await db.collection('structures').insertOne({ name: 'S2' }))
    .insertedId;
  const eqId = (
    await db
      .collection('equipments')
      .insertOne({ name: 'E1', totalQty: 1, structure: owner })
  ).insertedId;
  await db
    .collection('users')
    .insertOne({ _id: new ObjectId(userId), structure: borrower });
  const payload = {
    owner: owner.toString(),
    borrower: borrower.toString(),
    items: [{ equipment: eqId.toString(), quantity: 1 }],
    startDate: '2099-01-01',
    endDate: '2099-01-02',
  };
  const created = await request(app)
    .post('/api/loans')
    .set(auth(AUTRE_ROLE))
    .send(payload)
    .expect(200);
  await request(app)
    .put(`/api/loans/${created.body._id}`)
    .set(auth(AUTRE_ROLE))
    .send({ status: 'cancelled' })
    .expect(200);
  await request(app)
    .delete(`/api/loans/${created.body._id}`)
    .set(auth(AUTRE_ROLE))
    .expect(200);
  await client.close();
  await mongod.stop();
});

test('Autre role can accept and refuse loan for own structure', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const owner = (await db.collection('structures').insertOne({ name: 'S1' }))
    .insertedId;
  const borrower = (await db.collection('structures').insertOne({ name: 'S2' }))
    .insertedId;
  const eqId = (
    await db
      .collection('equipments')
      .insertOne({ name: 'E1', totalQty: 1, structure: owner })
  ).insertedId;
  const ownerUser = new ObjectId();
  const borrowerUser = new ObjectId();
  await db.collection('users').insertMany([
    { _id: ownerUser, structure: owner },
    { _id: borrowerUser, structure: borrower },
  ]);
  const ownerToken = jwt.sign(
    { id: ownerUser.toString(), role: AUTRE_ROLE },
    'test',
    { expiresIn: '1h' },
  );

  const loan1 = (
    await db.collection('loanrequests').insertOne({
      owner,
      borrower,
      items: [{ equipment: eqId }],
      requestedBy: borrowerUser,
      startDate: new Date('2099-01-01'),
      endDate: new Date('2099-01-02'),
    })
  ).insertedId.toString();
  const accepted = await request(app)
    .put(`/api/loans/${loan1}`)
    .set({ Authorization: `Bearer ${ownerToken}` })
    .send({ status: 'accepted' })
    .expect(200);
  assert.strictEqual(accepted.body.status, 'accepted');

  const loan2 = (
    await db.collection('loanrequests').insertOne({
      owner,
      borrower,
      items: [{ equipment: eqId }],
      requestedBy: borrowerUser,
      startDate: new Date('2099-01-01'),
      endDate: new Date('2099-01-02'),
    })
  ).insertedId.toString();
  const refused = await request(app)
    .put(`/api/loans/${loan2}`)
    .set({ Authorization: `Bearer ${ownerToken}` })
    .send({ status: 'refused' })
    .expect(200);
  assert.strictEqual(refused.body.status, 'refused');

  await client.close();
  await mongod.stop();
});

test('loan listing enforces requester visibility', async () => {
  const { app, client, mongod } = await createApp();
  const db = client.db();
  const [s1, s2] = await Promise.all([
    db.collection('structures').insertOne({ name: 'S1' }),
    db.collection('structures').insertOne({ name: 'S2' }),
  ]);
  const s1Id = s1.insertedId;
  const s2Id = s2.insertedId;
  const [eqS1, eqS2] = await Promise.all([
    db
      .collection('equipments')
      .insertOne({ name: 'E1', type: 'Son', structure: s1Id }),
    db
      .collection('equipments')
      .insertOne({ name: 'E2', type: 'Son', structure: s2Id }),
  ]);

  const userAutre = new ObjectId();
  const userRegSon = new ObjectId();
  const userRegGen = new ObjectId();
  const userRegGenS2 = new ObjectId();
  const userRegSonS2 = new ObjectId();
  await db.collection('users').insertMany([
    { _id: userAutre, structure: s1Id, role: AUTRE_ROLE },
    { _id: userRegSon, structure: s1Id, role: REGISSEUR_SON_ROLE },
    { _id: userRegGen, structure: s1Id, role: REGISSEUR_GENERAL_ROLE },
    { _id: userRegGenS2, structure: s2Id, role: REGISSEUR_GENERAL_ROLE },
    { _id: userRegSonS2, structure: s2Id, role: REGISSEUR_SON_ROLE },
  ]);

  await db.collection('loanrequests').insertMany([
    {
      owner: s1Id,
      borrower: s2Id,
      items: [{ equipment: eqS1.insertedId }],
      requestedBy: userRegGenS2,
    },
    {
      owner: s1Id,
      borrower: s2Id,
      items: [{ equipment: eqS1.insertedId }],
      requestedBy: userRegSonS2,
    },
    {
      owner: s2Id,
      borrower: s1Id,
      items: [{ equipment: eqS2.insertedId }],
      requestedBy: userAutre,
    },
    {
      owner: s2Id,
      borrower: s1Id,
      items: [{ equipment: eqS2.insertedId }],
      requestedBy: userRegSon,
    },
    {
      owner: s2Id,
      borrower: s1Id,
      items: [{ equipment: eqS2.insertedId }],
      requestedBy: userRegGen,
    },
  ]);

  const regSonToken = jwt.sign(
    { id: userRegSon.toString(), role: REGISSEUR_SON_ROLE },
    'test',
    { expiresIn: '1h' },
  );
  const autreToken = jwt.sign(
    { id: userAutre.toString(), role: AUTRE_ROLE },
    'test',
    { expiresIn: '1h' },
  );

  const resRegSon = await request(app)
    .get('/api/loans')
    .set({ Authorization: `Bearer ${regSonToken}` })
    .expect(200);
  assert.strictEqual(resRegSon.body.length, 4);
  assert.ok(
    resRegSon.body.every((l) => {
      const req = l.requestedBy;
      const reqId = req._id.toString();
      const reqRole = req.role;
      return (
        reqId === userRegSon.toString() ||
        reqRole === AUTRE_ROLE ||
        reqRole === REGISSEUR_GENERAL_ROLE
      );
    }),
  );

  const resAutre = await request(app)
    .get('/api/loans')
    .set({ Authorization: `Bearer ${autreToken}` })
    .expect(200);
  assert.strictEqual(resAutre.body.length, 3);
  assert.ok(
    resAutre.body.every((l) => {
      const borrowerId = (l.borrower._id || l.borrower).toString();
      const reqId = l.requestedBy._id.toString();
      if (borrowerId === s1Id.toString()) {
        return reqId === userAutre.toString();
      }
      return true;
    }),
  );

  await client.close();
  await mongod.stop();
});
