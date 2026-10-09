const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
process.env.JWT_SECRET = 'workflow-test';
process.env.LOAN_ARCHIVE_EMAIL = 'archive@example.test';
const roles = require('../src/config/roles');
const mailer = require('../src/utils/sendMail');
const messages = [];
mailer.sendMail = async (message) => messages.push(message);
const loans = require('../src/routes/loans').default;
const vehicles = require('../src/routes/vehicles').default;
const equipments = require('../src/routes/equipments').default;
const {
  checkEquipmentAvailability,
} = require('../src/utils/checkAvailability');
const { mergePreferences } = require('../src/models/User');
const { API_PREFIX } = require('../src/config');
let db, client, server, app;
const owner = new ObjectId(),
  borrower = new ObjectId(),
  elsewhere = new ObjectId();
const ids = Object.fromEntries(
  ['general', 'sound', 'light', 'stage', 'other', 'borrower', 'outsider'].map(
    (name) => [name, new ObjectId()],
  ),
);
const equipment = Object.fromEntries(
  ['MacAura', 'Parfect', 'Sound', 'Other'].map((name) => [
    name,
    new ObjectId(),
  ]),
);
const startDate = new Date(Date.now() + 5 * 86400000).toISOString();
const endDate = new Date(Date.now() + 7 * 86400000).toISOString();
function token(name, oldRole) {
  return {
    Authorization: `Bearer ${jwt.sign({ id: ids[name].toString(), role: oldRole || roles.REGISSEUR_GENERAL_ROLE }, process.env.JWT_SECRET)}`,
  };
}
function api(path) {
  return `${API_PREFIX}${path}`;
}
function payload(items) {
  return {
    owner: owner.toString(),
    borrower: borrower.toString(),
    startDate,
    endDate,
    items: items.map((name) => ({
      equipment: equipment[name].toString(),
      quantity: 4,
    })),
  };
}
async function create(items = ['MacAura', 'Parfect', 'Sound']) {
  const response = await request(app)
    .post(api('/loans'))
    .set(token('borrower'))
    .send(payload(items));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body;
}
before(async () => {
  server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  client = await MongoClient.connect(server.getUri());
  db = client.db('workflow');
  app = express();
  app.use(express.json());
  app.locals.db = db;
  app.use(api('/loans'), loans);
  app.use(api('/vehicles'), vehicles);
  app.use(api('/equipments'), equipments);
  app.use((err, req, res, next) =>
    res.status(err.status || 500).json({ message: err.message }),
  );
});
after(async () => {
  await client?.close();
  await server?.stop();
});
beforeEach(async () => {
  await db.dropDatabase();
  messages.length = 0;
  await db.collection('structures').insertMany([
    { _id: owner, name: 'Owner' },
    { _id: borrower, name: 'Borrower' },
    { _id: elsewhere, name: 'Elsewhere' },
  ]);
  const roleByName = {
    general: roles.REGISSEUR_GENERAL_ROLE,
    sound: roles.REGISSEUR_SON_ROLE,
    light: roles.REGISSEUR_LUMIERE_ROLE,
    stage: roles.REGISSEUR_PLATEAU_ROLE,
    other: roles.AUTRE_ROLE,
    borrower: roles.REGISSEUR_GENERAL_ROLE,
    outsider: roles.REGISSEUR_GENERAL_ROLE,
  };
  await db.collection('users').insertMany(
    Object.entries(ids).map(([name, _id]) => ({
      _id,
      username: name,
      firstName: name,
      lastName: 'Acteur',
      password: 'private-hash',
      preferences: mergePreferences(),
      email: `${name}@example.test`,
      role: roleByName[name],
      structure:
        name === 'borrower'
          ? borrower
          : name === 'outsider'
            ? elsewhere
            : owner,
    })),
  );
  await db.collection('equipments').insertMany(
    Object.entries(equipment).map(([name, _id]) => ({
      _id,
      name,
      type: name === 'Sound' ? 'Son' : name === 'Other' ? 'Autres' : 'Lumière',
      totalQty: 10,
      structure: owner,
    })),
  );
});

test('mixed request: per-domain visibility, names retained and no password/preferences leaked', async () => {
  const loan = await create();
  const light = await request(app)
    .get(api(`/loans/${loan._id}`))
    .set(token('light'))
    .expect(200);
  assert.equal(light.body.items.length, 2);
  assert.equal(light.body.requestedBy.firstName, 'borrower');
  assert.equal(light.body.requestedBy.password, undefined);
  assert.equal(light.body.requestedBy.preferences, undefined);
  assert.ok(
    light.body.history.every((event) =>
      light.body.items.some((item) => event.lineId === item.lineId),
    ),
  );
  await request(app)
    .get(api(`/loans/${loan._id}`))
    .set(token('stage'))
    .expect(404);
  await request(app)
    .get(api(`/loans/${loan._id}`))
    .set(token('outsider'))
    .expect(404);
  assert.equal(messages.filter((message) => message.bcc).length, 1);
  const soundMail = messages.find(
    (message) => message.to === 'sound@example.test',
  );
  assert.ok(soundMail.text.includes('Sound'));
  assert.ok(!soundMail.text.includes('MacAura'));
  assert.ok(!messages.some((message) => message.to === 'stage@example.test'));
});

test('accept MacAura and refuse Parfect as whole lines, retain actor and release only refused stock', async () => {
  const loan = await create();
  messages.length = 0;
  const [mac, parfect] = loan.items;
  await request(app)
    .put(api(`/loans/${loan._id}`))
    .set(token('sound'))
    .send({ decisions: [{ lineId: mac.lineId, status: 'accepted' }] })
    .expect(403);
  const result = await request(app)
    .put(api(`/loans/${loan._id}`))
    .set(token('light'))
    .send({
      decisions: [
        { lineId: mac.lineId, status: 'accepted', note: '4 disponibles' },
        { lineId: parfect.lineId, status: 'refused', note: 'Indisponibles' },
      ],
    })
    .expect(200);
  assert.equal(result.body.status, 'partial');
  assert.equal(result.body.items[0].quantity, 4);
  assert.equal(result.body.items[0].decision.actor.firstName, 'light');
  const availability = await checkEquipmentAvailability(
    db,
    equipment.Parfect.toString(),
    new Date(startDate),
    new Date(endDate),
    1,
  );
  assert.equal(availability.availableQty, 10);
  assert.equal(
    (
      await checkEquipmentAvailability(
        db,
        equipment.MacAura.toString(),
        new Date(startDate),
        new Date(endDate),
        1,
      )
    ).availableQty,
    6,
  );
  assert.ok(!messages.some((message) => message.to === 'sound@example.test'));
  assert.equal(messages.filter((message) => message.bcc).length, 1);
  assert.ok(
    messages
      .find((message) => message.to === 'borrower@example.test')
      .text.includes('light Acteur'),
  );
  const count = messages.length;
  await request(app)
    .put(api(`/loans/${loan._id}`))
    .set(token('light'))
    .send({ decisions: [{ lineId: mac.lineId, status: 'accepted' }] })
    .expect(200);
  assert.equal(messages.length, count);
});

test('concurrent specialists preserve independent line decisions', async () => {
  const loan = await create(['MacAura', 'Sound']);
  await Promise.all([
    request(app)
      .put(api(`/loans/${loan._id}`))
      .set(token('light'))
      .send({
        decisions: [{ lineId: loan.items[0].lineId, status: 'accepted' }],
      })
      .expect(200),
    request(app)
      .put(api(`/loans/${loan._id}`))
      .set(token('sound'))
      .send({
        decisions: [{ lineId: loan.items[1].lineId, status: 'refused' }],
      })
      .expect(200),
  ]);
  const raw = await db
    .collection('loanrequests')
    .findOne({ _id: new ObjectId(loan._id) });
  assert.deepEqual(
    raw.items.map((item) => item.decision.status),
    ['accepted', 'refused'],
  );
});

test('current role/structure replace JWT permissions and historical requester privilege', async () => {
  const loan = await create(['Sound']);
  await db
    .collection('users')
    .updateOne(
      { _id: ids.borrower },
      { $set: { role: roles.REGISSEUR_LUMIERE_ROLE, structure: elsewhere } },
    );
  await request(app)
    .get(api(`/loans/${loan._id}`))
    .set(token('borrower'))
    .expect(404);
  await request(app)
    .post(api('/loans'))
    .set(token('borrower'))
    .send(payload(['Sound']))
    .expect(403);
  await db
    .collection('users')
    .updateOne(
      { _id: ids.light },
      { $set: { role: roles.REGISSEUR_GENERAL_ROLE, structure: borrower } },
    );
  const response = await request(app)
    .get(api(`/loans/${loan._id}`))
    .set(token('light', roles.REGISSEUR_LUMIERE_ROLE))
    .expect(200);
  assert.equal(response.body.items.length, 1);
});

test('legacy opt-out is respected and global BCC survives all individual opt-outs', async () => {
  assert.equal(
    mergePreferences(undefined, {
      emailNotifications: { structureUpdates: false },
    }).emailNotifications.loanRequests,
    false,
  );
  assert.equal(
    mergePreferences(undefined, {
      emailNotifications: { structureUpdates: false, loanRequests: true },
    }).emailNotifications.loanRequests,
    true,
  );
  await db.collection('users').updateMany(
    {},
    {
      $set: {
        preferences: { emailNotifications: { structureUpdates: false } },
      },
    },
  );
  await create();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].bcc, 'archive@example.test');
  assert.equal(messages[0].to, undefined);
});

test('vehicle of own structure remains pending, manager from another structure decides and requester keeps follow-up', async () => {
  const vehicle = (
    await db.collection('vehicles').insertOne({
      name: 'Van',
      structure: borrower,
      managerIds: [ids.light],
      status: 'available',
      reservations: [],
    })
  ).insertedId;
  const result = await request(app)
    .post(api('/loans'))
    .set(token('borrower'))
    .send({
      owner: borrower.toString(),
      borrower: borrower.toString(),
      items: [{ kind: 'vehicle', vehicle: vehicle.toString() }],
      startDate,
      endDate,
    })
    .expect(200);
  assert.equal(result.body.status, 'pending');
  assert.deepEqual(
    messages
      .filter((message) => message.to)
      .map((message) => message.to)
      .sort(),
    ['borrower@example.test', 'light@example.test'],
  );
  await request(app)
    .put(api(`/loans/${result.body._id}`))
    .set(token('general'))
    .send({ status: 'accepted' })
    .expect(403);
  await db
    .collection('users')
    .updateOne(
      { _id: ids.borrower },
      { $set: { structure: elsewhere, role: roles.AUTRE_ROLE } },
    );
  messages.length = 0;
  await request(app)
    .put(api(`/loans/${result.body._id}`))
    .set(token('light'))
    .send({
      decisions: [{ lineId: result.body.items[0].lineId, status: 'accepted' }],
    })
    .expect(200);
  assert.ok(messages.some((message) => message.to === 'borrower@example.test'));
  await request(app)
    .get(api(`/loans/${result.body._id}`))
    .set(token('borrower'))
    .expect(200);
  assert.equal(
    (await db.collection('vehicles').findOne({ _id: vehicle })).reservations
      .length,
    1,
  );
});

test('two managers cannot accept overlapping vehicle bookings', async () => {
  const vehicle = (
    await db.collection('vehicles').insertOne({
      name: 'Van',
      structure: owner,
      managerIds: [ids.light, ids.sound],
      status: 'available',
      reservations: [],
    })
  ).insertedId;
  const body = {
    owner: owner.toString(),
    borrower: borrower.toString(),
    items: [{ kind: 'vehicle', vehicle: vehicle.toString() }],
    startDate,
    endDate,
  };
  const a = (
    await request(app)
      .post(api('/loans'))
      .set(token('borrower'))
      .send(body)
      .expect(200)
  ).body;
  const b = (
    await request(app)
      .post(api('/loans'))
      .set(token('borrower'))
      .send(body)
      .expect(200)
  ).body;
  const responses = await Promise.all([
    request(app)
      .put(api(`/loans/${a._id}`))
      .set(token('light'))
      .send({ status: 'accepted' }),
    request(app)
      .put(api(`/loans/${b._id}`))
      .set(token('sound'))
      .send({ status: 'accepted' }),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
  assert.equal(
    (await db.collection('vehicles').findOne({ _id: vehicle })).reservations
      .length,
    1,
  );
});

test('Autre manages only Autres inventory and cannot reclassify light equipment', async () => {
  await request(app)
    .put(api(`/equipments/${equipment.MacAura}`))
    .set(token('other'))
    .send({ type: 'Autre' })
    .expect(403);
  await request(app)
    .put(api(`/equipments/${equipment.Other}`))
    .set(token('other'))
    .send({ name: 'Updated other' })
    .expect(200);
  await request(app)
    .put(api(`/equipments/${equipment.Other}`))
    .set(token('other'))
    .send({ type: 'Son' })
    .expect(403);
});

test('protected fields and false owner/borrower are rejected', async () => {
  const loan = await create(['MacAura']);
  await request(app)
    .put(api(`/loans/${loan._id}`))
    .set(token('borrower'))
    .send({ owner: elsewhere.toString() })
    .expect(400);
  await request(app)
    .post(api('/loans'))
    .set(token('light'))
    .send(payload(['MacAura']))
    .expect(403);
  await request(app)
    .post(api('/loans'))
    .set(token('borrower'))
    .send({ ...payload(['MacAura']), owner: elsewhere.toString() })
    .expect(403);
});

test('legacy global decisions remain readable without fabricated actor dates', async () => {
  const legacy = (
    await db.collection('loanrequests').insertOne({
      owner,
      borrower,
      requestedBy: ids.borrower,
      processedBy: ids.general,
      status: 'accepted',
      items: [{ equipment: equipment.MacAura, quantity: 4 }],
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    })
  ).insertedId;
  const response = await request(app)
    .get(api(`/loans/${legacy}`))
    .set(token('light'))
    .expect(200);
  assert.equal(response.body.items[0].decision.status, 'accepted');
  assert.equal(response.body.items[0].decision.actor.firstName, 'general');
  assert.equal(response.body.items[0].decision.at, undefined);
});

test('editing dates or removing a pending line preserves identity, frees removed stock, notifies affected domains', async () => {
  const loan = await create(['MacAura', 'Sound']);
  messages.length = 0;
  const result = (
    await request(app)
      .put(api(`/loans/${loan._id}`))
      .set(token('borrower'))
      .send({
        items: [{ equipment: equipment.MacAura.toString(), quantity: 3 }],
      })
      .expect(200)
  ).body;
  const mac = result.items.find(
    (item) => item.equipment._id === equipment.MacAura.toString(),
  );
  const sound = result.items.find(
    (item) => item.equipment._id === equipment.Sound.toString(),
  );
  assert.equal(mac.lineId, loan.items[0].lineId);
  assert.equal(mac.quantity, 3);
  assert.equal(sound.decision.status, 'cancelled');
  assert.equal(
    (
      await checkEquipmentAvailability(
        db,
        equipment.Sound.toString(),
        new Date(startDate),
        new Date(endDate),
        1,
      )
    ).availableQty,
    10,
  );
  assert.ok(
    messages
      .find((message) => message.to === 'sound@example.test')
      .text.includes('Sound'),
  );
  assert.ok(
    !messages
      .find((message) => message.to === 'sound@example.test')
      .text.includes('MacAura'),
  );
  const shortened = (
    await request(app)
      .put(api(`/loans/${loan._id}`))
      .set(token('borrower'))
      .send({ endDate: new Date(Date.now() + 6 * 86400000).toISOString() })
      .expect(200)
  ).body;
  assert.equal(
    shortened.items.find((item) => item.lineId === sound.lineId).decision
      .status,
    'cancelled',
  );
});

test('a quantity conflict or another-domain edit rolls back all changes and sends no mail', async () => {
  const loan = await create(['MacAura', 'Sound']);
  messages.length = 0;
  await request(app)
    .put(api(`/loans/${loan._id}`))
    .set(token('sound'))
    .send({ note: 'Attempt to alter mixed request' })
    .expect(403);
  await request(app)
    .put(api(`/loans/${loan._id}`))
    .set(token('borrower'))
    .send({
      items: [{ equipment: equipment.MacAura.toString(), quantity: 20 }],
    })
    .expect(400);
  const persisted = await db
    .collection('loanrequests')
    .findOne({ _id: new ObjectId(loan._id) });
  assert.equal(persisted.items.length, 2);
  assert.equal(persisted.items[0].quantity, 4);
  assert.equal(messages.length, 0);
  await request(app)
    .put(api(`/loans/${loan._id}`))
    .set(token('general'))
    .send({
      decisions: [
        { lineId: loan.items[0].lineId, status: 'accepted', quantity: 2 },
      ],
    })
    .expect(400);
});

test('all roles can save their own notification preferences without gaining account privileges', async () => {
  const users = require('../src/routes/users').default;
  app.use(api('/preferences-test'), users);
  for (const name of [
    'general',
    'sound',
    'light',
    'stage',
    'other',
    'borrower',
  ]) {
    const result = await request(app)
      .put(api('/preferences-test/me'))
      .set(token(name))
      .send({
        preferences: {
          emailNotifications: { loanRequests: false, loanStatusChanges: false },
        },
        role: roles.ADMIN_ROLE,
      })
      .expect(200);
    assert.equal(
      result.body.preferences.emailNotifications.loanRequests,
      false,
    );
    assert.notEqual(result.body.role, roles.ADMIN_ROLE);
  }
});

test('unchanged edits send no mail; a quantity-only change does not notify another unchanged domain', async () => {
  const loan = await create(['MacAura', 'Sound']);
  messages.length = 0;
  const body = {
    items: [
      { equipment: equipment.MacAura.toString(), quantity: 4 },
      { equipment: equipment.Sound.toString(), quantity: 4 },
    ],
    startDate,
    endDate,
  };
  await request(app)
    .put(api(`/loans/${loan._id}`))
    .set(token('borrower'))
    .send(body)
    .expect(200);
  assert.equal(messages.length, 0);
  body.items[0].quantity = 3;
  await request(app)
    .put(api(`/loans/${loan._id}`))
    .set(token('borrower'))
    .send(body)
    .expect(200);
  assert.ok(messages.some((mail) => mail.to === 'light@example.test'));
  assert.ok(!messages.some((mail) => mail.to === 'sound@example.test'));
});

test('stale pending edit is rejected without overwriting a more recent quantity', async () => {
  const loan = await create(['MacAura']);
  await request(app)
    .put(api(`/loans/${loan._id}`))
    .set(token('borrower'))
    .send({
      expectedRevision: 0,
      items: [{ equipment: equipment.MacAura.toString(), quantity: 3 }],
    })
    .expect(200);
  messages.length = 0;
  await request(app)
    .put(api(`/loans/${loan._id}`))
    .set(token('borrower'))
    .send({
      expectedRevision: 0,
      items: [{ equipment: equipment.MacAura.toString(), quantity: 4 }],
    })
    .expect(400);
  assert.equal(
    (
      await db
        .collection('loanrequests')
        .findOne({ _id: new ObjectId(loan._id) })
    ).items[0].quantity,
    3,
  );
  assert.equal(messages.length, 0);
});

test('a stale whole-line decision cannot accept a changed quantity or dates', async () => {
  const original = await create(['MacAura']);
  const lineId = original.items[0].lineId;
  const staleVersion = original.items[0].decisionVersion;
  const updated = (
    await request(app)
      .put(api(`/loans/${original._id}`))
      .set(token('borrower'))
      .send({
        expectedRevision: 0,
        items: [{ equipment: equipment.MacAura.toString(), quantity: 3 }],
      })
      .expect(200)
  ).body;
  messages.length = 0;
  await request(app)
    .put(api(`/loans/${original._id}`))
    .set(token('light'))
    .send({
      decisions: [
        {
          lineId,
          status: 'accepted',
          expectedStatus: 'pending',
          expectedVersion: staleVersion,
        },
      ],
    })
    .expect(400);
  assert.equal(messages.length, 0);
  const decided = (
    await request(app)
      .put(api(`/loans/${original._id}`))
      .set(token('light'))
      .send({
        decisions: [
          {
            lineId,
            status: 'accepted',
            expectedStatus: 'pending',
            expectedVersion: updated.items[0].decisionVersion,
          },
        ],
      })
      .expect(200)
  ).body;
  assert.equal(decided.items[0].decision.status, 'accepted');
  assert.equal(decided.items[0].quantity, 3);
  assert.equal(decided.items[0].decision.actor.firstName, 'light');
});

test('editing a pending request preserves its original domain after inventory reclassification', async () => {
  const created = await create(['MacAura']);
  await db
    .collection('equipments')
    .updateOne({ _id: equipment.MacAura }, { $set: { type: 'Son' } });
  await db
    .collection('users')
    .updateOne(
      { _id: ids.borrower },
      { $set: { role: roles.REGISSEUR_LUMIERE_ROLE } },
    );
  const changed = (
    await request(app)
      .put(api(`/loans/${created._id}`))
      .set(token('borrower'))
      .send({
        expectedRevision: 0,
        items: [{ equipment: equipment.MacAura.toString(), quantity: 3 }],
      })
      .expect(200)
  ).body;
  assert.equal(changed.items[0].equipmentType, 'Lumière');
  assert.equal(changed.items[0].resourceIdentity.type, 'Lumière');
  await request(app)
    .get(api(`/loans/${created._id}`))
    .set(token('light'))
    .expect(200);
  await request(app)
    .get(api(`/loans/${created._id}`))
    .set(token('sound'))
    .expect(404);
});
